import { sourceCourseRows } from "@/lib/catalogue/model";
// Private, immutable representation of existing defaults. Never writes public rows.
import { randomUUID } from "node:crypto";
import {
  HERO_DEFAULTS,
  HERO_SITE_KEYS,
  DEFAULT_HERO_SLIDES,
  resolveSection,
  valuesOf,
  HOME_SECTIONS,
  type HomeBlock,
  type CopySection,
} from "@/lib/homepage/content";
import {
  COLLECTIONS,
  resolveCollection,
  presentationDefaults,
} from "@/lib/homepage/items";
import {
  canonical,
  rowsFor,
  type Payload,
  type Resource,
  type ContentRow,
} from "./model";
import type { HomepageReferences } from "@/lib/homepage/items";
export function effectiveBaseline(
  resource: Resource,
  base: Payload,
  template: Payload,
  references?: HomepageReferences,
): Payload {
  if (
    resource.type === "courses" &&
    !rowsFor(base, "language_courses").length
  ) {
    const row = rowsFor(template, "language_courses")[0],
      source = sourceCourseRows().find((r) => r.source_key === row?.source_key);
    if (source) {
      const { sourceDefault: _source, ...content } = source;
      void _source;
      return canonical({
        tables: { language_courses: [{ ...content, id: row.id }] },
      });
    }
  }
  if (
    resource.type !== "home" ||
    ["ticker", "testimonials"].includes(resource.key)
  )
    return base;
  const result: Payload = structuredClone(base),
    blocks = rowsFor(result, "cms_content_blocks"),
    templateBlocks = rowsFor(template, "cms_content_blocks");
  const insert = (
    section: string,
    key: string,
    content: ContentRow,
    media: ContentRow = {},
    order = 0,
  ) => {
    if (
      blocks.some(
        (row) =>
          row.section_key === section &&
          row.block_key === key &&
          row.sort_order === order,
      )
    )
      return;
    blocks.push({
      id:
        templateBlocks.find(
          (row) =>
            row.section_key === section &&
            row.block_key === key &&
            row.sort_order === order,
        )?.id ?? randomUUID(),
      page_slug: "home",
      section_key: section,
      block_key: key,
      block_type:
        key === "slide"
          ? "hero_slide"
          : key === "copy"
            ? "section_copy"
            : "homepage_collection",
      content,
      media,
      is_active: true,
      sort_order: order,
    });
  };
  if (resource.key === "hero")
    for (const [field, key] of Object.entries(HERO_SITE_KEYS)) {
      const rows = rowsFor(result, "site_content");
      if (!rows.some((row) => row.key === key))
        rows.push({
          key,
          value: HERO_DEFAULTS[field as keyof typeof HERO_DEFAULTS],
          page: "home",
          section: "hero",
          label: field,
        });
    }
  if (
    resource.key === "hero_slides" &&
    !blocks.some((row) => row.block_key === "slide")
  )
    for (const [index, slide] of DEFAULT_HERO_SLIDES.entries())
      insert(
        "hero_slider",
        "slide",
        { line: slide.line },
        { imageUrl: slide.src, imageAlt: slide.alt },
        index,
      );
  const definition = HOME_SECTIONS.find(
    (section) => section.id === resource.key,
  );
  if (definition && resource.key !== "hero") {
    const content = valuesOf(
      resolveSection(
        blocks as unknown as HomeBlock[],
        resource.key as CopySection,
      ),
    );
    insert(resource.key, "copy", content);
  }
  if (definition)
    insert(
      resource.key,
      "presentation",
      presentationDefaults(
        resource.key as Parameters<typeof presentationDefaults>[0],
      ),
    );
  for (const [collection, definition] of Object.entries(COLLECTIONS))
    if (
      resource.key === "why_stats"
        ? collection === "why_stats"
        : definition.section === resource.key && collection !== "why_stats"
    )
      insert(definition.section, "collection_" + collection, {
        items: resolveCollection(
          blocks as unknown as HomeBlock[],
          collection as Parameters<typeof resolveCollection>[1],
          references,
          references?.programs,
        ).items,
      });
  result.tables.cms_content_blocks = blocks;
  return canonical(result);
}
