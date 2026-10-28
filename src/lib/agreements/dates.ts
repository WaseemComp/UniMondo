/** Accept historic display dates while storing new edits as unambiguous ISO calendar dates. */
export function calendarDate(value?: string | null): string {
  if (!value?.trim()) return "";
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const numeric = raw.match(/^(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4})$/);
  if (numeric) return `${numeric[3]}-${numeric[2].padStart(2, "0")}-${numeric[1].padStart(2, "0")}`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}
export function validCalendarDate(value?: string | null): boolean {
  const date = calendarDate(value);
  if (!date) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

/** Display only: database calendar strings and historical snapshots remain unchanged. */
export function formatAgreementDate(value?: string | null): string {
  if(!value?.trim())return "";
  const iso=calendarDate(value);
  if(!validCalendarDate(iso))return value.trim();
  const [year,month,day]=iso.split("-");
  return `${day}-${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(month)-1]}-${year}`;
}
