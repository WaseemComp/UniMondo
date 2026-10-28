import { displayTitle } from "@/lib/catalogue/model";
import { isDeepStrictEqual } from "node:util";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient as realClient } from "@/lib/supabase/admin";
import {
  TABLE_FOR,
  canonical,
  belongs,
  isWorking,
  type Resource,
  type Payload,
  type ContentRow,
} from "./model";
import { workflowAccess } from "./access";
import { footerBaseline } from "@/lib/footer/server";
import { effectiveBaseline } from "./baseline";
import { loadHomepageReferences } from "@/lib/admin/homepage-catalogue";
import { workflowState, publishingService } from "./store";
type Session = {
  resource: Resource;
  client: SupabaseClient;
  tables: Map<string, ContentRow[]>;
  load: (table: string) => Promise<ContentRow[]>;
  isNew: boolean;
};
const runtime = globalThis as typeof globalThis & {
  __unimondoContentPlanner?: AsyncLocalStorage<Session>;
};
const local = (runtime.__unimondoContentPlanner ??=
  new AsyncLocalStorage<Session>());
export function isPlanning() {
  return Boolean(local.getStore());
}
export function plannedNewRecord() {
  return local.getStore()?.isNew ?? false;
}
export function plannedRecordId() {
  const context = local.getStore();
  return context && context.resource.type !== "home"
    ? context.resource.key
    : undefined;
}
export function createContentServiceClient() {
  return local.getStore()?.client ?? realClient();
}
export function revalidateContentPath(
  ...args: Parameters<typeof revalidatePath>
) {
  if (!isPlanning()) revalidatePath(...args);
}
const keyFor = (table: string) => (table === "site_content" ? "key" : "id");
function matches(row: ContentRow, query: URLSearchParams) {
  return [...query].every(([key, value]) => {
    if (
      ["select", "order", "limit", "offset", "on_conflict", "columns"].includes(
        key,
      )
    )
      return true;
    if (value.startsWith("eq.")) return String(row[key]) === value.slice(3);
    if (value === "is.null") return row[key] == null;
    if (value.startsWith("like.")) {
      const pattern = value
        .slice(5)
        .split("%")
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*");
      return new RegExp(`^${pattern}$`).test(String(row[key] ?? ""));
    }
    throw new Error("Unsupported private draft filter");
  });
}
export async function planDraft<T extends { ok: boolean; error?: string }>(
  resource: Resource,
  action: () => Promise<T>,
  expectedVersion?: number,
): Promise<T> {
  const access = await workflowAccess(resource);
  if (!access.permissions.edit)
    throw new Error("You do not have permission to edit this content.");
  const view = await workflowState(resource);
  if (!view.ready) throw new Error(view.error);
  if (view.document && ["in_review", "approved"].includes(view.document.status))
    throw new Error(
      "This version is locked for review. Return it to Draft before editing.",
    );
  if (
    expectedVersion !== undefined &&
    expectedVersion !== (view.document?.version ?? 0)
  )
    throw new Error(
      "This draft changed in another session. Reload before saving.",
    );
  const projected = isWorking(view.document)
      ? view.document!.proposed
      : view.published,
    version = (view.document?.version ?? 0) + 1;
  const tables = new Map<string, ContentRow[]>(),
    service = publishingService();
  const load = async (table: string) => {
    if (tables.has(table)) return tables.get(table)!;
    if (
      ![
        "site_content",
        "cms_content_blocks",
        "success_stories",
        "countries",
        "featured_universities",
        "programs",
        "region_groups",
        "news_ticker_items",
        "site_settings",
        "language_courses",
        "packages",
        "add_ons",
      ].includes(table)
    )
      throw new Error("This table is outside content drafting.");
    const rows: ContentRow[] = [];
    for (let offset = 0; offset < 20000; offset += 1000) {
      let query = service
        .from(table)
        .select("*")
        .range(offset, offset + 999);
      if (table === "site_content") query = query.like("key", "home.%");
      if (table === "cms_content_blocks") query = query.eq("page_slug", "home");
      const result = await query;
      if (result.error)
        throw new Error(
          "Published content is unavailable. No draft was saved.",
        );
      rows.push(...(result.data ?? []));
      if ((result.data?.length ?? 0) < 1000) break;
      if (offset === 19000)
        throw new Error("The content exceeds the safe drafting limit.");
    }
    const overlaid = rows.filter((row) => !belongs(resource, table, row));
    overlaid.push(
      ...(projected.tables[table] ?? []).map((row) => ({
        ...row,
        updated_at: isWorking(view.document)
          ? `draft:${view.document!.version}`
          : (rows.find((old) => old[keyFor(table)] === row[keyFor(table)])
              ?.updated_at ?? ""),
      })),
    );
    tables.set(table, overlaid);
    return overlaid;
  };
  const transport: typeof fetch = async (input, options = {}) => {
    const url = new URL(String(input)),
      table = url.pathname.split("/").at(-1)!,
      method = options.method ?? "GET",
      rows = await load(table),
      query = url.searchParams;
    let result = rows.filter((row) => matches(row, query));
    if (method === "GET" || method === "HEAD") {
      if (query.has("order")) {
        const orders = query.get("order")!.split(",");
        result = [...result].sort((a, b) => {
          for (const spec of orders) {
            const [key, direction] = spec.split(".");
            const delta =
              a[key] === b[key]
                ? 0
                : String(a[key] ?? "") < String(b[key] ?? "")
                  ? -1
                  : 1;
            if (delta) return delta * (direction === "desc" ? -1 : 1);
          }
          return 0;
        });
      }
      const total = result.length;
      result = result.slice(
        Number(query.get("offset") ?? 0),
        Number(query.get("offset") ?? 0) + Number(query.get("limit") ?? total),
      );
      if (method === "HEAD")
        return new Response(null, {
          status: 200,
          headers: { "content-range": `0-0/${total}` },
        });
    } else if (["POST", "PATCH", "DELETE"].includes(method)) {
      const parsed =
          method === "DELETE" ? {} : JSON.parse(String(options.body)),
        values = Array.isArray(parsed) ? parsed : [parsed],
        pk = keyFor(table);
      const changed: ContentRow[] = [];
      if (method === "POST")
        for (const value of values) {
          const existing = rows.find((row) => row[pk] === value[pk]);
          if (
            existing &&
            !(new Headers(options.headers).get("prefer") ?? "").includes(
              "resolution=merge-duplicates",
            )
          )
            throw new Error("Duplicate draft record");
          const next = {
            ...existing,
            ...value,
            ...(pk === "id" && !value.id ? { id: randomUUID() } : {}),
            updated_at: `draft:${version}`,
          };
          if (!belongs(resource, table, next))
            throw new Error("Cross-document draft write refused");
          if (existing) Object.assign(existing, next);
          else rows.push(next);
          changed.push(next);
        }
      else
        for (const row of result) {
          if (!belongs(resource, table, row))
            throw new Error("Cross-document draft write refused");
          const next = {
            ...row,
            ...(method === "DELETE"
              ? table === "cms_content_blocks"
                ? { is_active: false }
                : { is_published: false }
              : values[0]),
            updated_at: `draft:${version}`,
          };
          if (!belongs(resource, table, next))
            throw new Error(
              "Moving a record between draft documents is not allowed",
            );
          Object.assign(row, next);
          changed.push(row);
        }
      result = changed;
    } else throw new Error("Unsupported private draft operation");
    const single = (new Headers(options.headers).get("accept") ?? "").includes(
      "vnd.pgrst.object",
    );
    return new Response(JSON.stringify(single ? (result[0] ?? null) : result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const client = createClient(
    "https://private-content-planning.invalid",
    "synthetic-local-planner",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: "private-plan-" + randomUUID(),
      },
      global: { fetch: transport },
    },
  );
  return local.run(
    {
      resource,
      client,
      tables,
      load,
      isNew:
        resource.type !== "home" &&
        !view.published.tables[
          TABLE_FOR[resource.type as keyof typeof TABLE_FOR]
        ]?.length,
    },
    async () => {
      const result = await action();
      if (!result.ok) return result;
      const proposed: Payload = { tables: {} };
      for (const table of Object.keys(view.published.tables))
        proposed.tables[table] = (await load(table)).filter((row) =>
          belongs(resource, table, row),
        );
      const payload = canonical(proposed);
      const { validateProposed } = await import("./validation");
      await validateProposed(resource, payload, access.user, view.published);
      if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > 750000)
        throw new Error("This content draft is too large to save safely.");
      const row =
        resource.type !== "home" ? Object.values(payload.tables)[0]?.[0] : null;
      const saved = await service.rpc("cms_content_save_draft", {
        t: resource.type,
        k: resource.key,
        p_title: String(
          row?.name ??
            (row?.title ? displayTitle(row) : undefined) ??
            (resource.key === "footer" ? "Website footer" : resource.key),
        ),
        p_expected: view.document?.version ?? 0,
        p_base: view.published,
        p_proposed: payload,
        p_actor: access.user.id,
        p_label: access.label,
        p_initial_effective: !view.document
          ? resource.type === "home" && resource.key === "footer"
            ? await footerBaseline(view.published, payload)
            : effectiveBaseline(
                resource,
                view.published,
                payload,
                resource.type === "home"
                  ? await loadHomepageReferences(access.user)
                  : undefined,
              )
          : null,
      });
      if (saved.error || !saved.data)
        throw new Error(
          saved.error?.message ??
            "The private draft could not be confirmed. Reload before retrying.",
        );
      const confirmation = Array.isArray(saved.data)
        ? saved.data[0]
        : saved.data;
      if (
        Number(confirmation.version) !== version ||
        !isDeepStrictEqual(confirmation.proposed, payload)
      )
        throw new Error(
          "The private draft may have saved, but confirmation is unavailable. Reload before retrying.",
        );
      return result;
    },
  );
}
