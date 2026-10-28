"use server";
import { z } from "zod";
import { catalogueAccess } from "./catalogue-actions";
import {
  planDraft,
  createContentServiceClient,
} from "@/lib/publishing/planning";
import { workflowState } from "@/lib/publishing/store";
import { rowsFor, isWorking } from "@/lib/publishing/model";
export async function readRegions() {
  await catalogueAccess("countries");
  return workflowState({ type: "regions", key: "catalogue" });
}
export async function saveRegionsDraft(input: unknown) {
  try {
    const v = z
      .object({
        version: z.number().int().min(0),
        regions: z.array(
          z.object({
            id: z.number().int().positive().max(32767),
            label: z.string().trim().min(1).max(200),
            continent: z.string().max(120),
            sort_order: z.number().int().min(0).max(32767),
            is_published: z.boolean(),
            archived_at: z.string().datetime().nullable(),
          }),
        ),
        countries: z.array(
          z.object({
            id: z.string().uuid(),
            region_group_id: z.number().int().positive().nullable(),
            sort_order: z.number().int().min(0).max(32767),
          }),
        ),
      })
      .strict()
      .parse(input);
    await catalogueAccess("countries");
    return await planDraft(
      { type: "regions", key: "catalogue" },
      async () => {
        const svc = createContentServiceClient();
        if (!svc) throw new Error("Region storage is unavailable.");
        for (const row of v.regions) {
          const result = await svc
            .from("region_groups")
            .upsert(row, { onConflict: "id" });
          if (result.error) throw new Error(result.error.message);
        }
        for (const row of v.countries) {
          const result = await svc
            .from("countries")
            .update({
              region_group_id: row.region_group_id,
              sort_order: row.sort_order,
            })
            .eq("id", row.id);
          if (result.error) throw new Error(result.error.message);
        }
        return { ok: true as const };
      },
      v.version,
    );
  } catch (e) {
    return {
      ok: false as const,
      error:
        e instanceof Error ? e.message : "Region draft could not be saved.",
    };
  }
}
// Backward-compatible entry points now use private drafts; no legacy direct writes/deletion.
export async function saveRegion(input: unknown) {
  const view = await readRegions();
  if (!view.ready)
    return { ok: false as const, error: view.error || "Region setup pending." };
  const payload = isWorking(view.document)
      ? view.document!.proposed
      : view.published,
    regions = rowsFor(payload, "region_groups"),
    v = z
      .object({
        id: z.number().optional(),
        label: z.string(),
        continent: z.string().default("Europe"),
        sort_order: z.number().default(0),
      })
      .parse(input),
    id = v.id ?? Math.max(0, ...regions.map((r) => Number(r.id))) + 1;
  return saveRegionsDraft({
    version: view.document?.version ?? 0,
    regions: [
      ...regions.filter((r) => r.id !== id),
      {
        ...regions.find((r) => r.id === id),
        ...v,
        id,
        is_published: true,
        archived_at: null,
      },
    ].map((r) => ({
      id: r.id,
      label: r.label,
      continent: r.continent ?? "Europe",
      sort_order: r.sort_order ?? 0,
      is_published: r.is_published !== false,
      archived_at: r.archived_at ?? null,
    })),
    countries: rowsFor(payload, "countries").map((r) => ({
      id: r.id,
      region_group_id: r.region_group_id ?? null,
      sort_order: r.sort_order ?? 0,
    })),
  });
}
export async function deleteRegion(id: number) {
  const view = await readRegions();
  if (!view.ready)
    return { ok: false as const, error: view.error || "Region setup pending." };
  const payload = isWorking(view.document)
    ? view.document!.proposed
    : view.published;
  return saveRegionsDraft({
    version: view.document?.version ?? 0,
    regions: rowsFor(payload, "region_groups").map((r) => ({
      id: r.id,
      label: r.label,
      continent: r.continent ?? "Europe",
      sort_order: r.sort_order ?? 0,
      is_published: r.id === id ? false : r.is_published !== false,
      archived_at:
        r.id === id ? new Date().toISOString() : (r.archived_at ?? null),
    })),
    countries: rowsFor(payload, "countries").map((r) => ({
      id: r.id,
      region_group_id: r.region_group_id ?? null,
      sort_order: r.sort_order ?? 0,
    })),
  });
}
