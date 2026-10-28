"use server";
import { z } from "zod";
import { requireAdminUser } from "@/app/admin/require-admin";
import { getAdminAccess } from "@/lib/auth/admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import {
  createContentServiceClient,
  planDraft,
  plannedNewRecord,
} from "@/lib/publishing/planning";
import { workflowState } from "@/lib/publishing/store";
import { isWorking, rowsFor } from "@/lib/publishing/model";
import {
  PRICE_TABLES,
  type PriceKind,
  sourceCourseRows,
} from "@/lib/catalogue/model";
import { readCurrencies } from "@/lib/currencies/server";
import { validatePriceCurrency } from "@/lib/currencies/model";
import { english, record } from "@/lib/homepage/content";
export async function catalogueAccess(
  scope: "countries" | "courses" | "packages",
) {
  const user = await requireAdminUser(),
    context = await getAdminAccess(user);
  if (!context.isSuper && context.permissions.academic === false)
    throw new Error("Academic catalogue access is not allowed.");
  const grants = Object.fromEntries(
    await Promise.all(
      ["view", "create", "edit", "delete", "publish"].map(async (key) => [
        key,
        await hasAdminPermission(user, scope + "." + key),
      ]),
    ),
  );
  if (!grants.view)
    throw new Error("You do not have permission to view this catalogue.");
  return { user, grants };
}
export async function readPriceCatalogue(kind: PriceKind) {
  const parsed = z.enum(["courses", "packages", "addons"]).parse(kind),
    { grants } = await catalogueAccess(
      parsed === "courses" ? "courses" : "packages",
    ),
    svc = createSupabaseServiceClient();
  if (!svc) throw new Error("Catalogue storage is unavailable.");
  const result = await svc
    .from(PRICE_TABLES[parsed])
    .select("*")
    .order("created_at", { ascending: false });
  if (result.error)
    throw new Error(
      "The existing catalogue could not be loaded. No records were replaced or created.",
    );
  return {
    rows: result.data as Record<string, unknown>[],
    grants,
    ...(await readCurrencies()),
    defaults: parsed === "courses" ? sourceCourseRows() : [],
  };
}
const inputSchema = z
  .object({
    kind: z.enum(["courses", "packages", "addons"]),
    id: z.string().uuid(),
    version: z.number().int().min(0),
    values: z.record(z.string(), z.unknown()),
    archive: z.boolean().default(false),
    currencyChangeConfirmed: z.boolean().default(false),
  })
  .strict();
export async function savePriceDraft(input: unknown) {
  try {
    const v = inputSchema.parse(input),
      { grants } = await catalogueAccess(
        v.kind === "courses" ? "courses" : "packages",
      );
    const resource = { type: v.kind, key: v.id };
    return await planDraft(
      resource,
      async () => {
        const svc = createContentServiceClient();
        if (!svc) throw new Error("Catalogue is unavailable.");
        const found = await svc
          .from(PRICE_TABLES[v.kind])
          .select("*")
          .eq("id", v.id)
          .maybeSingle();
        if (found.error) throw new Error("Existing draft could not be read.");
        const old = found.data as Record<string, unknown> | null;
        if (
          !(plannedNewRecord() ? grants.create : grants.edit) ||
          (v.archive && !grants.delete)
        )
          throw new Error("This catalogue action is not allowed.");
        const keys =
          v.kind === "courses"
            ? [
                "title",
                "description",
                "country",
                "city",
                "duration",
                "price",
                "currency_code",
                "source_key",
                "is_active",
                "sort_order",
              ]
            : [
                "name",
                "slug",
                ...(v.kind === "packages" ? ["teaser"] : []),
                "description",
                "best_for",
                ...(v.kind === "packages" ? ["features"] : []),
                "price_full",
                "price_installment",
                "currency_code",
                "is_published",
                "sort_order",
              ];
        if (Object.keys(v.values).some((key) => !keys.includes(key)))
          throw new Error("An unsupported catalogue field was submitted.");
        const row: Record<string, unknown> = {
          ...old,
          id: v.id,
          archived_at: old?.archived_at ?? null,
          ...v.values,
        };
        if (v.kind === "courses")
          for (const key of ["title", "description"]) {
            const value = v.values[key];
            row[key] =
              value === undefined
                ? old?.[key]
                : {
                    ...record(old?.[key]),
                    en:
                      typeof value === "string" ? value : english(value) || "",
                  };
          }
        if (v.archive) {
          row.archived_at = new Date().toISOString();
          row[v.kind === "courses" ? "is_active" : "is_published"] = false;
        }
        const registry = await readCurrencies();
        if (!registry.ready)
          throw new Error(
            "Currency setup must be installed before editing prices.",
          );
        validatePriceCurrency(
          row,
          old ?? undefined,
          registry.currencies,
          v.currencyChangeConfirmed,
          v.kind,
        );
        const saved = await svc
          .from(PRICE_TABLES[v.kind])
          .upsert(row, { onConflict: "id" });
        if (saved.error) throw new Error(saved.error.message);
        return { ok: true as const };
      },
      v.version,
    );
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Draft could not be saved.",
    };
  }
}
export async function readPriceDraft(kind: PriceKind, id: string) {
  z.enum(["courses", "packages", "addons"]).parse(kind);
  z.string().uuid().parse(id);
  const view = await workflowState({ type: kind, key: id });
  return {
    view,
    row: rowsFor(
      isWorking(view.document) ? view.document!.proposed : view.published,
      PRICE_TABLES[kind],
    )[0],
  };
}
