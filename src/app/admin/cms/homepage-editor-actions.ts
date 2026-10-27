"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertAdminScope } from "@/lib/auth/admin-page-guard";
import { requireAdminUser } from "@/app/admin/require-admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { readHomepageSnapshot, type HomepageSnapshot } from "@/lib/admin/homepage-editor";
import { DEFAULT_HERO_SLIDES, HERO_SITE_KEYS, HOME_SECTIONS, SLIDE_COPY_KEYS, english, hasEuropeCopy, mergeEnglish, record, resolveSection, sectionBlock, valuesOf, type CopySection } from "@/lib/homepage/content";
import { validateCopyPatch, validateSlidePatch } from "@/lib/homepage/validation";
import { saveSiteContent } from "@/app/admin/actions";
import { upsertCmsBlock } from "./cms-block-actions";
import { saveHomeHeroSlide } from "./home-page-blocks-actions";

const patch = z.record(z.string(), z.string()).refine(value => Object.keys(value).length <= 12);
const inherit = z.array(z.enum(["title", "subtitle", "ctaExplore", "ctaApply"])).max(4).default([]);
const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("global"), patch, expected: z.record(z.string(), z.string().nullable()) }).strict(),
  z.object({ kind: z.literal("copy"), section: z.string(), patch, expectedUpdatedAt: z.string().nullable() }).strict(),
  z.object({ kind: z.literal("slide"), id: z.string().uuid(), patch, inherit, expectedUpdatedAt: z.string(), visible: z.boolean(), order: z.number().int().min(0).max(10000) }).strict(),
  z.object({ kind: z.literal("builtin"), index: z.number().int().min(0).max(DEFAULT_HERO_SLIDES.length - 1), patch, inherit, visible: z.boolean() }).strict(),
]);
export type HomepageSaveInput = z.input<typeof schema>;
export type HomepageSaveResult = { ok: true; snapshot: HomepageSnapshot } | { ok: false; error: string };

export async function saveHomepageEditor(input: unknown): Promise<HomepageSaveResult> {
  try {
    await assertAdminScope("content");
    const user = await requireAdminUser();
    const parsed = schema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Check the fields and try again." };
    const value = parsed.data;
    const section = value.kind === "copy" ? HOME_SECTIONS.find(section => section.id === value.section && section.id !== "hero") : undefined;
    if (value.kind === "copy" && !section) return { ok: false, error: "This section cannot be changed here." };
    const permission = value.kind === "copy" ? section!.permission : value.kind === "global" ? "home.edit" : "home.hero_slider.edit";
    if (!(await hasAdminPermission(user, permission))) return { ok: false, error: "You do not have permission to save this content." };
    if (value.kind === "builtin" && !(await hasAdminPermission(user, "home.hero_slider.create"))) return { ok: false, error: "Creating editable slides requires the existing create-slide permission." };
    const error = value.kind === "global" || value.kind === "copy" ? validateCopyPatch(value.kind === "global" ? "hero" : section!.id, value.patch) : validateSlidePatch(value.patch, process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (error) return { ok: false, error };
    const before = await readHomepageSnapshot();
    if (!before.available) return { ok: false, error: "Saved content could not be loaded. No changes were made." };
    if (value.kind === "global") {
      if (!Object.keys(value.patch).length) return { ok: false, error: "There are no changes to save." };
      const updates = Object.entries(value.patch).map(([field, text]) => {
        const key = HERO_SITE_KEYS[field as keyof typeof HERO_SITE_KEYS];
        if (!(field in value.expected) || (before.site[key] ?? null) !== value.expected[field]) throw new Error("Homepage copy changed in another session. Reload before saving.");
        return { key, value: text };
      });
      await saveSiteContent(updates);
    } else if (value.kind === "copy") {
      if (!Object.keys(value.patch).length) return { ok: false, error: "There are no changes to save." };
      const id = section!.id as CopySection, current = sectionBlock(before.blocks, id);
      if ((current?.updated_at ?? null) !== value.expectedUpdatedAt) return { ok: false, error: "This section changed in another session. Reload before saving." };
      const content = { ...record(current?.content) };
      // The first explicit record preserves every value currently displayed, including legacy partial-copy defaults.
      const changes = !current || !current.is_active || id === "why_europe" && !hasEuropeCopy(record(current.content)) ? { ...valuesOf(resolveSection(before.blocks, id)), ...value.patch } : value.patch;
      for (const [key, text] of Object.entries(changes)) content[key] = mergeEnglish(content[key], text);
      const result = await upsertCmsBlock({ id: current?.id, expected_updated_at: current?.updated_at, page_slug: "home", section_key: id, block_key: "copy", block_type: "section_copy", is_active: true, sort_order: current?.sort_order ?? 0, content, media: record(current?.media), permission_key: section!.permission, revalidate_paths: ["/", "/admin/home"] });
      if (!result.ok) return result;
    } else {
      if (value.inherit.some(key => key in value.patch)) return { ok: false, error: "A slide field cannot override and inherit at the same time." };
      const current = value.kind === "slide" ? before.blocks.find(block => block.id === value.id && block.section_key === "hero_slider" && block.block_key === "slide") : undefined;
      if (value.kind === "slide" && (!current || current.updated_at !== value.expectedUpdatedAt)) return { ok: false, error: "This slide changed in another session. Reload before saving." };
      const fallback = value.kind === "builtin" ? DEFAULT_HERO_SLIDES[value.index] : null;
      const content = { ...record(current?.content) }, media = { ...record(current?.media) };
      for (const key of value.inherit) content[SLIDE_COPY_KEYS[key]] = mergeEnglish(content[SLIDE_COPY_KEYS[key]], "");
      for (const [key, text] of Object.entries(value.patch)) {
        if (key === "imageUrl" || key === "imageAlt") media[key] = text;
        else { const field = SLIDE_COPY_KEYS[key] ?? key; content[field] = mergeEnglish(content[field], text); }
      }
      if (value.kind === "builtin") {
        if (before.blocks.some(block => block.section_key === "hero_slider" && block.block_key === "slide")) return { ok: false, error: "Saved slides already exist. Reload to edit them instead." };
        const service = createSupabaseServiceClient();
        if (!service) return { ok: false, error: "Slide saving is unavailable." };
        // One atomic insert materializes the whole currently displayed carousel, never dropping the other fallback slides.
        const rows = DEFAULT_HERO_SLIDES.map((slide, index) => ({ page_slug: "home", section_key: "hero_slider", block_key: "slide", block_type: "hero_slide", is_active: index === value.index ? value.visible : true, sort_order: index, content: { line: slide.line, ...(index === value.index ? content : {}) }, media: { imageUrl: slide.src, imageAlt: slide.alt, ...(index === value.index ? media : {}) } }));
        const { error: writeError } = await service.from("cms_content_blocks").insert(rows);
        if (writeError) return { ok: false, error: "Slides could not be saved. Reload before trying again; existing slides were not replaced." };
      } else {
        const result = await saveHomeHeroSlide({ id: value.id, expected_updated_at: value.expectedUpdatedAt, is_active: value.visible, sort_order: value.order, imageUrl: String(media.imageUrl ?? media.src ?? fallback?.src ?? ""), imageAlt: String(media.imageAlt ?? media.alt ?? ""), line: content.line as string, title: content.title as string, subtitle: content.subtitle as string, buttonText: content.buttonText as string, secondaryButtonText: content.secondaryButtonText as string });
        if (!result.ok) return result;
      }
    }
    revalidatePath("/"); revalidatePath("/admin/home");
    const snapshot = await readHomepageSnapshot();
    if (!snapshot.available) return { ok: false, error: "Saving may have completed, but confirmation is unavailable. Reload before retrying." };
    let verified = true;
    if (value.kind === "global") verified = Object.entries(value.patch).every(([key, text]) => snapshot.site[HERO_SITE_KEYS[key as keyof typeof HERO_SITE_KEYS]] === text);
    else if (value.kind === "copy") verified = Object.entries(value.patch).every(([key, text]) => resolveSection(snapshot.blocks, value.section as CopySection)[key]?.value === text);
    else {
      const row = snapshot.blocks.find(row => row.section_key === "hero_slider" && row.block_key === "slide" && (value.kind === "slide" ? row.id === value.id : row.sort_order === value.index));
      verified = Boolean(row && row.is_active === value.visible && (value.kind !== "slide" || row.sort_order === value.order) && Object.entries(value.patch).every(([key, text]) => key === "imageUrl" || key === "imageAlt" ? record(row.media)[key] === text : english(record(row.content)[SLIDE_COPY_KEYS[key] ?? key]) === text) && value.inherit.every(key => !english(record(row.content)[SLIDE_COPY_KEYS[key]])?.trim()));
    }
    if (!verified) return { ok: false, error: "Saving could not be confirmed. Reload the section before trying again." };
    return { ok: true, snapshot };
  } catch { return { ok: false, error: "Changes could not be saved. Reload the section and try again." }; }
}
