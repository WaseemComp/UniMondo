import { HERO_PRESENTATION_KEYS, type HeroPresentation } from "./hero-presentation";
/** Shared public/editor content. Existing records remain the source of saved values. */
export type HeroCopy = { title: string; subtitle: string; ctaExplore: string; ctaApply: string; eyebrow?: string; primaryHref?: string; secondaryHref?: string };
export type HeroSlide = HeroPresentation & { src: string; alt: string; line: string; isActive?: boolean; title?: string; subtitle?: string; ctaExplore?: string; ctaApply?: string; eyebrow?: string; primaryHref?: string; secondaryHref?: string };
export const HERO_DEFAULTS = {
  eyebrow: "UNIMONDO · EUROPEAN ADMISSIONS CONSULTANCY",
  title: "Your Future Knows No Borders",
  subtitle: "Personalized admissions guidance, visa expertise, and full student support — from first call to campus arrival.",
  ctaExplore: "Universities", ctaApply: "Begin Your Application", primaryHref: "/destinations", secondaryHref: "/apply",
};
export const HERO_SITE_KEYS: Record<keyof typeof HERO_DEFAULTS, string> = {
  eyebrow: "home.hero.eyebrow", title: "home.hero.title", subtitle: "home.hero.subtitle", ctaExplore: "home.hero.cta_explore", ctaApply: "home.hero.cta_apply", primaryHref: "home.hero.explore_href", secondaryHref: "home.hero.apply_href",
};
export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    src: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=2400&q=80",
    alt: "Historic Italian architecture and canals",
    line: "Italy · World-class universities & timeless culture",
  },
  {
    src: "https://images.unsplash.com/photo-1595867818082-083862f3d630?auto=format&fit=crop&w=2400&q=85",
    alt: "Munich cityscape with Frauenkirche",
    line: "Germany · Research powerhouses & industry links",
  },
  {
    src: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=2400&q=85",
    alt: "Eiffel Tower Paris skyline",
    line: "France · Prestige, innovation & global networks",
  },
  {
    src: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=2400&q=85",
    alt: "Amsterdam canals",
    line: "Netherlands · English-taught excellence",
  },
  {
    src: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=2400&q=85",
    alt: "International students collaborating",
    line: "Your cohort · Ambitious peers from every continent",
  },
] as const;

export const SECTION_DEFAULTS = {
  marketing_banner: { text: "Start your European journey with UniMondo from as low as", highlight: "$150", ctaLabel: "Our packages", ctaHref: "/packages" },
  why_unimondo: { kicker: "Why UniMondo", title: "Built for ambitious students who expect clarity", subtitle: "We combine European admissions know-how with human support — so you can focus on your future, not the paperwork maze." },
  destinations: { kicker: "Destinations", title: "Popular countries we cover", subtitle: "From Mediterranean campuses to Nordic innovation — find where your profile fits best.", ctaLabel: "View all destinations", ctaHref: "/destinations" },
  universities: { kicker: "Universities", title: "Universities and Programs", subtitle: "Hand-picked tracks from leading institutions — clear deadlines, transparent tuition bands, and counselor support.", ctaLabel: "See all openings", ctaHref: "/destinations" },
  success_stories: { kicker: "Success stories", title: "Students who crossed borders with us" },
  how_it_works: { kicker: "Process", title: "How it works", subtitle: "Five clear stages — transparent, documented, and built around your timeline." },
  why_europe: { kicker: "Why Europe", title: "A continent built for curious minds", subtitle: "From historic universities to cutting-edge labs, Europe blends academic depth with everyday adventure — trains to new cities on weekends, internships in global firms, and classmates from everywhere.", quickFact1Label: "Quick fact", quickFact1Value: "4000+ English-taught programs (EU/EEA)", quickFact2Label: "Quick fact", quickFact2Value: "Schengen mobility for study & travel" },
  journey_cta: { kicker: "Ready when you are", title: "Begin your journey to Europe", description: "Drop your GPA and IELTS — we'll carry these into your application flow so you skip retyping them.", buttonText: "Start 5-step application" },
};
// Preserve the public component's existing partial-copy fallback, which differs from its no-copy default.
export const EUROPE_PARTIAL_DEFAULTS = { ...SECTION_DEFAULTS.why_europe, kicker: "GO GLOBAL. THINK BIGGER.", title: "Your journey shouldn’t be limited by geography.", subtitle: "The world’s best opportunities are not in one country — they’re everywhere. Studying abroad connects you to global education, international careers, and life-changing experiences that redefine your future." };
export type CopySection = keyof typeof SECTION_DEFAULTS;
export type SectionId = "hero" | CopySection;
export type FieldDefinition = { key: string; label: string; type?: "textarea" | "link"; };
const standardFields: FieldDefinition[] = [{ key: "kicker", label: "Small heading above title" }, { key: "title", label: "Main heading" }, { key: "subtitle", label: "Supporting description", type: "textarea" }];
const buttonFields: FieldDefinition[] = [{ key: "ctaLabel", label: "Button text" }, { key: "ctaHref", label: "Button destination", type: "link" }];
export const HOME_SECTIONS: { id: SectionId; label: string; icon: string; permission: string; fields: FieldDefinition[]; note?: string }[] = [
  { id: "hero", label: "Hero & Main Banner", icon: "home", permission: "home.edit", fields: [
    { key: "eyebrow", label: "Introductory label" }, { key: "title", label: "Main headline" }, { key: "subtitle", label: "Supporting paragraph", type: "textarea" },
    { key: "ctaExplore", label: "Primary button text" }, { key: "primaryHref", label: "Primary button destination", type: "link" }, { key: "ctaApply", label: "Secondary button text" }, { key: "secondaryHref", label: "Secondary button destination", type: "link" },
  ] },
  { id: "marketing_banner", label: "Marketing Announcement", icon: "submissions", permission: "home.edit", fields: [{ key: "text", label: "Announcement", type: "textarea" }, { key: "highlight", label: "Highlighted text" }, ...buttonFields], note: "The supporting statement and visibility are editable under Section settings." },
  { id: "why_unimondo", label: "Why UniMondo", icon: "about", permission: "home.edit", fields: standardFields, note: "Use Benefit cards and Statistics above to manage each displayed item." },
  { id: "destinations", label: "Popular Destinations", icon: "destinations", permission: "home.edit", fields: [...standardFields, ...buttonFields], note: "Use Featured countries to select, organize and illustrate existing destinations." },
  { id: "universities", label: "Featured Universities & Programs", icon: "universities", permission: "home.edit", fields: [...standardFields, ...buttonFields], note: "Use Featured items to select existing universities and programs. Master records remain unchanged." },
  { id: "success_stories", label: "Success Stories", icon: "stories", permission: "home.edit", fields: standardFields.slice(0, 2), note: "Use Testimonials to manage approved public stories. The public carousel displays the first six featured stories in display order." },
  { id: "how_it_works", label: "How It Works", icon: "applications", permission: "home.edit", fields: standardFields, note: "Use Process steps to edit, add, organize or archive individual stages." },
  { id: "why_europe", label: "Why Study in Europe", icon: "destinations", permission: "home.edit", fields: [...standardFields, { key: "quickFact1Label", label: "First fact label" }, { key: "quickFact1Value", label: "First fact" }, { key: "quickFact2Label", label: "Second fact label" }, { key: "quickFact2Value", label: "Second fact" }], note: "Use Quick facts, Europe benefits and Section settings for the individual content and background." },
  { id: "journey_cta", label: "Final Call to Action", icon: "contact", permission: "home.cta.edit", fields: [...standardFields.slice(0, 2), { key: "description", label: "Supporting description", type: "textarea" }, { key: "buttonText", label: "Button text" }], note: "Section settings control the button destination, supporting text, input labels and visibility. Application destinations retain GPA and IELTS handling." },
];
export type HomeBlock = { id: string; section_key: string; block_key: string; is_active: boolean; sort_order: number; content: unknown; media: unknown; updated_at: string };
export type ValueSource = "saved" | "inherited" | "default";
export type EffectiveValue = { value: string; source: ValueSource; detail: string };
export function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
export function english(value: unknown): string | undefined { return typeof value === "string" ? value : typeof record(value).en === "string" ? record(value).en as string : undefined; }
function nonblank(value: unknown): string | undefined { const text = english(value); return text?.trim() ? text : undefined; }
export function mergeEnglish(previous: unknown, value: string): unknown { return previous && typeof previous === "object" && !Array.isArray(previous) ? { ...record(previous), en: value } : value; }
export function sectionBlock(blocks: HomeBlock[], section: CopySection, activeOnly = false): HomeBlock | undefined {
  return [...blocks].sort((a, b) => a.sort_order - b.sort_order).find(block => block.section_key === section && block.block_key === "copy" && (!activeOnly || block.is_active));
}
export function resolveGlobalHero(site: Record<string, string>): Record<keyof typeof HERO_DEFAULTS, EffectiveValue> {
  return Object.fromEntries(Object.entries(HERO_DEFAULTS).map(([key, fallback]) => {
    const saved = nonblank(site[HERO_SITE_KEYS[key as keyof typeof HERO_DEFAULTS]]);
    return [key, { value: saved ?? fallback, source: saved === undefined ? "default" : "saved", detail: saved === undefined ? "Existing website default" : "Saved homepage copy" }];
  })) as Record<keyof typeof HERO_DEFAULTS, EffectiveValue>;
}
export function hasEuropeCopy(content: Record<string, unknown>): boolean {
  return ["kicker", "title", "subtitle", "quickFact1Value", "quickFact2Value"].some(key => Boolean(nonblank(content[key])));
}
export function resolveSection(blocks: HomeBlock[], section: CopySection): Record<string, EffectiveValue> {
  const raw = record(sectionBlock(blocks, section, true)?.content);
  const partialEurope = section === "why_europe" && hasEuropeCopy(raw);
  // The legacy renderer ignores label-only Europe records until substantive copy exists.
  const content = section === "why_europe" && !partialEurope ? {} : raw;
  const defaults = partialEurope ? EUROPE_PARTIAL_DEFAULTS : SECTION_DEFAULTS[section];
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
    const saved = nonblank(content[key]);
    return [key, { value: saved ?? fallback, source: saved === undefined ? "default" : "saved", detail: saved === undefined ? "Existing website default" : "Saved section copy" }];
  }));
}
export function valuesOf(fields: Record<string, EffectiveValue>): Record<string, string> { return Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value])); }
export function heroSlideFromBlock(block: HomeBlock): HeroSlide {
  const c = record(block.content), m = record(block.media);
  const alt = String(m.imageAlt ?? m.alt ?? "");
  return { ...Object.fromEntries(HERO_PRESENTATION_KEYS.map(key => [key, english(c[key]) || undefined])), src: String(m.imageUrl ?? m.src ?? ""), alt, line: nonblank(c.line) || alt, title: nonblank(c.title), subtitle: nonblank(c.subtitle), ctaExplore: nonblank(c.buttonText), ctaApply: nonblank(c.secondaryButtonText), eyebrow: nonblank(c.eyebrow), primaryHref: nonblank(c.primaryHref), secondaryHref: nonblank(c.secondaryHref), isActive: block.is_active };
}
export const SLIDE_COPY_KEYS: Record<string, string> = { title: "title", subtitle: "subtitle", ctaExplore: "buttonText", ctaApply: "secondaryButtonText", eyebrow: "eyebrow", primaryHref: "primaryHref", secondaryHref: "secondaryHref" };
export function resolveSlideCopy(site: Record<string, string>, block?: HomeBlock): Record<string, EffectiveValue> {
  const global = resolveGlobalHero(site), c = record(block?.content);
  return Object.fromEntries(Object.entries(SLIDE_COPY_KEYS).map(([field, key]) => {
    const saved = nonblank(c[key]), inherited = global[field as keyof typeof global];
    return [field, saved === undefined ? { value: inherited.value, source: "inherited", detail: `Uses global hero copy · ${inherited.source === "saved" ? "saved" : "website default"}` } : { value: saved, source: "saved", detail: "Saved override for this slide" }];
  }));
}
/** Open the first usable published slide; keep hidden/invalid records editable when no published slide exists. */
export function firstHeroEditorTarget(blocks: HomeBlock[], canViewSlides: boolean): string {
  if (!canViewSlides) return "global";
  const slides = blocks.filter(block => block.section_key === "hero_slider" && block.block_key === "slide").sort((a, b) => a.sort_order - b.sort_order);
  return (slides.find(block => block.is_active && Boolean(heroSlideFromBlock(block).src)) ?? slides[0])?.id ?? "builtin:0";
}
export function publicHeroSlides(blocks: HomeBlock[]): HeroSlide[] {
  const slides = [...blocks].filter(block => block.section_key === "hero_slider" && block.block_key === "slide" && block.is_active).sort((a, b) => a.sort_order - b.sort_order).map(heroSlideFromBlock).filter(slide => Boolean(slide.src));
  return slides.length ? slides : DEFAULT_HERO_SLIDES;
}
export function contentLabel(key: string, label?: string | null): string {
  const labels: Record<string, string> = { "home.ticker.enabled": "News ticker visibility", "home.hero.eyebrow": "Hero introductory label", "home.hero.title": "Hero main headline", "home.hero.subtitle": "Hero supporting paragraph", "home.hero.cta_explore": "Hero primary button text", "home.hero.cta_apply": "Hero secondary button text", "home.hero.explore_href": "Hero primary button destination", "home.hero.apply_href": "Hero secondary button destination" };
  if (labels[key]) return labels[key];
  if (label?.trim() && !/^[\w-]+\.[\w.-]+$/.test(label)) return label;
  return key.split(/[.:_]/).filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join(" ");
}
