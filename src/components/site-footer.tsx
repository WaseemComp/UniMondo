import Link from "next/link";
import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { getContactFooterSummary } from "@/lib/data/contact-page";

const LINKS = {
  explore: [
    { href: "/destinations", label: "Destinations" },
    { href: "/courses", label: "Language Courses" },
    { href: "/packages", label: "Our Packages" },
    { href: "/apply", label: "Apply" },
  ],
  company: [
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/blog", label: "Blog" },
    { href: "/admin/login", label: "Staff sign in" },
  ],
};

export async function SiteFooter() {
  const { headAddressShort, branchAddressShort, primaryPhone, emailHello, emailAdmissions } = await getContactFooterSummary();

  return (
    <footer className="border-t border-white/10 bg-[#050d1a] text-slate-400">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="font-[family-name:var(--font-heading)] text-xl font-semibold text-white">
            <span className="text-amber-400">Uni</span>Mondo
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">
            Student-focused education consultancy for Europe admissions — from shortlisting to visa-ready departure.
          </p>
          <div className="mt-5 flex gap-3">
            <a
              href="https://www.linkedin.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/15 p-2 text-slate-300 transition hover:border-amber-500/50 hover:text-amber-300"
              aria-label="UniMondo on LinkedIn"
            >
              <Globe className="h-5 w-5" />
            </a>
            <a
              href={`mailto:${emailHello}`}
              className="rounded-full border border-white/15 p-2 text-slate-300 transition hover:border-amber-500/50 hover:text-amber-300"
              aria-label="Email"
            >
              <Mail className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500/90">Explore</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {LINKS.explore.map((l) => (
              <li key={l.href + l.label}>
                <Link href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500/90">Company</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {LINKS.company.map((l) => (
              <li key={l.href + l.label}>
                <Link href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500/90">Contact</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {headAddressShort ? (
              <li className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-500/80" aria-hidden />
                <span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Head office</span>
                  <span className="mt-0.5 block text-slate-300">{headAddressShort}</span>
                </span>
              </li>
            ) : (
              <li className="flex gap-2 text-slate-500">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>Configure in Admin → Contact management</span>
              </li>
            )}
            {branchAddressShort ? (
              <li className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-500/80" aria-hidden />
                <span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</span>
                  <span className="mt-0.5 block text-slate-300">{branchAddressShort}</span>
                </span>
              </li>
            ) : null}
            <li className="flex gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-amber-500/80" aria-hidden />
              {primaryPhone ? (
                <a href={`tel:${primaryPhone.replace(/\s+/g, "")}`} className="hover:text-white">
                  {primaryPhone}
                </a>
              ) : (
                <span className="text-slate-500">See contact page</span>
              )}
            </li>
            <li className="flex gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-500/80" aria-hidden />
              <div className="space-y-1">
                <a href={`mailto:${emailHello}`} className="block hover:text-white">
                  {emailHello}
                </a>
                <a href={`mailto:${emailAdmissions}`} className="block hover:text-white">
                  {emailAdmissions}
                </a>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} UniMondo. All rights reserved.</p>
          <p className="text-slate-500">Study in Europe with clarity, care, and momentum.</p>
        </div>
        <div className="mx-auto max-w-7xl border-t border-white/5 px-4 py-4 text-center text-[11px] text-slate-600 sm:px-6 lg:px-8">
          <p>
            <Link href="/admin/login" className="text-slate-500 underline-offset-2 hover:text-amber-400/90 hover:underline">
              Staff sign-in
            </Link>{" "}
            is for UniMondo team only — not for student applications. Use{" "}
            <Link href="/apply" className="text-slate-500 underline-offset-2 hover:text-amber-400/90 hover:underline">
              Apply
            </Link>{" "}
            to start a program application.
          </p>
        </div>
      </div>
    </footer>
  );
}
