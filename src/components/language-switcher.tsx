"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { locales } from "../../i18n";

function stripLocalePrefix(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "/";
  if (locales.includes(parts[0] as (typeof locales)[number])) {
    const rest = parts.slice(1).join("/");
    return `/${rest}`;
  }
  return pathname;
}

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale();
  const pathname = usePathname();

  const base = stripLocalePrefix(pathname);

  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      {locales.map((l) => {
        const href = `/${l}${base}`;
        const active = l === locale;
        return (
          <Link
            key={l}
            href={href}
            className={[
              "rounded-md px-2 py-1 transition",
              active ? "bg-slate-900 text-white" : "hover:bg-slate-100 hover:text-slate-900",
            ].join(" ")}
          >
            {t(l)}
          </Link>
        );
      })}
    </div>
  );
}

