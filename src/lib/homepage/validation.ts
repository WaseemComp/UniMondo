import { HOME_SECTIONS, HERO_DEFAULTS, type SectionId } from "./content";

export function safeDestination(value: string): boolean {
  if (!value || value !== value.trim() || /[\s\\\u0000-\u001f\u007f]/.test(value) || /%0[ad]|%5c/i.test(value)) return false;
  if (value.startsWith("#")) return /^#[a-z][\w:-]*$/i.test(value);
  if (value.startsWith("/")) return !value.startsWith("//");
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}
export function safeImage(value: string, supabaseUrl?: string): boolean {
  if (!safeDestination(value) || value.startsWith("#")) return false;
  if (value.startsWith("/")) return !value.startsWith("/_next/") && !value.includes("..");
  try {
    const url = new URL(value);
    return url.hostname === "images.unsplash.com" || Boolean(supabaseUrl && url.origin === new URL(supabaseUrl).origin && url.pathname.startsWith("/storage/v1/object/public/"));
  } catch { return false; }
}
export function validateCopyPatch(section: SectionId, patch: Record<string, string>): string | null {
  const fields = HOME_SECTIONS.find(item => item.id === section)?.fields ?? [];
  for (const [key, value] of Object.entries(patch)) {
    const field = fields.find(item => item.key === key);
    if (!field) return "This field cannot be edited in this section.";
    if (!value.trim()) return `${field.label} cannot be blank. Your saved content has not changed.`;
    if (value.length > (field.type === "textarea" ? 5000 : 600)) return `${field.label} is too long.`;
    if (field.type === "link" && !safeDestination(value)) return `${field.label} must be a website path or a secure https:// address.`;
  }
  return null;
}
export function validateSlidePatch(patch: Record<string, string>, supabaseUrl?: string): string | null {
  const allowed = [...Object.keys(HERO_DEFAULTS).filter(key => ["title", "subtitle", "ctaExplore", "ctaApply"].includes(key)), "line", "imageUrl", "imageAlt"];
  for (const [key, value] of Object.entries(patch)) {
    if (!allowed.includes(key)) return "This slide field cannot be edited.";
    if (!value.trim()) return "Slide fields cannot be blank. Use ‘Use global copy’ to remove a text override.";
    if (value.length > (key === "subtitle" ? 5000 : 1500)) return "The slide text is too long.";
    if (key === "imageUrl" && !safeImage(value, supabaseUrl)) return "Choose an existing website image, a public UniMondo storage image or an Unsplash image using https://.";
  }
  return null;
}
