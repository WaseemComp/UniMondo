import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { FileText, Globe, LayoutDashboard, Newspaper, Settings } from "lucide-react";

export default async function AdminDashboardPage() {
  const svc = createSupabaseServiceClient();

  let programCount = 0;
  let countryCount = 0;
  let blogCount = 0;
  let tickerActive = false;
  let loadError: string | null = null;

  if (svc) {
    const [pRes, cRes, bRes, tRes] = await Promise.all([
      svc.from("programs").select("id", { count: "exact", head: true }),
      svc.from("countries").select("id", { count: "exact", head: true }),
      svc.from("blogs").select("id", { count: "exact", head: true }),
      svc.from("site_settings").select("ticker_active").eq("id", 1).maybeSingle(),
    ]);

    if (pRes.error && !pRes.error.message.includes("does not exist")) loadError = pRes.error.message;
    if (cRes.error && !cRes.error.message.includes("does not exist") && !loadError) loadError = cRes.error.message;
    if (bRes.error && !bRes.error.message.includes("does not exist") && !loadError) loadError = bRes.error.message;

    programCount = pRes.count ?? 0;
    countryCount = cRes.count ?? 0;
    blogCount = bRes.count ?? 0;
    tickerActive = Boolean(tRes.data?.ticker_active);
  }

  const cards = [
    { label: "Programs", value: programCount, href: "/admin/programs", icon: FileText },
    { label: "Countries", value: countryCount, href: "/admin/countries", icon: Globe },
    { label: "Blog posts", value: blogCount, href: "/admin/blogs", icon: Newspaper },
 ] as const;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Manage site content without deploying code. Changes sync to the public site; programs and countries also update
          live for visitors.
        </p>
      </div>

      {!svc && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Set <code className="rounded bg-white px-1">SUPABASE_SERVICE_ROLE_KEY</code> to load live counts and enable saves.
        </p>
      )}

      {loadError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}>
            <Card className="h-full transition hover:border-amber-300 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-600">{c.label}</CardTitle>
                <c.icon className="h-4 w-4 text-amber-700" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-zinc-900">{c.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}

        <Card className="border-dashed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600">Ticker</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-amber-700" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-zinc-900">{tickerActive ? "Active" : "Off"}</p>
            <Link href="/admin/settings" className="mt-2 inline-flex text-xs font-medium text-amber-800 underline">
              Edit in Site settings
            </Link>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Quick links</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          <li>
            <Link
              href="/admin/applications"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:border-amber-300"
            >
              Applications
            </Link>
          </li>
          <li>
            <Link
              href="/admin/content/home"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:border-amber-300"
            >
              Homepage copy
            </Link>
          </li>
          <li>
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:border-amber-300"
            >
              <Settings className="h-4 w-4" />
              Site settings
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
