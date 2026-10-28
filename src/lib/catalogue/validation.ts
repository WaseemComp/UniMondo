import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { readCurrencies } from "@/lib/currencies/server";
import { validatePriceCurrency } from "@/lib/currencies/model";
import { validatePriceRow, PRICE_TABLES, type PriceKind } from "./model";
import {
  cleanRow,
  rowsFor,
  type Resource,
  type Payload,
} from "@/lib/publishing/model";
const without = (row: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(
    Object.entries(cleanRow(row)).filter(([key]) => !keys.includes(key)),
  );
export async function validateExtendedContent(
  resource: Resource,
  payload: Payload,
  user: { id: string; email?: string | null },
  base: Payload,
  operation: "edit" | "review" | "publish" = "edit",
) {
  const requireGrant = async (key: string) => {
    // Reviewers validate content; publishers retain publish/archive boundaries without gaining editing rights.
    if (
      operation === "review" ||
      (operation === "publish" && /\.(create|edit)$/.test(key))
    )
      return;
    if (!(await hasAdminPermission(user, key)))
      throw new Error(
        "This change requires " + key.split(".").join(" ") + " permission.",
      );
  };
  if (resource.type === "regions") {
    const regions = rowsFor(payload, "region_groups"),
      countries = rowsFor(payload, "countries"),
      labels = new Set<string>();
    for (const row of regions) {
      z.object({
        id: z.number().int().positive().max(32767),
        label: z.string().trim().min(1).max(200),
        continent: z.string().max(120),
        sort_order: z.number().int().min(0).max(32767),
        is_published: z.boolean(),
        archived_at: z.string().datetime().nullable(),
      }).parse(row);
      const label = String(row.label).trim().toLowerCase();
      if (labels.has(label)) throw new Error("Region names must be unique.");
      labels.add(label);
      const old = rowsFor(base, "region_groups").find((r) => r.id === row.id);
      if (!isDeepStrictEqual(old, cleanRow(row))) {
        await requireGrant("countries." + (old ? "edit" : "create"));
        if (row.archived_at && !old?.archived_at)
          await requireGrant("countries.delete");
        if (
          (old
            ? row.is_published !== old.is_published
            : row.is_published === true) &&
          !row.archived_at
        )
          await requireGrant("countries.publish");
      }
    }
    for (const row of countries) {
      const old = rowsFor(base, "countries").find((r) => r.id === row.id);
      if (
        !old ||
        !isDeepStrictEqual(
          without(row, ["region_group_id", "sort_order"]),
          without(old, ["region_group_id", "sort_order"]),
        )
      )
        throw new Error(
          "Region management must preserve every country and its content, identity and relationships.",
        );
      if (
        !(row.region_group_id == null && old.region_group_id == null) &&
        !regions.some((r) => r.id === row.region_group_id)
      )
        throw new Error("Assign each country to an existing region.");
      z.number().int().min(0).max(32767).parse(row.sort_order);
      if (!isDeepStrictEqual(cleanRow(row), old))
        await requireGrant("countries.edit");
    }
    for (const table of ["region_groups", "countries"])
      if (
        rowsFor(base, table).some(
          (old) => !rowsFor(payload, table).some((r) => r.id === old.id),
        )
      )
        throw new Error(
          "Existing regions and countries must be retained. Hide or archive them instead.",
        );
    return;
  }
  const kind = resource.type as PriceKind,
    table = PRICE_TABLES[kind],
    rows = rowsFor(payload, table),
    registry = await readCurrencies();
  if (!registry.ready)
    throw new Error(
      "The owner must install the currency migration before price editing.",
    );
  if (rows.length !== 1 || String(rows[0].id) !== resource.key)
    throw new Error("Choose one catalogue record.");
  const row = rows[0],
    old = rowsFor(base, table)[0],
    scope = kind === "courses" ? "courses" : "packages";
  validatePriceRow(kind, row);
  await requireGrant(scope + "." + (old ? "edit" : "create"));
  if (old && kind !== "courses" && old.slug !== row.slug)
    throw new Error(
      "Keep the existing package reference and application links.",
    );
  if (
    old &&
    kind === "courses" &&
    (old.source_key ?? null) !== (row.source_key ?? null)
  )
    throw new Error("The existing website course identity must be retained.");
  if (row.archived_at && !old?.archived_at)
    await requireGrant(scope + ".delete");
  const visible = kind === "courses" ? "is_active" : "is_published";
  if (
    (old
      ? row[visible] !== old[visible]
      : kind === "courses" && row.source_key
        ? row[visible] !== true
        : row[visible] === true) &&
    !row.archived_at
  )
    await requireGrant(scope + ".publish");
  validatePriceCurrency(row, old, registry.currencies, true, kind);
}
