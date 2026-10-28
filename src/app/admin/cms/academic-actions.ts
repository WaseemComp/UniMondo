"use server";
import { validateProgrammeCurrency } from "@/lib/currencies/programme";
import {
  planDraft,
  plannedNewRecord,
  plannedRecordId,
} from "@/lib/publishing/planning";
import { resourceSchema } from "@/lib/publishing/model";
import { slugifyCountryName } from "@/lib/destinations-utils";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { revalidateContentPath as revalidatePath } from "@/lib/publishing/planning";
import { academicAccess } from "@/lib/academic/server";
import {
  academicInput,
  countryValues,
  universityValues,
  programmeValues,
  object,
  text,
  TABLES,
  type AcademicRow,
} from "@/lib/academic/model";
import { createContentServiceClient as createSupabaseServiceClient } from "@/lib/publishing/planning";
import { safeDestination } from "@/lib/homepage/validation";
import { getMediaAccess } from "@/lib/media/access";
import { validateManagedMediaSelection } from "@/lib/media/operations";

type Result = { ok: true; row: AcademicRow } | { ok: false; error: string };
async function applysaveAcademicRecord(input: unknown): Promise<Result> {
  try {
    const parsed = academicInput.safeParse(input);
    if (!parsed.success)
      return {
        ok: false,
        error: "Check the submitted record and reload before retrying.",
      };
    const { kind, id, expectedUpdatedAt, operation } = parsed.data;
    const { user, permissions } = await academicAccess(),
      grant = permissions[kind];
    if (!grant.view)
      throw new Error("You do not have permission to view this catalogue.");
    const svc = createSupabaseServiceClient();
    if (!svc) throw new Error("The catalogue is unavailable.");
    let current: AcademicRow | null = null;
    if (id) {
      const { data, error } = await svc
        .from(TABLES[kind])
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data)
        throw new Error(
          "The existing record could not be loaded. Nothing was saved.",
        );
      current = data as AcademicRow;
      if (current.updated_at !== expectedUpdatedAt)
        throw new Error(
          "This record changed in another session. Reload before saving.",
        );
    } else if (expectedUpdatedAt !== null || operation !== "save")
      throw new Error("Reload this record before making changes.");
    let patch: Record<string, unknown>;
    if (operation !== "save") {
      if (!current || !grant.delete || !grant.edit)
        throw new Error(
          "You do not have permission to archive or restore this record.",
        );

      // No child records or files are changed. Public readers suppress descendants of hidden parents.
      patch = {
        archived_at: operation === "archive" ? new Date().toISOString() : null,
        is_published: false,
      };
    } else {
      if (!grant[plannedNewRecord() ? "create" : id ? "edit" : "create"])
        throw new Error("You do not have permission to save this record.");
      const schema =
        kind === "countries"
          ? countryValues
          : kind === "universities"
            ? universityValues
            : programmeValues;
      const values = schema.safeParse(parsed.data.values);
      if (!values.success)
        throw new Error(
          values.error.issues[0]?.message || "Check the record fields.",
        );
      patch = { ...values.data };
      if (kind === "programmes")
        await validateProgrammeCurrency(
          object(patch.details),
          current ? object(current.details) : undefined,
          parsed.data.currencyChangeConfirmed === true,
        );
      // Visibility is a private proposal. Actual publication requires existing publish grants and workflow approval.
      if (current?.archived_at && patch.is_published)
        throw new Error("Restore this record before publishing it.");
      // Preserve stable names used by existing textual application/selection references.
      if (current && kind !== "programmes" && patch.name !== current.name) {
        const deps = await svc
          .from(kind === "countries" ? "featured_universities" : "programs")
          .select("id", { count: "exact", head: true })
          .eq(
            kind === "countries" ? "country" : "university",
            text(current.name),
          );
        if (deps.error || deps.count)
          throw new Error(
            "This name is used by existing records. Keep it unchanged to preserve their references.",
          );
        if (kind === "countries") {
          const selections = await svc
            .from("cms_content_blocks")
            .select("content")
            .eq("page_slug", "home")
            .eq("section_key", "destinations");
          if (
            selections.error ||
            (selections.data ?? []).some((block) => {
              const items = object(block.content).items;
              return (
                Array.isArray(items) &&
                items.some((item) => object(item).reference === current.name)
              );
            })
          )
            throw new Error(
              "This country is selected on the homepage. Keep its name unchanged to preserve that selection.",
            );
          const programs = await svc
            .from("programs")
            .select("id", { count: "exact", head: true })
            .eq("country", text(current.name));
          if (programs.error || programs.count)
            throw new Error(
              "This destination name is used by existing programmes. Keep it unchanged.",
            );
        }
      }
      if (kind === "countries") {
        if (
          current &&
          !plannedNewRecord() &&
          patch.slug !==
            (text(current.slug) || slugifyCountryName(text(current.name)))
        )
          throw new Error("The existing public address must be preserved.");
        const guide = object(patch.destination_guide),
          oldGuide = object(current?.destination_guide);
        patch.destination_guide = {
          ...oldGuide,
          ...guide,
          overview: { ...object(oldGuide.overview), ...object(guide.overview) },
          costs: { ...object(oldGuide.costs), ...object(guide.costs) },
          visa: { ...object(oldGuide.visa), ...object(guide.visa) },
        };
        patch.catalogue = {
          ...object(current?.catalogue),
          ...object(patch.catalogue),
        };
        patch.why_study_there = patch.why_study;
        patch.living_cost_approx = patch.living_cost;
        patch.popular_universities = patch.popular_unis;
        const region = await svc
          .from("region_groups")
          .select("id")
          .eq("id", patch.region_group_id)
          .single();
        if (region.error || !region.data)
          throw new Error("Choose an existing destination region.");
      } else if (kind === "universities") {
        patch.profile = {
          ...object(current?.profile),
          ...object(patch.profile),
        };
        if (patch.country_id) {
          if (!permissions.countries.view)
            throw new Error(
              "Destination view access is required to select a country.",
            );
          const parent = await svc
            .from("countries")
            .select("*")
            .eq("id", patch.country_id)
            .single();
          if (parent.error || !parent.data)
            throw new Error("Choose an existing country.");
          if (current && parent.data.name !== current.country) {
            const children = await svc
              .from("programs")
              .select("id", { head: true, count: "exact" })
              .eq("university", text(current.name))
              .eq("country", text(current.country));
            if (children.error || children.count)
              throw new Error(
                "This university has existing programmes. Its country must stay unchanged to preserve those relationships.",
              );
          }
          patch.country = parent.data.name;
          if (
            patch.is_published &&
            (parent.data.archived_at || parent.data.is_published === false)
          )
            throw new Error(
              "Publish the destination before publishing this university.",
            );
        } else if (!current || current.country_id)
          throw new Error(
            "Choose the university’s existing destination record.",
          );
        else patch.country = current.country;
      } else {
        patch.details = {
          ...object(current?.details),
          ...object(patch.details),
        };
        if (patch.university_id) {
          if (!permissions.universities.view)
            throw new Error("University view access is required.");
          const parent = await svc
            .from("featured_universities")
            .select("*")
            .eq("id", patch.university_id)
            .single();
          if (parent.error || !parent.data)
            throw new Error("Choose an existing university.");
          patch.university = parent.data.name;
          patch.country = parent.data.country;
          if (patch.is_published) {
            const destination = await svc
              .from("countries")
              .select("*")
              .eq("name", text(parent.data.country))
              .maybeSingle();
            if (
              destination.error ||
              (destination.data &&
                (destination.data.archived_at ||
                  destination.data.is_published === false))
            )
              throw new Error(
                "Publish the destination before publishing this programme.",
              );
          }
          if (
            patch.is_published &&
            (parent.data.archived_at || parent.data.is_published === false)
          )
            throw new Error(
              "Publish the university before publishing this programme.",
            );
        } else if (!current || current.university_id)
          throw new Error("Choose the programme’s existing university record.");
        else {
          patch.university = current.university;
          patch.country = current.country;
        }
        const details = object(patch.details);
        if (
          details.opens_on &&
          patch.deadline &&
          String(details.opens_on) > String(patch.deadline)
        )
          throw new Error(
            "The opening date must not be after the closing date.",
          );
        if (
          details.verified_on &&
          String(details.verified_on) > new Date().toISOString().slice(0, 10)
        )
          throw new Error(
            "The last verification date cannot be in the future.",
          );
        if (
          details.verification === "verified" &&
          (!details.official_url || !details.verified_on)
        )
          throw new Error(
            "Officially verified information needs an official source and last verification date.",
          );
        patch.deadline = patch.deadline || null;
      }
      const images =
        kind === "countries"
          ? [
              [
                text(object(patch.catalogue).image_url),
                text(object(current?.catalogue).image_url),
              ],
            ]
          : [
              ...[
                "logo_url",
                ...(kind === "universities" ? ["hero_image_url"] : []),
              ].map((key) => [text(patch[key]), text(current?.[key])]),
            ];
      for (const [image, old] of images)
        if (image && image !== old) {
          if (!safeDestination(image) || image.startsWith("#"))
            throw new Error("Choose a valid website image.");
          await validateManagedMediaSelection(
            image,
            await getMediaAccess(user),
          );
        }
    }
    const newId = id ?? plannedRecordId() ?? randomUUID();
    const query = current
      ? svc
          .from(TABLES[kind])
          .update(patch)
          .eq("id", newId)
          .eq("updated_at", expectedUpdatedAt!)
      : svc.from(TABLES[kind]).insert({ id: newId, ...patch });
    const saved = await query.select("*").single();
    if (saved.error && ["23505", "P0001"].includes(saved.error.code))
      throw new Error(
        "This name already exists. Open the existing record rather than creating a duplicate.",
      );
    if (saved.error || !saved.data)
      throw new Error(
        "Save could not be confirmed. Reload before retrying; another session may have changed this record.",
      );
    const confirmed = await svc
      .from(TABLES[kind])
      .select("*")
      .eq("id", newId)
      .single();
    if (
      confirmed.error ||
      !confirmed.data ||
      !Object.entries(patch).every(([key, value]) =>
        key === "archived_at" && value !== null
          ? Date.parse(String(confirmed.data[key])) ===
            Date.parse(String(value))
          : isDeepStrictEqual(confirmed.data[key], value),
      )
    )
      throw new Error(
        "The save needs confirmation. Reload this record before retrying.",
      );
    for (const path of [
      "/",
      "/destinations",
      "/programs",
      "/admin/home",
      "/admin/destinations",
      "/admin/destinations/countries",
      "/admin/featured-universities",
      "/admin/universities",
      "/admin/programs",
      "/admin/dashboard",
    ])
      revalidatePath(path);
    revalidatePath("/destinations/[countrySlug]", "page");
    return { ok: true, row: confirmed.data as AcademicRow };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "The record could not be saved.",
    };
  }
}

export async function saveAcademicRecord(input: unknown): Promise<Result> {
  try {
    const v = input as Record<string, unknown>;
    const { workflowKey, ...clean } = v ?? {};
    const resource = {
      type: v?.kind as "countries" | "universities" | "programmes",
      key: String(v?.id ?? workflowKey ?? randomUUID()),
    };
    const parsed = resourceSchema.parse(resource);
    return await planDraft(parsed, () => applysaveAcademicRecord(clean));
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Draft could not be saved.",
    };
  }
}
