"use client";
import { useState, useTransition } from "react";
import { WorkflowPanel } from "@/components/admin/publishing/workflow-panel";
import { savePriceDraft } from "@/app/admin/cms/catalogue-actions";
import {
  PRICE_TABLES,
  displayTitle,
  courseText,
  type PriceKind,
} from "@/lib/catalogue/model";
import {
  isWorking,
  rowsFor,
  type WorkflowView,
  type ContentRow,
} from "@/lib/publishing/model";
import { formatMoney, type Currency } from "@/lib/currencies/model";
import { useUnsaved } from "./use-unsaved";
type Props = {
  kind: PriceKind;
  rows: ContentRow[];
  defaults?: ContentRow[];
  currencies: Currency[];
  ready: boolean;
  grants: Record<string, boolean>;
  initialRecord?: string;
};
export function PriceCatalogueManager(props: Props) {
  const [selected, setSelected] = useState<string | undefined>(
      props.initialRecord,
    ),
    [search, setSearch] = useState(""),
    [dirty, setDirty] = useState(false);
  useUnsaved(dirty);
  const choose = (id: string) => {
    if (dirty && !confirm("Discard unsaved catalogue changes?")) return;
    setDirty(false);
    setSelected(id);
  };
  const rows = [
    ...props.rows,
    ...(props.defaults ?? []).filter(
      (r) =>
        !props.rows.some(
          (old) => old.source_key === r.source_key || old.id === r.id,
        ),
    ),
  ];
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">
          {props.kind === "courses"
            ? "Language Courses"
            : props.kind === "addons"
              ? "Package add-ons"
              : "Packages"}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Existing records and website defaults are shown separately. Save Draft
          keeps changes private; publication requires approval and owner
          activation.
        </p>
      </header>
      {!props.ready && (
        <p role="alert">
          The owner’s manual currency/catalogue migration is required before
          saving. Existing records remain unchanged.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          Search records
          <input
            className="ml-2 rounded border p-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button
          disabled={!props.grants.create || !props.ready}
          className="cms-button-secondary"
          onClick={() => choose(crypto.randomUUID())}
        >
          Add {props.kind === "courses" ? "course" : "record"}
        </button>
      </div>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)]">
        <div className="space-y-2">
          {rows
            .filter((r) =>
              displayTitle(r).toLowerCase().includes(search.toLowerCase()),
            )
            .map((r) => (
              <button
                key={String(r.id)}
                className="block w-full rounded-xl border bg-white p-4 text-left"
                onClick={() => choose(String(r.id))}
              >
                <strong>{displayTitle(r)}</strong>
                <span className="block text-xs text-zinc-600">
                  {r.sourceDefault
                    ? "Website default · not a database record"
                    : r.archived_at
                      ? "Archived"
                      : "Saved catalogue record"}
                </span>
                {!r.sourceDefault && (
                  <span className="block text-sm">
                    {r.currency_code
                      ? formatMoney(
                          Number(r.price ?? r.price_full ?? 0),
                          String(r.currency_code),
                          props.currencies,
                        )
                      : props.kind === "courses"
                        ? `${r.price ?? "No price"} · currency unconfirmed (legacy screen used GBP)`
                        : `${r.price_full} USD · legacy denomination`}
                  </span>
                )}
              </button>
            ))}
          {!rows.length && (
            <p>
              No stored records were returned. Website defaults, where
              available, are shown without inserting duplicate courses.
            </p>
          )}
        </div>
        <div>
          {selected ? (
            <PriceEditor
              {...props}
              key={selected}
              id={selected}
              original={rows.find((r) => r.id === selected)}
              setDirty={setDirty}
            />
          ) : (
            <p className="rounded-xl border border-dashed p-8 text-sm">
              Select an existing record or website default to open its editor
              and revision history.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
function PriceEditor({
  kind,
  id,
  original,
  currencies,
  ready,
  grants,
  setDirty,
}: Props & {
  id: string;
  original?: ContentRow;
  setDirty: (v: boolean) => void;
}) {
  const initial = () => ({
    ...original,
    id,
    currency_code: original?.currency_code ?? (original ? null : "EUR"),
    sort_order: original?.sort_order ?? 0,
    archived_at: original?.archived_at ?? null,
    ...(kind === "courses"
      ? {
          title: courseText(original?.title) || "",
          description: courseText(original?.description) || "",
          source_key: original?.source_key ?? null,
          is_active: original?.is_active ?? false,
          price: original?.price ?? null,
        }
      : {
          name: original?.name ?? "",
          slug: original?.slug ?? "",
          description: original?.description ?? "",
          teaser: original?.teaser ?? "",
          best_for: original?.best_for ?? "",
          features: original?.features ?? [],
          is_published: original?.is_published ?? false,
          price_full: original?.price_full ?? 0,
          price_installment: original?.price_installment ?? null,
        }),
  });
  const [values, setValues] = useState<ContentRow>(initial),
    [view, setView] = useState<WorkflowView>(),
    [changed, setChanged] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [published, setPublished] = useState(false),
    [refresh, setRefresh] = useState(0),
    [busy, start] = useTransition(),
    [message, setMessage] = useState("");
  const locked =
    busy ||
    !ready ||
    !view?.ready ||
    published ||
    (!!view?.document &&
      ["approved", "in_review"].includes(view.document.status)) ||
    !(view?.published.tables[PRICE_TABLES[kind]]?.length
      ? grants.edit
      : grants.create);
  const patch = (key: string, value: unknown) => {
    setChanged(true);
    setDirty(true);
    if (key === "currency_code") setConfirmed(false);
    setValues((old) => ({ ...old, [key]: value }));
  };
  const onLoad = (v: WorkflowView, live: boolean) => {
    setView(v);
    setPublished(live);
    const row = rowsFor(
      !live && isWorking(v.document) ? v.document!.proposed : v.published,
      PRICE_TABLES[kind],
    )[0];
    if (row)
      setValues({
        ...row,
        ...(kind === "courses"
          ? {
              title: courseText(row.title) || "",
              description: courseText(row.description) || "",
            }
          : {}),
      });
    else setValues(initial());
    setChanged(false);
    setDirty(false);
    setConfirmed(false);
  };
  const save = (archive = false) => {
    if (
      archive &&
      !confirm(
        "Archive this record through a controlled draft? Existing history and references remain intact.",
      )
    )
      return;
    const keys =
      kind === "courses"
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
            ...(kind === "packages" ? ["teaser"] : []),
            "description",
            "best_for",
            ...(kind === "packages" ? ["features"] : []),
            "price_full",
            "price_installment",
            "currency_code",
            "is_published",
            "sort_order",
          ];
    start(async () => {
      const result = await savePriceDraft({
        kind,
        id,
        version: view?.document?.version ?? 0,
        values: Object.fromEntries(
          keys.map((key) => [
            key,
            values[key] ??
              (key === "price" ||
              key === "price_installment" ||
              key === "currency_code" ||
              key === "source_key"
                ? null
                : ""),
          ]),
        ),
        archive,
        currencyChangeConfirmed: confirmed,
      });
      if (result.ok) {
        setMessage("Private draft saved.");
        setChanged(false);
        setDirty(false);
        setRefresh((n) => n + 1);
      } else setMessage(result.error);
    });
  };
  const fields =
    kind === "courses"
      ? ["title", "description", "country", "city", "duration"]
      : [
          "name",
          "slug",
          "description",
          ...(kind === "packages" ? ["teaser", "features"] : []),
          "best_for",
        ];
  return (
    <div className="space-y-4">
      <WorkflowPanel
        resource={{ type: kind, key: id }}
        dirty={changed}
        busy={busy}
        refresh={refresh}
        onLoad={onLoad}
      />
      <fieldset
        disabled={locked}
        className="space-y-3 rounded-xl border bg-white p-5"
      >
        <legend className="px-1 font-semibold">{displayTitle(values)}</legend>
        {fields.map((key) => (
          <label key={key} className="block text-sm">
            {
              {
                title: "Course title",
                description: "Description",
                country: "Country",
                city: "City",
                duration: "Duration",
                name: "Name",
                slug: "Page / application reference",
                teaser: "Short introduction",
                features: "Included services (one per line)",
                best_for: "Best for",
              }[key]
            }
            {["description", "features", "teaser"].includes(key) ? (
              <textarea
                className="mt-1 min-h-24 w-full rounded border p-2"
                value={
                  key === "features"
                    ? Array.isArray(values[key])
                      ? (values[key] as string[]).join("\n")
                      : ""
                    : String(values[key] ?? "")
                }
                onChange={(e) =>
                  patch(
                    key,
                    key === "features"
                      ? e.target.value.split("\n")
                      : e.target.value,
                  )
                }
              />
            ) : (
              <input
                className="mt-1 w-full rounded border p-2"
                readOnly={
                  key === "slug" && !!original && !original.sourceDefault
                }
                value={String(values[key] ?? "")}
                onChange={(e) => patch(key, e.target.value)}
              />
            )}
          </label>
        ))}
        <label className="block text-sm">
          Currency
          <select
            className="mt-1 w-full rounded border p-2"
            value={String(values.currency_code ?? "")}
            onChange={(e) => patch("currency_code", e.target.value || null)}
          >
            {values.currency_code == null && (
              <option value="">
                Unconfirmed legacy denomination — preserved
              </option>
            )}
            {currencies
              .filter(
                (c) =>
                  c.active ||
                  c.code ===
                    (original?.currency_code ??
                      (kind === "courses" ? "GBP" : "USD")),
              )
              .map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.name}
                  {c.active ? "" : " · existing records only"}
                </option>
              ))}
          </select>
        </label>
        {(kind === "courses"
          ? ["price"]
          : ["price_full", "price_installment"]
        ).map((key) => (
          <label key={key} className="block text-sm">
            {key === "price"
              ? "Price (optional)"
              : key === "price_full"
                ? "Full price"
                : "Instalment price (optional)"}
            <input
              className="mt-1 w-full rounded border p-2"
              type="number"
              min={0}
              step="any"
              value={values[key] == null ? "" : String(values[key])}
              onChange={(e) =>
                patch(
                  key,
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
            />
          </label>
        ))}
        <label className="block text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />{" "}
          I verified the denomination and entered amounts. Selecting currency
          does not convert an existing price.
        </label>
        <label className="block text-sm">
          Display order
          <input
            className="ml-2 rounded border p-2"
            type="number"
            min={0}
            value={Number(values.sort_order ?? 0)}
            onChange={(e) => patch("sort_order", Number(e.target.value))}
          />
        </label>
        <label className="block text-sm">
          <input
            type="checkbox"
            disabled={!grants.publish}
            checked={Boolean(
              values[kind === "courses" ? "is_active" : "is_published"],
            )}
            onChange={(e) =>
              patch(
                kind === "courses" ? "is_active" : "is_published",
                e.target.checked,
              )
            }
          />{" "}
          Visible when approved and published
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="cms-button-primary" onClick={() => save()}>
            Save Draft
          </button>
          <button
            className="cms-button-secondary"
            disabled={!grants.delete || !original || !!values.archived_at}
            onClick={() => save(true)}
          >
            Archive
          </button>
        </div>
      </fieldset>
      <button
        className="cms-button-secondary"
        disabled={!changed || busy}
        onClick={() => {
          if (confirm("Discard unsaved changes?")) {
            setChanged(false);
            setDirty(false);
            setRefresh((n) => n + 1);
          }
        }}
      >
        Discard changes
      </button>
      <p role="status">{message}</p>
    </div>
  );
}
