import Link from "next/link";
import { listContentWorkflows } from "@/app/admin/cms/publishing-actions";
import { STATUS_LABELS, type WorkflowStatus } from "@/lib/publishing/model";
export const metadata = {
  title: "Drafts & reviews | UniMondo",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const { ready, rows } = await listContentWorkflows();
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold">Drafts & reviews</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-600">
          Private saved work, approvals and publication history. Existing public
          content remains unchanged until an approved version is published.
        </p>
      </header>
      {!ready && (
        <p role="alert" className="rounded-xl bg-red-50 p-4">
          Content publishing setup is pending or temporarily unavailable.
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => {
          const href =
            row.content_type === "home"
              ? row.record_key === "testimonials"
                ? "/admin/content/success-stories"
                : row.record_key === "ticker"
                  ? "/admin/content/ticker"
                  : "/admin/home?section=" + encodeURIComponent(row.record_key)
              : {
                  countries: "/admin/destinations/countries",
                  universities: "/admin/universities",
                  programmes: "/admin/programs",
                }[
                  row.content_type as
                    "countries" | "universities" | "programmes"
                ] +
                "?record=" +
                encodeURIComponent(row.record_key);
          return (
            <Link
              key={row.content_type + row.record_key}
              href={href}
              className="rounded-2xl border border-zinc-200 bg-white p-5 hover:border-[#2C786D]"
            >
              <p className="font-semibold">{row.title}</p>
              <p className="mt-2 text-sm text-[#2C786D]">
                {STATUS_LABELS[row.status as WorkflowStatus]}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                {row.owner_label} · {new Date(row.updated_at).toLocaleString()}
              </p>
            </Link>
          );
        })}
      </div>
      {ready && !rows.length && (
        <p className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
          No private drafts yet. Open the homepage or catalogue editor and
          choose Save Draft.
        </p>
      )}
    </div>
  );
}
