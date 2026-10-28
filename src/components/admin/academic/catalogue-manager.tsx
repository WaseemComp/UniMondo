"use client";
import Link from "next/link";
import { slugifyCountryName } from "@/lib/destinations-utils";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveAcademicRecord } from "@/app/admin/cms/academic-actions";
import { MediaPicker } from "@/components/admin/media/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ACADEMIC_FIELDS, type AcademicField } from "@/lib/academic/fields";
import { academicDraft, atPath, setPath } from "@/lib/academic/draft";
import {
  filterAcademic,
  object,
  PRIORITY_COUNTRIES,
  rowTitle,
  status,
  text,
  type AcademicKind,
  type AcademicRow,
  type CatalogueData,
} from "@/lib/academic/model";
const titles = {
  countries: "Destinations",
  universities: "Universities",
  programmes: "Academic programmes",
};
const links = {
  countries: "/admin/destinations/countries",
  universities: "/admin/universities",
  programmes: "/admin/programs",
};
const selectClass =
  "w-full min-w-0 rounded-xl border border-[var(--cms-border)] bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[var(--cms-teal)]";
export function CatalogueManager({
  kind,
  data,
}: {
  kind: AcademicKind;
  data: CatalogueData;
}) {
  const editorRef = useRef<HTMLElement>(null);
  const router = useRouter(),
    grant = data.permissions[kind];
  const [search, setSearch] = useState(""),
    [country, setCountry] = useState(""),
    [filter, setFilter] = useState(""),
    [degree, setDegree] = useState("");
  const [editing, setEditing] = useState<AcademicRow | null | undefined>(),
    [draft, setDraft] = useState<Record<string, unknown>>({}),
    [baseline, setBaseline] = useState(""),
    [picker, setPicker] = useState<AcademicField | null>(null),
    [pending, startTransition] = useTransition(),
    [error, setError] = useState("");
  const dirty = editing !== undefined && JSON.stringify(draft) !== baseline;
  const rows = filterAcademic(
    data[kind],
    kind,
    search,
    country,
    filter,
    degree,
  );
  const groups = useMemo(
    () => [...new Set(ACADEMIC_FIELDS[kind].map((field) => field.section))],
    [kind],
  );
  useEffect(() => {
    if (!dirty) return;
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      if (
        (event.target as Element)?.closest?.("a[href]") &&
        !confirm("Leave without saving your changes?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", leave);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", leave);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
  const open = (row?: AcademicRow) => {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    const values = academicDraft(kind, row);
    if (!row && kind === "countries")
      values.region_group_id = data.regions[0]?.id ?? 0;
    setEditing(row ?? null);
    setDraft(values);
    setBaseline(JSON.stringify(values));
    setError("");
    if (window.innerWidth < 1280)
      requestAnimationFrame(() =>
        editorRef.current?.scrollIntoView({ block: "start" }),
      );
  };
  const change = (path: string, value: unknown) =>
    setDraft((current) => setPath(current, path, value));
  const save = (operation: "save" | "archive" | "restore" = "save") => {
    if (
      operation !== "save" &&
      !confirm(
        operation === "archive"
          ? "Archive this record and hide it publicly? Related records and files will be retained."
          : "Restore this record as hidden? Publication requires a separate explicit save.",
      )
    )
      return;
    startTransition(async () => {
      setError("");
      const result = await saveAcademicRecord({
        kind,
        id: editing?.id,
        expectedUpdatedAt: editing?.updated_at ?? null,
        operation,
        values: draft,
      });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      const next = academicDraft(kind, result.row);
      setEditing(result.row);
      setDraft(next);
      setBaseline(JSON.stringify(next));
      toast.success(
        operation === "save"
          ? "Record saved and confirmed"
          : operation === "archive"
            ? "Record archived; related records retained"
            : "Record restored as hidden",
      );
      router.refresh();
    });
  };
  const editable = Boolean(editing ? grant.edit : grant.create) && data.ready;
  const renderField = (field: AcademicField) => {
    const inheritedLanguage = field.path === "details.teaching_language" && Boolean(editing) && !Object.hasOwn(object(draft.details),"teaching_language");
    const value = inheritedLanguage ? "English" : atPath(draft, field.path),
      id = `academic-${field.path}`,
      disabled =
        !editable || pending || (field.path === "slug" && Boolean(editing));
    return (
      <div
        key={field.path}
        className={
          field.type === "textarea" ||
          field.type === "image" ||
          field.type === "lines"
            ? "sm:col-span-2 min-w-0"
            : "min-w-0"
        }
      >
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-semibold text-zinc-800"
        >
          {field.label}
        </label>
        {field.type === "image" ? (
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-200 p-3">
            {text(value) ? (
              // eslint-disable-next-line @next/next/no-img-element -- Preserve existing external website-image hosts.
              <img
                src={text(value)}
                alt={
                  text(
                    atPath(
                      draft,
                      field.path === "catalogue.image_url"
                        ? "catalogue.image_alt"
                        : "hero_image_alt",
                    ),
                  ) || field.label
                }
                className="h-24 w-36 rounded-lg bg-zinc-50 object-contain"
              />
            ) : (
              <span className="text-sm text-zinc-500">No image selected</span>
            )}
            <div className="space-y-2">
              <Button
                id={id}
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => setPicker(field)}
              >
                Change image
              </Button>
              {text(value) && (
                <p className="max-w-64 break-all text-xs text-zinc-500">
                  {text(value).startsWith("/")
                    ? "Existing website image"
                    : "Saved image reference"}
                </p>
              )}
              <p className="text-xs text-zinc-500">
                A selection becomes public only after saving this record.
              </p>
            </div>
          </div>
        ) : field.type === "select" ? (
          <select
            id={id}
            value={text(value) || field.options?.[0] || ""}
            disabled={disabled}
            className={selectClass}
            onChange={(e) => change(field.path, e.target.value)}
          >
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option
                  ? option.charAt(0).toUpperCase() + option.slice(1)
                  : "Not specified"}
              </option>
            ))}
          </select>
        ) : field.type === "checkbox" ? (
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            disabled={disabled}
            onChange={(e) => change(field.path, e.target.checked)}
          />
        ) : field.type === "textarea" || field.type === "lines" ? (
          <Textarea
            id={id}
            rows={4}
            disabled={disabled}
            value={
              field.type === "lines"
                ? Array.isArray(value)
                  ? value.join("\n")
                  : ""
                : text(value)
            }
            onChange={(e) =>
              change(
                field.path,
                field.type === "lines"
                  ? e.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean)
                  : e.target.value,
              )
            }
          />
        ) : (
          <Input
            id={id}
            disabled={disabled}
            type={field.type ?? "text"}
            min={field.type === "number" ? 0 : undefined}
            step={field.path === "details.tuition_amount" ? "any" : undefined}
            value={typeof value === "number" ? value : text(value)}
            onChange={(e) =>
              change(
                field.path,
                field.type === "number"
                  ? e.target.value === ""
                    ? null
                    : Number(e.target.value)
                  : e.target.value,
              )
            }
          />
        )}
        {inheritedLanguage && <p className="mt-1 text-xs text-[#74855B]">Inherited public display: English · not officially verified. Editing this field replaces the inherited value.</p>}
        {field.hint && (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {field.hint}
          </p>
        )}
      </div>
    );
  };
  const relatedCountry =
    kind === "countries" ? text(draft.name) : text(draft.country);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--cms-teal)]">
          Academic catalogue
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-900">
          {titles[kind]}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-600">
          Manage existing records, public information and relationships. Save
          updates public content immediately; unsaved edits remain private to
          this screen.
        </p>
      </header>
      <nav aria-label="Academic catalogue" className="flex flex-wrap gap-2">
        {(Object.keys(links) as AcademicKind[])
          .filter((key) => data.permissions[key].view)
          .map((key) => (
            <Link
              key={key}
              href={links[key]}
              aria-current={key === kind ? "page" : undefined}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold ${key === kind ? "border-[#2C786D] bg-[#DCEFE9] text-[#245F57]" : "border-zinc-200 bg-white text-zinc-600"}`}
            >
              {titles[key]}
            </Link>
          ))}
        <Link
          href="/admin/home"
          className="rounded-xl border border-zinc-200 px-4 py-2 text-sm"
        >
          Homepage featured selections
        </Link>
      </nav>
      {!data.ready && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {data.error}
        </p>
      )}
      {kind === "countries" && (
        <details className="rounded-xl border border-zinc-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            12 priority destinations · existing record coverage
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRIORITY_COUNTRIES.map((name) => (
              <span
                key={name}
                className={`rounded-full px-3 py-1 text-xs ${data.countries.some((row) => row.name === name) ? "bg-[#E8F6EC] text-[#245F57]" : "bg-zinc-100 text-zinc-600"}`}
              >
                {name} ·{" "}
                {data.countries.some((row) => row.name === name)
                  ? "Existing record"
                  : "No record yet"}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Missing records are never created automatically. Add only
            researched, approved destination content.
          </p>
        </details>
      )}
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.5fr)]">
        <section
          aria-label="Records"
          className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">
              {titles[kind]} · {rows.length}
            </h2>
            {grant.create && (
              <Button
                type="button"
                disabled={!data.ready || pending}
                onClick={() => open()}
              >
                Add{" "}
                {kind === "countries"
                  ? "destination"
                  : kind === "universities"
                    ? "university"
                    : "programme"}
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium sm:col-span-2">
              Search records
              <Input
                type="search"
                value={search}
                placeholder="Search by name, institution or discipline"
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="text-xs font-medium">
              Country
              <select
                className={selectClass}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">All countries</option>
                {[
                  ...new Set([
                    ...data.countries.map((row) => text(row.name)),
                    ...data[kind].map((row) => text(row.country)),
                  ]),
                ]
                  .filter(Boolean)
                  .sort()
                  .map((name) => (
                    <option key={name}>{name}</option>
                  ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              Visibility
              <select
                className={selectClass}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                {["Published", "Hidden", "Archived"].map((label) => (
                  <option key={label}>{label}</option>
                ))}
              </select>
            </label>
            {kind === "programmes" && (
              <label className="text-xs font-medium sm:col-span-2">
                Degree level
                <select
                  className={selectClass}
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                >
                  <option value="">All degrees</option>
                  {["bachelor", "master", "doctorate", "other"].map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="mt-4 max-h-[65vh] space-y-2 overflow-y-auto">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                disabled={pending}
                onClick={() => open(row)}
                aria-pressed={editing?.id === row.id}
                className={`w-full rounded-xl border p-3 text-left transition hover:border-[#2C786D] focus-visible:outline-2 focus-visible:outline-[#2C786D] ${editing?.id === row.id ? "border-[#2C786D] bg-[#F2F8F5]" : "border-zinc-200"}`}
              >
                <span className="block break-words font-semibold text-zinc-900">
                  {rowTitle(kind, row)}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {text(row.country)}
                  {kind === "programmes"
                    ? ` · ${text(row.university)} · ${text(row.degree)}`
                    : ""}
                </span>
                <span className="mt-2 inline-block rounded-full bg-zinc-100 px-2 py-1 text-xs">
                  {status(row)}
                </span>
                {kind === "programmes" && (
                  <span className="ml-2 text-xs text-[#74855B]">
                    {text(object(row.details).verification) ||
                      "Unverified legacy information"}
                  </span>
                )}
              </button>
            ))}
            {!rows.length && (
              <p className="py-8 text-center text-sm text-zinc-500">
                {data.ready
                  ? "No matching records. Try another search or filter."
                  : "Records will load after database setup."}
              </p>
            )}
          </div>
        </section>
        <section
          className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6"
          ref={editorRef}
          aria-label="Record editor"
        >
          {editing === undefined ? (
            <div className="py-16 text-center">
              <h2 className="font-semibold text-zinc-800">
                Choose a record to begin
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                Existing content and relationships load into the editor.
              </p>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                save();
              }}
              className="space-y-6"
            >
              <header className="space-y-2">
                <h2 className="break-words text-xl font-semibold">
                  {editing
                    ? rowTitle(kind, editing)
                    : `New ${kind === "countries" ? "destination" : kind === "universities" ? "university" : "programme"}`}
                </h2>
                <p aria-live="polite" className="text-sm text-[#2C786D]">
                  {dirty
                    ? "Unsaved changes · not public"
                    : editing
                      ? "Saved record · " + status(editing)
                      : "New record · not saved"}
                </p>
                <p className="text-xs text-zinc-500">
                  Existing saved content is retained. Optional guidance left
                  blank continues to use established public defaults. Never
                  enter guessed fees, dates or scholarship amounts.
                </p>
              </header>
              {kind === "countries" && (
                <label className="block text-sm font-semibold">
                  Destination region
                  <select
                    className={selectClass}
                    disabled={!editable || pending}
                    value={Number(draft.region_group_id)}
                    onChange={(e) =>
                      change("region_group_id", Number(e.target.value))
                    }
                  >
                    <option value={0}>Choose a region</option>
                    {data.regions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {kind === "universities" && (
                <label className="block text-sm font-semibold">
                  Destination country
                  <select
                    className={selectClass}
                    disabled={
                      !editable || pending || !data.permissions.countries.view
                    }
                    value={text(draft.country_id)}
                    onChange={(e) => {
                      const parent = data.countries.find(
                        (row) => row.id === e.target.value,
                      );
                      setDraft((current) => ({
                        ...current,
                        country_id: e.target.value || null,
                        country: parent?.name ?? current.country,
                      }));
                    }}
                  >
                    <option value="">
                      {editing
                        ? `Existing association: ${text(editing.country)} · not linked yet`
                        : "Choose an existing country"}
                    </option>
                    {data.countries.map((row) => (
                      <option key={row.id} value={row.id}>
                        {text(row.name)} · {status(row)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {kind === "programmes" && (
                <label className="block text-sm font-semibold">
                  Parent university
                  <select
                    className={selectClass}
                    disabled={
                      !editable ||
                      pending ||
                      !data.permissions.universities.view
                    }
                    value={text(draft.university_id)}
                    onChange={(e) => {
                      const parent = data.universities.find(
                        (row) => row.id === e.target.value,
                      );
                      setDraft((current) => ({
                        ...current,
                        university_id: e.target.value || null,
                        university: parent?.name ?? current.university,
                        country: parent?.country ?? current.country,
                      }));
                    }}
                  >
                    <option value="">
                      {editing
                        ? `Existing association: ${text(editing.university)} · not linked yet`
                        : "Choose an existing university"}
                    </option>
                    {data.universities.map((row) => (
                      <option key={row.id} value={row.id}>
                        {text(row.name)} · {text(row.country)} · {status(row)}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs font-normal text-zinc-500">
                    Country follows the selected university. Existing unlinked
                    records are preserved; choose a parent only when its
                    identity is confirmed.
                  </span>
                </label>
              )}
              {groups.map((group, index) => (
                <details
                  key={group}
                  open={index === 0}
                  className="rounded-xl border border-zinc-200 p-4"
                >
                  <summary className="cursor-pointer font-semibold text-zinc-800">
                    {group}
                  </summary>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    {ACADEMIC_FIELDS[kind]
                      .filter((field) => field.section === group)
                      .map(renderField)}
                  </div>
                </details>
              ))}
              {kind === "universities" && (
                <details className="rounded-xl border border-zinc-200 p-4">
                  <summary className="cursor-pointer font-semibold">
                    Existing public flagship summaries
                  </summary>
                  <p className="my-3 text-xs text-zinc-500">
                    These existing public card summaries remain distinct from
                    individual programme records. Manage full programme details
                    in Academic programmes.
                  </p>
                  {(Array.isArray(draft.programs) ? draft.programs : []).map(
                    (item, index) => (
                      <div
                        key={index}
                        className="mb-3 grid gap-2 sm:grid-cols-2"
                      >
                        <label className="text-xs">
                          Programme name
                          <Input
                            value={text(object(item).name)}
                            disabled={!editable || pending}
                            onChange={(e) =>
                              change(
                                "programs",
                                (draft.programs as unknown[]).map((old, i) =>
                                  i === index
                                    ? { ...object(old), name: e.target.value }
                                    : old,
                                ),
                              )
                            }
                          />
                        </label>
                        <label className="text-xs">
                          Tuition information
                          <Input
                            value={text(object(item).tuition_range)}
                            disabled={!editable || pending}
                            onChange={(e) =>
                              change(
                                "programs",
                                (draft.programs as unknown[]).map((old, i) =>
                                  i === index
                                    ? {
                                        ...object(old),
                                        tuition_range: e.target.value,
                                      }
                                    : old,
                                ),
                              )
                            }
                          />
                        </label>
                      </div>
                    ),
                  )}
                </details>
              )}
              <div className="rounded-xl bg-[#F2F8F5] p-4">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.is_published)}
                    disabled={
                      !editable ||
                      !grant.publish ||
                      pending ||
                      Boolean(editing?.archived_at)
                    }
                    onChange={(e) => change("is_published", e.target.checked)}
                  />
                  Visible on the public website
                </label>
                <p className="mt-2 text-xs text-zinc-600">
                  A hidden or archived parent suppresses its children publicly
                  without changing their records.
                </p>
                {!grant.publish && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Publishing permission is required to change visibility.
                  </p>
                )}
              </div>
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
                >
                  {error}
                </p>
              )}
              <div className="sticky bottom-3 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-sm">
                <Button type="submit" disabled={!editable || pending || !dirty}>
                  {pending ? "Saving…" : "Save changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || !dirty}
                  onClick={() => {
                    if (confirm("Discard unsaved changes?")) {
                      const next = academicDraft(kind, editing ?? undefined);
                      if (!editing && kind === "countries")
                        next.region_group_id = data.regions[0]?.id ?? 0;
                      setDraft(next);
                      setBaseline(JSON.stringify(next));
                      setError("");
                    }
                  }}
                >
                  Discard
                </Button>
                {editing && grant.delete && grant.edit && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending || dirty}
                    onClick={() =>
                      save(editing.archived_at ? "restore" : "archive")
                    }
                  >
                    {editing.archived_at ? "Restore as hidden" : "Archive"}
                  </Button>
                )}
                {editing && (
                  <Link
                    className="text-sm text-[#2C786D] underline"
                    href={`/destinations/${kind === "countries" ? text(editing.slug) || slugifyCountryName(text(editing.name)) : data.countries.find((row) => row.name === relatedCountry)?.slug || slugifyCountryName(relatedCountry)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View current public page
                  </Link>
                )}
              </div>
              {editing && kind !== "programmes" && (
                <aside className="border-t border-zinc-200 pt-4">
                  <h3 className="text-sm font-semibold">
                    Related{" "}
                    {kind === "countries" ? "universities" : "programmes"}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    Existing relationships are retained; editing this record
                    does not overwrite its children.
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {(kind === "countries"
                      ? data.universities.filter(
                          (row) =>
                            row.country_id === editing.id ||
                            row.country === editing.name,
                        )
                      : data.programmes.filter(
                          (row) =>
                            row.university_id === editing.id ||
                            (row.university === editing.name &&
                              row.country === editing.country),
                        )
                    ).map((row) => (
                      <li key={row.id}>
                        {text(row.name) || text(row.title)} · {status(row)}
                      </li>
                    ))}
                  </ul>
                </aside>
              )}
            </form>
          )}
        </section>
      </div>
      {picker && (
        <MediaPicker
          title={picker.label}
          category={kind === "countries" ? "destinations" : "universities"}
          currentUrl={text(atPath(draft, picker.path))}
          onClose={() => setPicker(null)}
          onSelect={(asset) => {
            change(picker.path, asset.url);
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}
