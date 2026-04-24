import type { AppLocale } from "../../../i18n/request";

type LocalizedJson = Record<string, unknown> | null | undefined;

export function getLocalized<T = string>(
  field: LocalizedJson,
  locale: AppLocale,
  fallbackLocale: AppLocale = "en"
): T | null {
  if (!field || typeof field !== "object") return null;
  const record = field as Record<string, unknown>;
  const preferred = record[locale];
  if (preferred != null) return preferred as T;
  const fallback = record[fallbackLocale];
  if (fallback != null) return fallback as T;
  return null;
}

