import type { AdminAreaPermission } from "@/lib/auth/admin";

export type CmsNavItem = {
  id: string; label: string; href: string; group: string; icon: string;
  scope?: AdminAreaPermission; permission?: string; superOnly?: boolean; aliases?: string[];
};

/** Presentation destinations only. Existing server guards remain the authority. */
export const CMS_NAVIGATION: CmsNavItem[] = [
  { id: "overview", label: "Overview", href: "/admin/dashboard", group: "Workspace", icon: "overview" },
  { id: "publishing", label: "Drafts & Reviews", href: "/admin/publishing", group: "Workspace", icon: "stories" },
  { id: "home", label: "Home / Website Pages", href: "/admin/home", group: "Website", icon: "home", scope: "content", permission: "home.view", aliases: ["/admin/content/home", "/admin/content/ticker"] },
  { id: "destinations", label: "Destinations", href: "/admin/destinations", group: "Website", icon: "destinations", scope: "academic", permission: "countries.view", aliases: ["/admin/countries", "/admin/data/countries", "/admin/data/regions"] },
  { id: "universities", label: "Universities & Programmes", href: "/admin/universities", group: "Website", icon: "universities", scope: "academic", permission: "universities.view", aliases: ["/admin/programs", "/admin/data/programs", "/admin/featured-universities"] },
  { id: "courses", label: "Language Courses", href: "/admin/courses", group: "Website", icon: "courses", scope: "academic", permission: "courses.view" },
  { id: "stories", label: "Success Stories", href: "/admin/content/success-stories", group: "Website", icon: "stories", scope: "content", permission: "blog.view" },
  { id: "media", label: "Media Library", href: "/admin/media", group: "Website", icon: "media" },
  { id: "blog", label: "Blog", href: "/admin/blog", group: "Website", icon: "blog", scope: "academic", permission: "blog.view", aliases: ["/admin/blogs"] },
  { id: "packages", label: "Packages", href: "/admin/packages", group: "Website", icon: "packages", scope: "academic", permission: "packages.view" },
  { id: "about", label: "About", href: "/admin/about", group: "Website", icon: "about", scope: "content", permission: "about.view", aliases: ["/admin/content/about", "/admin/content/team"] },
  { id: "contact", label: "Contact", href: "/admin/contact", group: "Website", icon: "contact", scope: "content", permission: "contact.view", aliases: ["/admin/content/contact"] },
  { id: "applications", label: "Applications", href: "/admin/applications", group: "Operations", icon: "applications", scope: "applications", permission: "applications.view" },
  // Keep the Agreement module's existing area visibility; do not add a new agreement permission.
  { id: "agreements", label: "Agreements", href: "/admin/agreements", group: "Operations", icon: "agreements", scope: "applications" },
  { id: "submissions", label: "Submissions", href: "/admin/submissions", group: "Operations", icon: "submissions", scope: "submissions", permission: "submissions.view" },
  { id: "team", label: "Team & Permissions", href: "/admin/settings#team", group: "Administration", icon: "team", superOnly: true },
  { id: "settings", label: "Settings", href: "/admin/settings#account", group: "Administration", icon: "settings" },
];

export function activeCmsItem(items: CmsNavItem[], pathname: string, hash = ""): string | undefined {
  if (pathname === "/admin/settings") return hash === "#account" || !items.some(item => item.id === "team") ? "settings" : "team";
  return [...items].sort((a, b) => b.href.length - a.href.length).find(item => {
    const paths = [item.href.split("#")[0], ...(item.aliases ?? [])];
    return paths.some(path => pathname === path || (path !== "/admin/dashboard" && pathname.startsWith(`${path}/`)));
  })?.id;
}
