"use client";
import { useUnsaved } from "@/components/admin/catalogue/use-unsaved";
import { useState, useTransition } from "react";
import { WorkflowPanel } from "@/components/admin/publishing/workflow-panel";
import {
  rowsFor,
  isWorking,
  type ContentRow,
  type WorkflowView,
} from "@/lib/publishing/model";
import { saveRegionsDraft } from "@/app/admin/cms/regions-actions";
export function RegionsManager({
  grants,
}: {
  grants: Record<string, boolean>;
}) {
  const [view, setView] = useState<WorkflowView>(),
    [regions, setRegions] = useState<ContentRow[]>([]),
    [countries, setCountries] = useState<ContentRow[]>([]),
    [search, setSearch] = useState(""),
    [dirty, setDirty] = useState(false),
    [refresh, setRefresh] = useState(0),
    [message, setMessage] = useState(""),
    [busy, start] = useTransition(),
    [published, setPublished] = useState(false);
  useUnsaved(dirty);
  const locked =
    busy ||
    published ||
    !view?.ready ||
    !(grants.edit || grants.create) ||
    (!!view?.document &&
      ["in_review", "approved"].includes(view.document.status));
  const load = (v: WorkflowView, live: boolean) => {
    setView(v);
    setPublished(live);
    const p =
      !live && isWorking(v.document) ? v.document!.proposed : v.published;
    setRegions(
      rowsFor(p, "region_groups").sort(
        (a, b) => Number(a.sort_order) - Number(b.sort_order),
      ),
    );
    setCountries(
      rowsFor(p, "countries").sort(
        (a, b) => Number(a.sort_order) - Number(b.sort_order),
      ),
    );
    setDirty(false);
  };
  const regionPatch = (id: unknown, key: string, value: unknown) => {
    setDirty(true);
    setRegions((old) =>
      old.map((r) => (r.id === id ? { ...r, [key]: value } : r)),
    );
  };
  function move(
    index: number,
    delta: number,
    kind: "regions" | "countries",
    region?: unknown,
  ) {
    const source =
      kind === "regions"
        ? regions
        : countries.filter((r) => r.region_group_id === region);
    if (index + delta < 0 || index + delta >= source.length) return;
    const rows = [...source];
    [rows[index], rows[index + delta]] = [rows[index + delta], rows[index]];
    const orders = new Map(rows.map((r, i) => [r.id, i]));
    (kind === "regions" ? setRegions : setCountries)((old) =>
      old
        .map((r) =>
          orders.has(r.id) ? { ...r, sort_order: orders.get(r.id) } : r,
        )
        .sort((a, b) => Number(a.sort_order) - Number(b.sort_order)),
    );
    setDirty(true);
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Destination regions</h1>
      <p className="text-sm text-zinc-600">
        Manage existing regional groups and country assignments. Country
        identities, URLs, academic associations and content remain intact.
        Hidden or archived regions leave direct country pages available.
      </p>
      <WorkflowPanel
        resource={{ type: "regions", key: "catalogue" }}
        dirty={dirty}
        busy={busy}
        refresh={refresh}
        onLoad={load}
      />
      <div className="flex flex-wrap gap-3">
        <button
          className="cms-button-primary"
          disabled={locked || !dirty}
          onClick={() =>
            start(async () => {
              const result = await saveRegionsDraft({
                version: view?.document?.version ?? 0,
                regions: regions.map((r) => ({
                  id: r.id,
                  label: r.label,
                  continent: r.continent ?? "Europe",
                  sort_order: r.sort_order ?? 0,
                  is_published: r.is_published !== false,
                  archived_at: r.archived_at ?? null,
                })),
                countries: countries.map((r) => ({
                  id: r.id,
                  region_group_id: r.region_group_id ?? null,
                  sort_order: r.sort_order ?? 0,
                })),
              });
              if (result.ok) {
                setDirty(false);
                setRefresh((n) => n + 1);
                setMessage("Private region draft saved.");
              } else setMessage(result.error);
            })
          }
        >
          Save Draft
        </button>
        <button
          className="cms-button-secondary"
          disabled={busy || !dirty}
          onClick={() => {
            if (confirm("Discard unsaved region changes?")) {
              setDirty(false);
              setRefresh((n) => n + 1);
            }
          }}
        >
          Discard changes
        </button>
        <button
          className="cms-button-secondary"
          disabled={locked || !grants.create}
          onClick={() => {
            setRegions((old) => [
              ...old,
              {
                id: Math.max(0, ...old.map((r) => Number(r.id))) + 1,
                label: "",
                continent: "Europe",
                sort_order: old.length,
                is_published: grants.publish,
                archived_at: null,
              },
            ]);
            setDirty(true);
          }}
        >
          Add region
        </button>
      </div>
      <p role="status">{message}</p>
      <label className="block text-sm">
        Search countries
        <input
          className="mt-1 w-full max-w-md rounded border p-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {regions.map((r, index) => (
        <section
          key={String(r.id)}
          className="space-y-3 rounded-xl border bg-white p-4"
        >
          <fieldset
            disabled={
              locked ||
              (!grants.edit &&
                view?.published.tables.region_groups.some(
                  (old) => old.id === r.id,
                ))
            }
            className="flex flex-wrap items-end gap-3"
          >
            <label className="text-sm">
              Region name
              <input
                className="block rounded border p-2"
                value={String(r.label)}
                onChange={(e) => regionPatch(r.id, "label", e.target.value)}
              />
            </label>
            <label className="text-sm">
              Continent
              <input
                className="block rounded border p-2"
                value={String(r.continent ?? "Europe")}
                onChange={(e) => regionPatch(r.id, "continent", e.target.value)}
              />
            </label>
            <label>
              <input
                type="checkbox"
                disabled={!grants.publish}
                checked={r.is_published !== false}
                onChange={(e) =>
                  regionPatch(r.id, "is_published", e.target.checked)
                }
              />{" "}
              Visible
            </label>
            <button
              type="button"
              disabled={index === 0}
              onClick={() => move(index, -1, "regions")}
            >
              Move up
            </button>
            <button
              type="button"
              disabled={index === regions.length - 1}
              onClick={() => move(index, 1, "regions")}
            >
              Move down
            </button>
            <button
              disabled={!grants.delete || !!r.archived_at}
              type="button"
              onClick={() => {
                if (
                  confirm(
                    "Archive this region? Its countries and links will be retained.",
                  )
                ) {
                  regionPatch(r.id, "archived_at", new Date().toISOString());
                  regionPatch(r.id, "is_published", false);
                }
              }}
            >
              {r.archived_at ? "Archived" : "Archive region"}
            </button>
          </fieldset>
          <ul className="space-y-2">
            {countries
              .filter((c) => c.region_group_id === r.id)
              .map(
                (c, i, group) =>
                  String(c.name)
                    .toLowerCase()
                    .includes(search.toLowerCase()) && (
                    <li
                      key={String(c.id)}
                      className="flex flex-wrap items-center gap-3 rounded border p-2"
                    >
                      <span className="min-w-32 font-medium">
                        {String(c.name)}
                      </span>
                      <select
                        className="min-w-0 max-w-full rounded border p-2"
                        aria-label={`Region for ${c.name}`}
                        disabled={locked || !grants.edit}
                        value={String(c.region_group_id)}
                        onChange={(e) => {
                          setCountries((old) =>
                            old.map((row) =>
                              row.id === c.id
                                ? {
                                    ...row,
                                    region_group_id: Number(e.target.value),
                                  }
                                : row,
                            ),
                          );
                          setDirty(true);
                        }}
                      >
                        {regions.map((region) => (
                          <option
                            key={String(region.id)}
                            value={String(region.id)}
                          >
                            {String(region.label) || "New region"}
                          </option>
                        ))}
                      </select>
                      <button
                        disabled={locked || !grants.edit || i === 0}
                        onClick={() => move(i, -1, "countries", r.id)}
                      >
                        Move up
                      </button>
                      <button
                        disabled={
                          locked || !grants.edit || i === group.length - 1
                        }
                        onClick={() => move(i, 1, "countries", r.id)}
                      >
                        Move down
                      </button>
                    </li>
                  ),
              )}
          </ul>
        </section>
      ))}
      {countries
        .filter((c) => c.region_group_id == null)
        .map((c) => (
          <label key={String(c.id)} className="block">
            {String(c.name)} · Unassigned
            <select
              disabled={locked || !grants.edit}
              value=""
              onChange={(e) => {
                setCountries((old) =>
                  old.map((row) =>
                    row.id === c.id
                      ? { ...row, region_group_id: Number(e.target.value) }
                      : row,
                  ),
                );
                setDirty(true);
              }}
            >
              <option value="">Choose region</option>
              {regions.map((r) => (
                <option key={String(r.id)} value={String(r.id)}>
                  {String(r.label)}
                </option>
              ))}
            </select>
          </label>
        ))}
    </div>
  );
}
