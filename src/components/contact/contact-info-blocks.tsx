import { Mail, MapPin, Phone } from "lucide-react";
import type { ContactPageData } from "@/lib/data/contact-page";
import { cn } from "@/lib/utils";

type Props = {
  data: ContactPageData;
  className?: string;
};

export function ContactInfoBlocks({ data, className }: Props) {
  const { addresses, phones, emails } = data;
  const hasAny = addresses.length > 0 || phones.length > 0 || emails.length > 0;

  if (!hasAny) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
        Contact details are being updated. Please check back shortly or reach us through the forms below.
      </p>
    );
  }

  return (
    <div className={cn("grid gap-5 lg:grid-cols-3", className)}>
      {addresses.length > 0 ? (
        <article className="rounded-2xl border border-slate-200/90 border-l-[3px] border-l-amber-500/70 bg-white p-5 shadow-md shadow-slate-200/50 ring-1 ring-slate-100">
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-heading)] text-lg font-semibold text-[#0a1628]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
              <MapPin className="h-5 w-5 text-amber-700" aria-hidden />
            </span>
            Addresses
          </h2>
          <ul className="mt-4 space-y-4 text-sm text-slate-700">
            {addresses.map((a) => (
              <li key={a.id}>
                {a.label ? <p className="font-medium text-slate-900">{a.label}</p> : null}
                <p className="mt-1 whitespace-pre-line leading-relaxed">{a.lines}</p>
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      {phones.length > 0 ? (
        <article className="rounded-2xl border border-slate-200/90 border-l-[3px] border-l-amber-500/70 bg-white p-5 shadow-md shadow-slate-200/50 ring-1 ring-slate-100">
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-heading)] text-lg font-semibold text-[#0a1628]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
              <Phone className="h-5 w-5 text-amber-700" aria-hidden />
            </span>
            Phone &amp; fax
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {phones.map((p) => (
              <li key={p.id} className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {p.kind === "fax" ? "Fax" : "Landline"}
                  {p.label ? ` · ${p.label}` : ""}
                </span>
                <a href={`tel:${p.number.replace(/\s+/g, "")}`} className="font-medium text-[#0a1628] hover:text-amber-800">
                  {p.number}
                </a>
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      {emails.length > 0 ? (
        <article className="rounded-2xl border border-slate-200/90 border-l-[3px] border-l-amber-500/70 bg-white p-5 shadow-md shadow-slate-200/50 ring-1 ring-slate-100 lg:col-span-1">
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-heading)] text-lg font-semibold text-[#0a1628]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
              <Mail className="h-5 w-5 text-amber-700" aria-hidden />
            </span>
            Email
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {emails.map((e) => (
              <li key={e.id}>
                {e.label ? <p className="font-medium text-slate-900">{e.label}</p> : null}
                <a href={`mailto:${e.email}`} className="text-[#0a1628] underline-offset-2 hover:text-amber-800 hover:underline">
                  {e.email}
                </a>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </div>
  );
}
