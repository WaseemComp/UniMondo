import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ContactAddressRow = {
  id: string;
  label: string;
  lines: string;
  sort_order: number;
};

export type ContactPhoneRow = {
  id: string;
  label: string;
  number: string;
  kind: "landline" | "fax";
  sort_order: number;
};

export type ContactEmailRow = {
  id: string;
  label: string;
  email: string;
  sort_order: number;
};

export type OfficePhone = {
  number: string;
  label?: string;
  kind?: "landline" | "fax" | "mobile";
};

export type OfficeEmail = {
  email: string;
  label?: string;
};

export type OfficeSocial = {
  platform: string;
  url: string;
};

export type ContactOfficeRow = {
  id: string;
  office_type: "head" | "branch";
  title: string | null;
  address_lines: string;
  phones: OfficePhone[];
  emails: OfficeEmail[];
  social_links: OfficeSocial[];
  sort_order: number;
};

export type ContactPageData = {
  /** Primary structured offices (Contact page + footer). */
  offices: ContactOfficeRow[];
  /** Legacy flat rows (optional fallback if offices empty). */
  addresses: ContactAddressRow[];
  phones: ContactPhoneRow[];
  emails: ContactEmailRow[];
};

function parseOfficeRow(raw: Record<string, unknown>): ContactOfficeRow {
  const phones = Array.isArray(raw.phones) ? (raw.phones as OfficePhone[]) : [];
  const emails = Array.isArray(raw.emails) ? (raw.emails as OfficeEmail[]) : [];
  const social = Array.isArray(raw.social_links) ? (raw.social_links as OfficeSocial[]) : [];
  return {
    id: String(raw.id),
    office_type: raw.office_type === "branch" ? "branch" : "head",
    title: raw.title != null ? String(raw.title) : null,
    address_lines: String(raw.address_lines ?? ""),
    phones,
    emails,
    social_links: social,
    sort_order: Number(raw.sort_order ?? 0),
  };
}

export async function getContactOffices(): Promise<ContactOfficeRow[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("contact_offices")
    .select("id, office_type, title, address_lines, phones, emails, social_links, sort_order")
    .order("sort_order", { ascending: true });

  if (error || !data?.length) return [];
  return data.map((r) => parseOfficeRow(r as Record<string, unknown>));
}

export async function getContactPageData(): Promise<ContactPageData> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { offices: [], addresses: [], phones: [], emails: [] };
  }

  const [officesRes, addr, phone, email] = await Promise.all([
    supabase
      .from("contact_offices")
      .select("id, office_type, title, address_lines, phones, emails, social_links, sort_order")
      .order("sort_order", { ascending: true }),
    supabase.from("contact_addresses").select("id, label, lines, sort_order").order("sort_order", { ascending: true }),
    supabase.from("contact_phones").select("id, label, number, kind, sort_order").order("sort_order", { ascending: true }),
    supabase.from("contact_emails").select("id, label, email, sort_order").order("sort_order", { ascending: true }),
  ]);

  const offices =
    officesRes.error || !officesRes.data
      ? []
      : officesRes.data.map((r) => parseOfficeRow(r as Record<string, unknown>));

  return {
    offices,
    addresses: (addr.data ?? []) as ContactAddressRow[],
    phones: (phone.data ?? []) as ContactPhoneRow[],
    emails: (email.data ?? []) as ContactEmailRow[],
  };
}

function firstLine(text: string, maxLen = 72): string {
  const line = text.split("\n").map((s) => s.trim()).find(Boolean);
  if (!line) return "";
  return line.length > maxLen ? `${line.slice(0, maxLen)}…` : line;
}

function pickEmail(emails: OfficeEmail[], matcher: (e: string) => boolean): string | null {
  const found = emails.find((x) => matcher(x.email.toLowerCase()));
  return found?.email ?? null;
}

/** Footer: head + branch lines, main phone, hello + admissions addresses. */
export async function getContactFooterSummary(): Promise<{
  headAddressShort: string | null;
  branchAddressShort: string | null;
  primaryPhone: string | null;
  emailHello: string;
  emailAdmissions: string;
}> {
  const defaultHello = "hello@unimondo.com";
  const defaultAdm = "admissions@unimondo.com";

  const data = await getContactPageData();
  const { offices, addresses, phones: legacyPhones, emails: legacyEmails } = data;

  if (offices.length > 0) {
    const head = offices.find((o) => o.office_type === "head") ?? offices[0];
    const branch = offices.find((o) => o.office_type === "branch");
    const headAddr = head ? firstLine(head.address_lines) : null;
    const branchAddr = branch ? firstLine(branch.address_lines) : null;
    const landline = head?.phones.find((p) => p.kind !== "fax") ?? head?.phones[0];
    const phone = landline?.number ?? null;
    const allEmails = offices.flatMap((o) => o.emails);
    let hello = pickEmail(allEmails, (e) => e.includes("hello"));
    let adm = pickEmail(allEmails, (e) => e.includes("admissions"));
    if (!hello) hello = head?.emails[0]?.email ?? legacyEmails[0]?.email ?? defaultHello;
    if (!adm) adm = legacyEmails.find((e) => e.email.toLowerCase().includes("admissions"))?.email ?? defaultAdm;
    return {
      headAddressShort: headAddr,
      branchAddressShort: branchAddr,
      primaryPhone: phone,
      emailHello: hello,
      emailAdmissions: adm,
    };
  }

  const primaryEmail = legacyEmails[0]?.email ?? defaultHello;
  const adm =
    legacyEmails.find((e) => e.email.toLowerCase().includes("admissions"))?.email ?? defaultAdm;
  const hello =
    legacyEmails.find((e) => e.email.toLowerCase().includes("hello"))?.email ?? primaryEmail;
  const land = legacyPhones.find((p) => p.kind === "landline") ?? legacyPhones[0];
  return {
    headAddressShort: addresses[0]?.lines ? firstLine(addresses[0].lines) : null,
    branchAddressShort: addresses[1]?.lines ? firstLine(addresses[1].lines) : null,
    primaryPhone: land?.number ?? null,
    emailHello: hello,
    emailAdmissions: adm,
  };
}
