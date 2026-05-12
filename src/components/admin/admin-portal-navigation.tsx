"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { buildAdminBreadcrumbs, getAdminBackFallbackHref } from "@/lib/admin/breadcrumbs";

type Props = {
  showApplicationsShortcut?: boolean;
  showCountriesShortcut?: boolean;
};

export function AdminPortalNavigation({
  showApplicationsShortcut = false,
  showCountriesShortcut = false,
}: Props) {
  const pathname = usePathname() || "/admin/dashboard";
  const router = useRouter();
  const searchParams = useSearchParams();
  const crumbs = useMemo(() => {
    const onAppDetail = /^\/admin\/applications\/[^/]+$/.test(pathname.replace(/\/$/, ""));
    const onSubDetail = /^\/admin\/submissions\/detail\/[^/]+$/.test(pathname.replace(/\/$/, ""));
    const listQuery =
      onAppDetail || onSubDetail ? searchParams.toString() : undefined;
    return buildAdminBreadcrumbs(pathname, listQuery);
  }, [pathname, searchParams]);
  const fallbackHref = getAdminBackFallbackHref(pathname);
  const onDashboardOnly = crumbs.length <= 1;

  const handleBack = () => {
    if (onDashboardOnly) return;
    try {
      if (typeof window !== "undefined" && window.history.length <= 1) {
        router.push(fallbackHref);
        return;
      }
    } catch {
      router.push(fallbackHref);
      return;
    }
    router.back();
  };

  return (
    <div className="mb-6 space-y-3 border-b border-zinc-200 pb-4">
      <div className="flex flex-wrap items-center gap-2 gap-y-3">
        {!onDashboardOnly ? (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-sm hover:border-zinc-400 hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </button>
        ) : null}
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-1 text-sm">
          <ol className="flex min-w-0 flex-wrap items-center gap-x-1">
            {crumbs.map((c, idx) => {
              const last = idx === crumbs.length - 1;
              return (
                <li key={`${c.href}-${idx}`} className="flex items-center gap-x-1 text-zinc-600">
                  {idx > 0 ? (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-300" aria-hidden />
                  ) : null}
                  {last ? (
                    <span className="font-medium text-zinc-900" aria-current="page">
                      {c.label}
                    </span>
                  ) : (
                    <Link href={c.href} className="text-amber-800 hover:text-amber-950 hover:underline">
                      {c.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
        {showApplicationsShortcut || showCountriesShortcut ? (
          <span className="font-medium uppercase tracking-wide text-zinc-400">Shortcuts</span>
        ) : null}
        {showApplicationsShortcut ? (
          <Link href="/admin/applications" className="text-zinc-600 hover:text-zinc-900 hover:underline">
            Applications
          </Link>
        ) : null}
        {showCountriesShortcut ? (
          <Link href="/admin/destinations" className="text-zinc-600 hover:text-zinc-900 hover:underline">
            Destinations
          </Link>
        ) : null}
        <Link href="/" className="text-zinc-600 hover:text-zinc-900 hover:underline">
          Public site
        </Link>
      </div>
    </div>
  );
}
