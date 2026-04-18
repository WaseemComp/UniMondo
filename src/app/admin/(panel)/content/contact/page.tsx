import { ContactManagementManager } from "@/components/admin/cms/contact-management-manager";
import type { ContactOfficeRow } from "@/lib/data/contact-page";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export default async function AdminContactManagementPage() {
  const svc = createSupabaseServiceClient();
  if (!svc) {
    return (
      <p className="text-sm text-amber-800">
        Configure <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> to manage contact offices.
      </p>
    );
  }

  const { data, error } = await svc
    .from("contact_offices")
    .select("id, office_type, title, address_lines, phones, emails, social_links, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-900">Contact management</h1>
        <p className="text-sm text-red-600">
          {error.message.includes("does not exist")
            ? "Run the latest Supabase migrations to create contact_offices."
            : error.message}
        </p>
      </div>
    );
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const offices: ContactOfficeRow[] = rows.map((raw) => ({
    id: String(raw.id),
    office_type: raw.office_type === "branch" ? "branch" : "head",
    title: raw.title != null ? String(raw.title) : null,
    address_lines: String(raw.address_lines ?? ""),
    phones: Array.isArray(raw.phones) ? (raw.phones as ContactOfficeRow["phones"]) : [],
    emails: Array.isArray(raw.emails) ? (raw.emails as ContactOfficeRow["emails"]) : [],
    social_links: Array.isArray(raw.social_links) ? (raw.social_links as ContactOfficeRow["social_links"]) : [],
    sort_order: Number(raw.sort_order ?? 0),
  }));

  return <ContactManagementManager offices={offices} />;
}
