"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { z } from "zod";

type LanguageCourseRow = {
  id: string;
  title: Record<string, string>;
  country: string | null;
  city: string | null;
  duration: string | null;
  price: number | null;
  description: Record<string, string> | null;
  is_active: boolean | null;
  created_at: string | null;
};

const courseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  country: z.string().optional().default(""),
  city: z.string().optional().default(""),
  duration: z.string().optional().default(""),
  price: z.number().optional().nullable(),
  description: z.string().optional().default(""),
  is_active: z.boolean().default(true),
});

type CourseInput = z.infer<typeof courseSchema>;

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load courses");
  return (await res.json()) as { courses: LanguageCourseRow[] };
};

function toEnPayload(input: CourseInput) {
  return {
    title: { en: input.title.trim() },
    description: input.description.trim() ? { en: input.description.trim() } : { en: "" },
  };
}

export function CoursesAdmin() {
  const { data, isLoading, mutate } = useSWR<{ courses: LanguageCourseRow[] }>(
    "/api/admin/courses",
    fetcher
  );
  const courses = data?.courses ?? [];

  const empty = useMemo<CourseInput>(
    () => ({
      title: "",
      country: "",
      city: "",
      duration: "",
      price: null,
      description: "",
      is_active: true,
    }),
    []
  );

  const [editing, setEditing] = useState<LanguageCourseRow | null>(null);
  const [draft, setDraft] = useState<CourseInput>(empty);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const startCreate = () => {
    setEditing(null);
    setDraft(empty);
    setError(null);
  };

  const startEdit = (course: LanguageCourseRow) => {
    setEditing(course);
    setDraft({
      title: course.title?.en ?? "",
      country: course.country ?? "",
      city: course.city ?? "",
      duration: course.duration ?? "",
      price: course.price ?? null,
      description: course.description?.en ?? "",
      is_active: Boolean(course.is_active),
    });
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const parsed = courseSchema.safeParse(draft);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Validation failed");
        return;
      }

      const v = parsed.data;
      const en = toEnPayload(v);

      const method = editing ? "PATCH" : "POST";
      const res = await fetch("/api/admin/courses", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          country: v.country || null,
          city: v.city || null,
          duration: v.duration || null,
          price: v.price ?? null,
          is_active: v.is_active,
          title: en.title,
          description: en.description,
        }),
      });
      const j = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(j.message || "Failed to save");
      await mutate();
      startCreate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    const res = await fetch(`/api/admin/courses?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const j = (await res.json()) as { message?: string };
    if (!res.ok) alert(j.message || "Failed to delete");
    await mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Language courses</h2>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          New course
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-zinc-600">Loading courses...</p>
      ) : (
        <div className="grid gap-3">
          {courses.map((c) => (
            <div key={c.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{c.title?.en ?? "Untitled"}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {(c.country ?? "—") + (c.city ? ` · ${c.city}` : "")}
                    {c.duration ? ` · ${c.duration}` : ""}
                    {c.price != null ? ` · £${c.price}` : ""}
                    {c.is_active ? " · Active" : " · Inactive"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-zinc-500"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:border-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600">
              No courses yet.
            </p>
          )}
        </div>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">{editing ? "Edit course" : "Create course"}</h3>
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm text-zinc-700 md:col-span-2">
            <span className="font-medium">Title</span>
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
            />
          </label>

          <label className="space-y-1 text-sm text-zinc-700">
            <span className="font-medium">Country</span>
            <input
              value={draft.country}
              onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
            />
          </label>

          <label className="space-y-1 text-sm text-zinc-700">
            <span className="font-medium">City</span>
            <input
              value={draft.city}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
            />
          </label>

          <label className="space-y-1 text-sm text-zinc-700">
            <span className="font-medium">Duration</span>
            <input
              value={draft.duration}
              onChange={(e) => setDraft((d) => ({ ...d, duration: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
              placeholder="e.g. 8 weeks"
            />
          </label>

          <label className="space-y-1 text-sm text-zinc-700">
            <span className="font-medium">Price (GBP)</span>
            <input
              type="number"
              value={draft.price ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  price: e.target.value.trim() ? Number(e.target.value) : null,
                }))
              }
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-zinc-700 md:col-span-2">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
            />
            Active (visible on public site)
          </label>

          <label className="space-y-1 text-sm text-zinc-700 md:col-span-2">
            <span className="font-medium">Description</span>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              className="min-h-24 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </section>
    </div>
  );
}
