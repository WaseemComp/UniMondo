/** Human labels and parent routes for admin breadcrumbs (contextual hierarchy, not forced dashboard). */

export type AdminCrumb = { label: string; href: string; current?: boolean };

function titleCaseSegment(segment: string): string {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Longest-prefix parent for `/admin/content/*` editor routes → section hub in sidebar. */
const CONTENT_EDITOR_PARENT: Record<string, { label: string; href: string }> = {
  about: { label: "About", href: "/admin/about" },
  team: { label: "About", href: "/admin/about" },
  contact: { label: "Contact", href: "/admin/contact" },
  home: { label: "Home", href: "/admin/home" },
  ticker: { label: "Home", href: "/admin/home" },
  "success-stories": { label: "Blog", href: "/admin/blog" },
};

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  applications: "Applications",
  universities: "Universities",
  destinations: "Destinations",
  countries: "Countries",
  packages: "Packages",
  courses: "Language courses",
  about: "About",
  contact: "Contact",
  blog: "Blog",
  blogs: "Blog posts",
  submissions: "Submissions",
  settings: "Team & account",
  programs: "Programs",
  home: "Home",
  content: "Page content",
  featured: "Featured",
  "featured-universities": "Featured universities",
  data: "Data",
  regions: "Regions",
  users: "Users & permissions",
  "work-with-us": "Work with us",
  "join-us": "Join us",
};

const CONTENT_PAGE_LABELS: Record<string, string> = {
  about: "About sections",
  team: "Team members",
  contact: "Contact page",
  home: "Homepage content",
  ticker: "News ticker",
  "success-stories": "Success stories",
};

function normalizePath(pathname: string): string {
  const p = pathname.replace(/\/+$/, "") || "/admin/dashboard";
  return p;
}

function querySuffix(listQuery: string | undefined): string {
  if (!listQuery?.trim()) return "";
  const q = listQuery.replace(/^\?/, "");
  return q ? `?${q}` : "";
}

/**
 * Trail always starts at Dashboard for deep links; current page is last (current: true, still has href for “open in new tab” if needed).
 * @param listQuery Optional search string (no leading `?`) to preserve filters on list parent links (e.g. from applicant detail).
 */
export function buildAdminBreadcrumbs(pathname: string, listQuery?: string): AdminCrumb[] {
  const path = normalizePath(pathname);
  const q = querySuffix(listQuery);

  if (path === "/admin/dashboard") {
    return [{ label: "Dashboard", href: "/admin/dashboard", current: true }];
  }

  const crumbs: AdminCrumb[] = [{ label: "Dashboard", href: "/admin/dashboard" }];

  // /admin/applications/:trackingId — list is parent; avoid treating id as a slug label
  const appDetail = /^\/admin\/applications\/([^/]+)$/.exec(path);
  if (appDetail) {
    crumbs.push({ label: "Applications", href: `/admin/applications${q}` });
    crumbs.push({ label: "Applicant detail", href: `${path}${q}`, current: true });
    return crumbs;
  }

  const subDetail = /^\/admin\/submissions\/detail\/([^/]+)$/.exec(path);
  if (subDetail) {
    crumbs.push({ label: "Submissions", href: `/admin/submissions${q}` });
    crumbs.push({ label: "Applicant detail", href: `${path}${q}`, current: true });
    return crumbs;
  }

  // /admin/content/:editorKey/... 
  const contentMatch = /^\/admin\/content\/([^/]+)/.exec(path);
  if (contentMatch) {
    const key = contentMatch[1];
    const hub = CONTENT_EDITOR_PARENT[key];
    if (hub) {
      crumbs.push({ label: hub.label, href: hub.href });
      const pageLabel = CONTENT_PAGE_LABELS[key] ?? SEGMENT_LABELS[key] ?? titleCaseSegment(key);
      crumbs.push({ label: pageLabel, href: path, current: true });
      return crumbs;
    }
  }

  // /admin/data/regions — Data is intermediate
  if (path.startsWith("/admin/data/")) {
    crumbs.push({ label: "Data", href: "/admin/data/regions" });
    const segments = path.split("/").filter(Boolean);
    const rest = segments.slice(2); // after admin, data
    if (rest.length === 1) {
      const seg = rest[0];
      const lab = SEGMENT_LABELS[seg] ?? titleCaseSegment(seg);
      crumbs.push({ label: lab, href: path, current: true });
      return crumbs;
    }
    return crumbs;
  }

  const segments = path.split("/").filter(Boolean); // admin, ...

  if (segments[0] !== "admin") {
    return crumbs;
  }

  // Walk /admin/a/b/c building cumulative hrefs; skip re-adding dashboard
  let cumulative = "/admin";
  for (let i = 1; i < segments.length; i++) {
    cumulative += `/${segments[i]}`;
    const isLast = i === segments.length - 1;
    const seg = segments[i];
    const label = SEGMENT_LABELS[seg] ?? titleCaseSegment(seg);
    crumbs.push({
      label,
      href: cumulative,
      current: isLast,
    });
  }

  return crumbs;
}

/** Use when history back is unavailable — second-to-last crumb, else dashboard. */
export function getAdminBackFallbackHref(pathname: string): string {
  const crumbs = buildAdminBreadcrumbs(pathname);
  if (crumbs.length < 2) {
    return "/admin/dashboard";
  }
  return crumbs[crumbs.length - 2]!.href;
}
