import { z } from "zod";
import { COLLECTIONS, ICON_CHOICES, type CollectionId, type HomepageItem, type HomepageReferences, presentationDefaults } from "./items";
import { safeDestination, safeImage } from "./validation";
import { HOME_SECTIONS, type SectionId } from "./content";
const field = z.string().max(5000);
export const homepageItemSchema = z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,160}$/),title:field,description:field,icon:z.enum(ICON_CHOICES),visible:z.boolean(),archived:z.boolean(),imageUrl:z.string().max(2500),imageAlt:z.string().max(500),reference:z.string().max(300),recordType:z.enum(["","country","program","university"]),value:z.number().finite().min(0).max(1_000_000_000),suffix:z.string().max(30),label:z.string().max(500)}).strict();
export const collectionInputSchema = z.object({collection:z.enum(Object.keys(COLLECTIONS) as [CollectionId,...CollectionId[]]),expectedUpdatedAt:z.string().nullable(),items:z.array(homepageItemSchema).max(80)}).strict();
export const presentationInputSchema = z.object({section:z.enum(HOME_SECTIONS.map(s=>s.id) as [SectionId,...SectionId[]]),expectedUpdatedAt:z.string().nullable(),values:z.record(z.string(),z.union([z.string().max(5000),z.boolean()]))}).strict();
export function validateItems(collection: CollectionId, items: HomepageItem[], references?: HomepageReferences, oldItems: HomepageItem[] = []): string | null {
  if (!z.array(homepageItemSchema).max(80).safeParse(items).success) return "Check the item fields. Text must fit the displayed limits.";
  if (new Set(items.map(i=>i.id)).size !== items.length) return "Each item must have a unique identity. Reload before saving.";
  const selected = new Set<string>();
  for(const item of items) {
    if (item.archived) continue;
    const requireText=(value:string,label:string)=>!value.trim()?`${label} cannot be blank.`:null;
    if(collection === "why_cards" || collection === "steps") { const error=requireText(item.title,"Title")||requireText(item.description,"Description");if(error)return error; }
    if(collection === "europe_facts") {const error=requireText(item.label,"Fact label")||requireText(item.description,"Fact");if(error)return error;}
    if(collection === "europe_benefits" && !item.description.trim()) return "Benefit text cannot be blank.";
    if(collection === "why_stats" && (!item.label.trim() || item.value<=0)) return "Statistics need a positive value and a descriptive label. Use substantiated figures only.";
    if(item.imageUrl && item.imageUrl !== oldItems.find(old=>old.id===item.id)?.imageUrl && !safeImage(item.imageUrl,process.env.NEXT_PUBLIC_SUPABASE_URL)) return "Choose a supported image from the Media Library.";
    if(collection === "destinations" || collection === "featured") {
      if(collection==="destinations" && (!item.imageUrl || !item.imageAlt.trim())) return "Choose a destination image and describe it for visitors.";
      if(collection==="destinations" && item.recordType!=="country") return "Choose an existing country.";
      if(!item.reference) return "Choose an existing record for every featured item.";
      const identity=item.recordType+":"+item.reference;if(selected.has(identity)) return "This record is already selected. Change its position instead of adding a duplicate.";selected.add(identity);
      if(references) {
        const exists=collection==="destinations" ? references.countries.some(c=>c.country===item.reference) : item.recordType==="program" ? references.programs.some(p=>p.id===item.reference) : item.recordType==="university" && references.universities.some(u=>u.id===item.reference);
        // A removed canonical record can be retained invisibly for restoration; it cannot be featured.
        if(!exists && item.visible) return "A selected record is no longer available for promotion. Hide it or choose an available record.";
      }
    }
  }
  // Archiving retains existing content instead of accepting a destructive replacement array.
  if(oldItems.some(old=>!items.some(item=>item.id===old.id))) return "Keep existing items and use Archive to remove them from the public section.";
  return null;
}
export function validatePresentation(section: SectionId, values: Record<string,string|boolean>): string | null {
  const defaults=presentationDefaults(section);
  if(Object.keys(defaults).some(key=>!(key in values)) || Object.keys(values).some(key=>!(key in defaults))) return "This section setting is not supported.";
  for(const [key,fallback] of Object.entries(defaults)) {
    const value=values[key];if(typeof value!==typeof fallback) return "Check the section settings.";
    if(typeof value!=="string")continue;
    if(value.length>5000) return "The section text is too long.";
    if(key.endsWith("Href") && !safeDestination(value))return "Use a valid website path, page anchor or secure https:// destination.";
    if(key==="imageUrl" && !safeImage(value,process.env.NEXT_PUBLIC_SUPABASE_URL))return "Choose a background image from the Media Library.";
    if((key.endsWith("Label")||key.endsWith("Placeholder")) && !value.trim())return "Button and input labels cannot be blank.";
  }
  return null;
}
