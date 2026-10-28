import { record, resolveSection, type HomeBlock, type SectionId } from "./content";
import { BENEFIT_DEFAULTS, STEP_DEFAULTS, EUROPE_BENEFIT_DEFAULTS, DESTINATION_DEFAULTS } from "./item-defaults";
import type { Opening, CountryDetail } from "@/lib/unimondo-data";
import type { FeaturedUniversity } from "@/lib/featured-universities";

export const ICON_CHOICES = ["Sparkles", "ShieldCheck", "Compass", "HeartHandshake", "Plane", "BarChart3", "BookOpen", "GraduationCap", "ClipboardCheck", "FileText", "Globe2", "Languages", "Landmark", "CheckCircle", "MapPin", "Users", "Award", "Clock"] as const;
export type HomepageItem = { id: string; title: string; description: string; icon: string; visible: boolean; archived: boolean; imageUrl: string; imageAlt: string; reference: string; recordType: string; value: number; suffix: string; label: string };
export const newHomepageItem = (id: string, patch: Partial<HomepageItem> = {}): HomepageItem => ({ id, title: "", description: "", icon: "Sparkles", visible: true, archived: false, imageUrl: "", imageAlt: "", reference: "", recordType: "", value: 0, suffix: "", label: "", ...patch });
export const COLLECTIONS = {
  why_cards: { section: "why_unimondo", label: "Benefit cards", singular: "card", fields: ["title", "description", "icon"] },
  why_stats: { section: "why_unimondo", label: "Statistics", singular: "statistic", fields: ["value", "suffix", "label"] },
  destinations: { section: "destinations", label: "Featured countries", singular: "country", fields: ["reference", "description", "imageUrl"] },
  featured: { section: "universities", label: "Featured universities & programs", singular: "featured item", fields: ["reference"] },
  steps: { section: "how_it_works", label: "Process steps", singular: "step", fields: ["title", "description", "icon"] },
  europe_facts: { section: "why_europe", label: "Quick facts", singular: "fact", fields: ["label", "description"] },
  europe_benefits: { section: "why_europe", label: "Europe benefits", singular: "benefit", fields: ["description", "icon"] },
} as const;
export type CollectionId = keyof typeof COLLECTIONS;
export type HomepageReferences = { countries: CountryDetail[]; programs: Opening[]; universities: FeaturedUniversity[]; available: boolean; permissions?: {countries:boolean;academic:boolean} };
export function collectionBlock(blocks: HomeBlock[], collection: CollectionId) { return blocks.find(block => block.section_key === COLLECTIONS[collection].section && block.block_key === `collection_${collection}` && block.sort_order === 0); }
export function collectionDefaults(collection: CollectionId, blocks: HomeBlock[], references?: HomepageReferences, openings: Opening[] = []): HomepageItem[] {
  switch (collection) {
    case "why_cards": return BENEFIT_DEFAULTS.map((value, i) => newHomepageItem(`default-card-${i}`, value));
    case "steps": return STEP_DEFAULTS.map((value, i) => newHomepageItem(`default-step-${i}`, value));
    case "europe_benefits": return EUROPE_BENEFIT_DEFAULTS.map((value, i) => newHomepageItem(`default-europe-${i}`, value));
    case "europe_facts": {
      const copy = resolveSection(blocks, "why_europe");
      const text = (key: string, fallback: string) => copy[key]?.value ?? fallback;
      return [newHomepageItem("default-fact-0", { label: text("quickFact1Label", "Quick fact"), description: text("quickFact1Value", "4000+ English-taught programs (EU/EEA)") }), newHomepageItem("default-fact-1", { label: text("quickFact2Label", "Quick fact"), description: text("quickFact2Value", "Schengen mobility for study & travel") })];
    }
    // Previously ignored legacy stats remain inactive until explicitly configured.
    case "why_stats": return [];
    case "destinations": return DESTINATION_DEFAULTS.map((value, i) => newHomepageItem(`default-country-${i}`, { title: value.country, reference: value.country, recordType: "country", description: value.description, imageUrl: references?.countries.find(country=>country.country===value.country)?.imageUrl || value.imageUrl, imageAlt: `${value.country} — European study destination` }));
    case "featured": return (openings.length ? openings : references?.programs ?? []).slice(0, 4).map(value => newHomepageItem(`default-program-${value.id}`, { reference: value.id, recordType: "program", title: value.programName }));
  }
}
export function resolveCollection(blocks: HomeBlock[], collection: CollectionId, references?: HomepageReferences, openings: Opening[] = []): { items: HomepageItem[]; source: "saved" | "default" | "inherited" } {
  const block = collectionBlock(blocks, collection), raw = record(block?.content).items;
  if (block?.is_active && Array.isArray(raw)) return { items: raw.map(row => newHomepageItem(String(record(row).id), record(row) as Partial<HomepageItem>)), source: "saved" };
  return { items: collectionDefaults(collection, blocks, references, openings), source: collection === "europe_facts" || collection === "why_stats" ? "inherited" : "default" };
}
export function publicItems(items: HomepageItem[]) { return items.filter(item => item.visible && !item.archived); }
export function presentationBlock(blocks: HomeBlock[], section: SectionId) { return blocks.find(block => block.section_key === section && block.block_key === "presentation" && block.sort_order === 0); }
export function presentationDefaults(section: SectionId): Record<string, string | boolean> {
  const common = { visible: true };
  if (section === "why_europe") return { ...common, imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=2400&q=75", imageAlt: "" };
  if (section === "marketing_banner") return { ...common, supportingText: "No upfront application fee." };
  if (section === "journey_cta") return { ...common, buttonHref: "/apply", supportingText: "No payment required to start · Your data is used only for counseling coordination.", showEligibility: true, gpaLabel: "GPA (4.0 scale)", gpaPlaceholder: "GPA (e.g. 3.4)", ieltsLabel: "IELTS overall", ieltsPlaceholder: "IELTS (e.g. 7.0)" };
  if (section === "universities") return { ...common, applyLabel: "Apply now", applyHref: "/apply", detailsLabel: "Details", detailsHref: "/destinations" };
  if (section === "destinations") return { ...common, destinationLabel: "View destination" };
  return common;
}
export function resolvePresentation(blocks: HomeBlock[], section: SectionId) { const block = presentationBlock(blocks, section), defaults = presentationDefaults(section), content = block?.is_active ? record(block.content) : {}; return Object.fromEntries(Object.entries(defaults).map(([key,fallback])=>[key, typeof content[key]===typeof fallback ? content[key] : fallback])) as Record<string, string | boolean>; }
export function isSectionVisible(blocks: HomeBlock[], section: SectionId) { return resolvePresentation(blocks, section).visible !== false; }
export function withCollection(blocks: HomeBlock[], collection: CollectionId, items: HomepageItem[]): HomeBlock[] { const current = collectionBlock(blocks, collection); return [...blocks.filter(block => block.id !== current?.id), { id: current?.id ?? `preview-${collection}`, section_key: COLLECTIONS[collection].section, block_key: `collection_${collection}`, sort_order: 0, is_active: true, content: { ...record(current?.content), items }, media: record(current?.media), updated_at: current?.updated_at ?? "" }]; }
export function withPresentation(blocks: HomeBlock[], section: SectionId, values: Record<string, string | boolean>): HomeBlock[] { const current = presentationBlock(blocks, section); return [...blocks.filter(block => block.id !== current?.id), { id: current?.id ?? `preview-${section}`, section_key: section, block_key: "presentation", sort_order: 0, is_active: true, content: { ...record(current?.content), ...values }, media: record(current?.media), updated_at: current?.updated_at ?? "" }]; }
export function destinationCards(items: HomepageItem[], countries: CountryDetail[]) { return publicItems(items).flatMap(item => { const canonical = countries.find(country => country.country === item.reference); const legacy = DESTINATION_DEFAULTS.find(country => country.country === item.reference); if (!canonical) return []; return [{ id: item.id, country: canonical?.country ?? item.reference, blurb: item.description || canonical?.description || canonical?.whyStudyThere || legacy?.description || "", img: item.imageUrl || canonical?.imageUrl || legacy?.imageUrl || "", alt: item.imageAlt || `${item.reference} — study destination`, flag: canonical?.flagEmoji, slug: canonical?.slug }]; }); }
export function featuredItems(items: HomepageItem[], references: HomepageReferences, openings: Opening[]): { item: HomepageItem; program?: Opening; university?: FeaturedUniversity }[] {
  const result: { item: HomepageItem; program?: Opening; university?: FeaturedUniversity }[] = [];
  for (const item of publicItems(items)) { if (item.recordType === "program") { const program = openings.find(p => p.id === item.reference); if (program) result.push({item, program}); } else { const university = references.universities.find(u => u.id === item.reference); if (university) result.push({item, university}); } }
  return result;
}
