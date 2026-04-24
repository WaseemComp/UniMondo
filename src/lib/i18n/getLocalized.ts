type LocalizedJson = Record<string, unknown> | null | undefined;

/**
 * Resolves a JSONB multilingual field to a display string. The app is English-only; we
 * prefer the `en` key when present, then any other string value.
 */
export function getLocalized<T = string>(field: LocalizedJson): T | null {
  if (!field || typeof field !== "object") return null;
  const record = field as Record<string, unknown>;
  const en = record.en;
  if (en != null) return en as T;
  for (const v of Object.values(record)) {
    if (v != null) return v as T;
  }
  return null;
}
