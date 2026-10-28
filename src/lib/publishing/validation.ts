import { HERO_PRESENTATION_KEYS } from "@/lib/homepage/hero-presentation";
import { footerSchema } from "@/lib/footer/model";
import { slugifyCountryName } from "@/lib/destinations-utils";
import { academicDraft } from "@/lib/academic/draft";
import {
  countryValues,
  universityValues,
  programmeValues,
  object,
  text,
  type AcademicRow,
} from "@/lib/academic/model";
import {
  safeDestination,
  validateSlidePatch,
  validateCopyPatch,
} from "@/lib/homepage/validation";
import {
  validateItems,
  validatePresentation,
} from "@/lib/homepage/item-validation";
import {
  HOME_SECTIONS,
  english,
  record,
  type CopySection,
  type SectionId,
} from "@/lib/homepage/content";
import { getMediaAccess } from "@/lib/media/access";
import { validateManagedMediaSelection } from "@/lib/media/operations";
import { loadHomepageReferences } from "@/lib/admin/homepage-catalogue";
import { belongs, rowsFor, type Resource, type Payload } from "./model";
import { publishingService } from "./store";
export async function validateProposed(
  resource: Resource,
  payload: Payload,
  user: { id: string; email?: string | null },
  base: Payload,
  operation: "edit" | "review" | "publish" = "edit",
) {
  if (
    !payload?.tables ||
    new TextEncoder().encode(JSON.stringify(payload)).byteLength > 750000
  )
    throw new Error("Invalid content draft.");
  for (const [table, rows] of Object.entries(payload.tables))
    for (const row of rows)
      if (!belongs(resource, table, row))
        throw new Error("Cross-document changes are not allowed.");
  if (["regions", "courses", "packages", "addons"].includes(resource.type)) {
    const { validateExtendedContent } =
      await import("@/lib/catalogue/validation");
    await validateExtendedContent(resource, payload, user, base, operation);
    return;
  }
  if (resource.type === "home" && resource.key === "footer") {
    const rows = rowsFor(payload, "cms_content_blocks"),
      configurations = rows.filter((row) => row.block_key === "configuration");
    if (
      configurations.length !== 1 ||
      rows.some((row) => row.block_key !== "configuration")
    )
      throw new Error("Choose one valid footer configuration.");
    footerSchema.parse(
      (configurations[0].content as { footer?: unknown })?.footer,
    );
  }
  const service = publishingService();
  if (["countries", "universities", "programmes"].includes(resource.type)) {
    const table =
        resource.type === "universities"
          ? "featured_universities"
          : resource.type === "programmes"
            ? "programs"
            : "countries",
      row = rowsFor(payload, table)[0];
    if (!row || rowsFor(payload, table).length !== 1)
      throw new Error("Choose one catalogue record.");
    const draft = academicDraft(
        resource.type as "countries" | "universities" | "programmes",
        row as AcademicRow,
      ),
      schema =
        resource.type === "countries"
          ? countryValues
          : resource.type === "universities"
            ? universityValues
            : programmeValues;
    const parsed = schema.safeParse(draft);
    if (!parsed.success)
      throw new Error(
        parsed.error.issues[0]?.message ?? "Check the content fields.",
      );
    const prior = rowsFor(base, table)[0];
    if (resource.type === "programmes") {
      const { validateProgrammeCurrency } =
        await import("@/lib/currencies/programme");
      await validateProgrammeCurrency(
        record(row.details),
        prior ? record(prior.details) : undefined,
        true,
      );
    }
    if (resource.type === "countries" && prior) {
      if (
        row.slug !== (text(prior.slug) || slugifyCountryName(text(prior.name)))
      )
        throw new Error("The existing public URL must be retained.");
      if (row.name !== prior.name) {
        const uni = await service
            .from("featured_universities")
            .select("id", { count: "exact", head: true })
            .eq("country", prior.name),
          programs = await service
            .from("programs")
            .select("id", { count: "exact", head: true })
            .eq("country", prior.name),
          selections = await service
            .from("cms_content_blocks")
            .select("content")
            .eq("page_slug", "home")
            .eq("section_key", "destinations");
        if (
          uni.error ||
          programs.error ||
          selections.error ||
          uni.count ||
          programs.count ||
          (selections.data ?? []).some(
            (block) =>
              Array.isArray(record(block.content).items) &&
              (record(block.content).items as Record<string, unknown>[]).some(
                (item) => item.reference === prior.name,
              ),
          )
        )
          throw new Error(
            "This destination name is used by existing records or homepage selections.",
          );
      }
    }
    if (
      resource.type === "universities" &&
      prior &&
      (row.name !== prior.name || row.country !== prior.country)
    ) {
      const children = await service
        .from("programs")
        .select("id", { count: "exact", head: true })
        .eq("university", prior.name)
        .eq("country", prior.country);
      if (children.error || children.count)
        throw new Error(
          "The university’s name/country is used by existing programmes.",
        );
    }
    if (resource.type === "universities" && row.country_id) {
      const parent = await service
        .from("countries")
        .select("id,name,is_published,archived_at")
        .eq("id", row.country_id)
        .single();
      if (parent.error || !parent.data || parent.data.name !== row.country)
        throw new Error("The university’s country changed. Update the draft.");
      if (
        row.is_published &&
        (parent.data.is_published === false || parent.data.archived_at)
      )
        throw new Error("Publish the parent destination first.");
    }
    if (resource.type === "programmes") {
      const details = object(row.details);
      if (
        details.verification === "verified" &&
        (!details.official_url ||
          !details.verified_on ||
          String(details.verified_on) > new Date().toISOString().slice(0, 10))
      )
        throw new Error(
          "Verified information needs an official source and valid verification date.",
        );
      if (
        details.opens_on &&
        row.deadline &&
        String(details.opens_on) > String(row.deadline)
      )
        throw new Error("Application dates are out of order.");
      if (row.university_id) {
        const parent = await service
          .from("featured_universities")
          .select("id,name,country,is_published,archived_at")
          .eq("id", row.university_id)
          .single();
        if (
          parent.error ||
          !parent.data ||
          parent.data.name !== row.university ||
          parent.data.country !== row.country
        )
          throw new Error("The parent university changed. Update the draft.");
        if (
          row.is_published &&
          (parent.data.is_published === false || parent.data.archived_at)
        )
          throw new Error("Publish the parent university first.");
      }
      if (row.is_published) {
        const parent = await service
          .from("countries")
          .select("id,is_published,archived_at")
          .eq("name", row.country)
          .maybeSingle();
        if (
          parent.error ||
          (parent.data &&
            (parent.data.archived_at || parent.data.is_published === false))
        )
          throw new Error("Publish the parent destination first.");
      }
    }
  } else {
    const references = await loadHomepageReferences(user);
    const positions = new Set<string>();
    for (const block of rowsFor(payload, "cms_content_blocks")) {
      const position =
        String(block.section_key) +
        ":" +
        String(block.block_key) +
        ":" +
        String(block.sort_order);
      if (positions.has(position))
        throw new Error(
          "Each slide or section record needs a distinct display position.",
        );
      positions.add(position);

      const old = rowsFor(base, "cms_content_blocks").find(
          (row) => row.id === block.id,
        ),
        content = record(block.content),
        previous = record(old?.content);
      if (block.block_key === "copy") {
        const section = HOME_SECTIONS.find(
          (section) => section.id === block.section_key,
        );
        if (!section) throw new Error("Unknown homepage section.");
        const patch = Object.fromEntries(
          section.fields
            .filter(
              (field) =>
                english(content[field.key]) !== english(previous[field.key]),
            )
            .map((field) => [field.key, english(content[field.key]) ?? ""]),
        );
        const error = validateCopyPatch(section.id as CopySection, patch);
        if (error) throw new Error(error);
      }
      if (String(block.block_key).startsWith("collection_")) {
        const collection = String(block.block_key).slice(11) as Parameters<
          typeof validateItems
        >[0];
        const error = validateItems(
          collection,
          content.items as Parameters<typeof validateItems>[1],
          references,
          Array.isArray(previous.items) ? previous.items : [],
        );
        if (error) throw new Error(error);
      }
      if (block.block_key === "presentation") {
        const error = validatePresentation(
          block.section_key as SectionId,
          content as Record<string, string | boolean>,
        );
        if (error) throw new Error(error);
      }
      if (block.section_key === "hero_slider") {
        const media = record(block.media),
          oldMedia = record(old?.media);
        const patch: Record<string, string> = {};
        for (const key of HERO_PRESENTATION_KEYS) {
          if (english(content[key]) !== undefined)
            patch[key] = english(content[key])!;
        }
        for (const key of ["imageUrl", "imageAlt"])
          if (media[key] !== oldMedia[key])
            patch[key] = String(media[key] ?? "");
        for (const [source, target] of Object.entries({
          title: "title",
          subtitle: "subtitle",
          buttonText: "ctaExplore",
          secondaryButtonText: "ctaApply",
          line: "line",
          eyebrow: "eyebrow",
          primaryHref: "primaryHref",
          secondaryHref: "secondaryHref",
        }))
          if (
            english(content[source])?.trim() &&
            english(content[source]) !== english(previous[source])
          )
            patch[target] = english(content[source])!;
        const error = validateSlidePatch(
          patch,
          process.env.NEXT_PUBLIC_SUPABASE_URL,
        );
        if (error) throw new Error(error);
      }
    }
    for (const row of rowsFor(payload, "success_stories"))
      if (
        !text(row.full_name).trim() ||
        !text(row.testimonial).trim() ||
        !text(row.profile_image_url)
      )
        throw new Error(
          "Testimonials need an approved public name, text and image.",
        );
    for (const row of rowsFor(payload, "news_ticker_items"))
      if (
        !text(row.message).trim() ||
        (row.href && !safeDestination(String(row.href)))
      )
        throw new Error("Check the announcement text and destination.");
  }
  // Retained historical URLs are allowed. Every new/managed selection is rechecked
  // at submission, approval and publication; drafts/revisions themselves protect media usage.
  const oldImages = new Set<string>();
  const walk = (value: unknown, key: string, visit: (url: string) => void) => {
    if (
      typeof value === "string" &&
      /^(?:logoUrl|imageUrl|hero_image_url|logo_url|profile_image_url|image_url|imageSrc|src|background_image_url)$/i.test(
        key.split(".").at(-1) ?? "",
      ) &&
      value
    )
      visit(value);
    else if (Array.isArray(value))
      value.forEach((item) => walk(item, key, visit));
    else if (value && typeof value === "object")
      for (const [child, item] of Object.entries(value))
        walk(item, key + "." + child, visit);
  };
  walk(base, "", (url) => oldImages.add(url));
  const images = new Set<string>();
  walk(payload, "", (url) => {
    if (!oldImages.has(url) || url.includes("/cms-library/")) images.add(url);
  });
  const media = await getMediaAccess(user);
  for (const image of images) {
    if (!safeDestination(image))
      throw new Error("An image reference is invalid.");
    await validateManagedMediaSelection(image, media);
  }
}
