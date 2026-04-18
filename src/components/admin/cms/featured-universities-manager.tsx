"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteFeaturedUniversity,
  saveFeaturedUniversity,
  uploadFeaturedUniversityAsset,
} from "@/app/admin/cms/featured-universities-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FeaturedUniversityRow } from "@/lib/featured-universities";

export type FeaturedUniversityAdminRow = FeaturedUniversityRow;

type ProgramDraft = { name: string; tuition_range: string };

const emptyPrograms = (): ProgramDraft[] => [{ name: "", tuition_range: "" }];

const emptyDraft = (): {
  id?: string;
  name: string;
  country: string;
  flag_emoji: string;
  prestige_line: string;
  qs_label: string;
  hero_image_url: string;
  hero_image_alt: string;
  logo_url: string;
  logo_initials: string;
  programs: ProgramDraft[];
  apply_program_summary: string;
  is_published: boolean;
  sort_order: number;
} => ({
  name: "",
  country: "",
  flag_emoji: "",
  prestige_line: "",
  qs_label: "",
  hero_image_url: "",
  hero_image_alt: "",
  logo_url: "",
  logo_initials: "UNI",
  programs: emptyPrograms(),
  apply_program_summary: "",
  is_published: true,
  sort_order: 0,
});

function rowToDraft(row: FeaturedUniversityAdminRow) {
  const raw = row.programs;
  const programs: ProgramDraft[] = Array.isArray(raw)
    ? raw.map((p) => {
        if (!p || typeof p !== "object") return { name: "", tuition_range: "" };
        const o = p as Record<string, unknown>;
        return {
          name: typeof o.name === "string" ? o.name : "",
          tuition_range: typeof o.tuition_range === "string" ? o.tuition_range : "",
        };
      })
    : emptyPrograms();
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    flag_emoji: row.flag_emoji ?? "",
    prestige_line: row.prestige_line ?? "",
    qs_label: row.qs_label ?? "",
    hero_image_url: row.hero_image_url ?? "",
    hero_image_alt: row.hero_image_alt ?? "",
    logo_url: row.logo_url ?? "",
    logo_initials: row.logo_initials ?? "UNI",
    programs: programs.length ? programs : emptyPrograms(),
    apply_program_summary: row.apply_program_summary ?? "",
    is_published: Boolean(row.is_published),
    sort_order: row.sort_order ?? 0,
  };
}

type Props = {
  universities: FeaturedUniversityAdminRow[];
};

export function FeaturedUniversitiesManager({ universities: initial }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  useEffect(() => {
    setRows(initial);
  }, [initial]);

  const [draft, setDraft] = useState(emptyDraft());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<"hero" | "logo" | null>(null);

  const openCreate = () => {
    setDraft({
      ...emptyDraft(),
      sort_order: rows.length ? Math.max(...rows.map((r) => r.sort_order ?? 0)) + 1 : 0,
    });
    dialogRef.current?.showModal();
  };

  const openEdit = (row: FeaturedUniversityAdminRow) => {
    setDraft(rowToDraft(row));
    dialogRef.current?.showModal();
  };

  const setProgram = (index: number, field: keyof ProgramDraft, value: string) => {
    setDraft((d) => {
      const programs = [...d.programs];
      programs[index] = { ...programs[index], [field]: value };
      return { ...d, programs };
    });
  };

  const addProgramRow = () => {
    setDraft((d) => ({ ...d, programs: [...d.programs, { name: "", tuition_range: "" }] }));
  };

  const removeProgramRow = (index: number) => {
    setDraft((d) => ({
      ...d,
      programs: d.programs.filter((_, i) => i !== index),
    }));
  };

  const onUpload = async (kind: "hero" | "logo", file: File | null) => {
    if (!file) return;
    setUploading(kind);
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadFeaturedUniversityAsset(fd);
    setUploading(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (kind === "hero") {
      setDraft((d) => ({ ...d, hero_image_url: res.publicUrl }));
      toast.success("Hero image uploaded");
    } else {
      setDraft((d) => ({ ...d, logo_url: res.publicUrl }));
      toast.success("Logo uploaded");
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveFeaturedUniversity({
        id: draft.id,
        name: draft.name,
        country: draft.country,
        flag_emoji: draft.flag_emoji,
        prestige_line: draft.prestige_line,
        qs_label: draft.qs_label || null,
        hero_image_url: draft.hero_image_url,
        hero_image_alt: draft.hero_image_alt,
        logo_url: draft.logo_url,
        logo_initials: draft.logo_initials,
        programs: draft.programs.filter((p) => p.name.trim() && p.tuition_range.trim()),
        apply_program_summary: draft.apply_program_summary || null,
        is_published: draft.is_published,
        sort_order: Number(draft.sort_order ?? 0),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Featured university saved");
      dialogRef.current?.close();
      router.refresh();
    });
  };

  const onDelete = (id: string) => {
    if (!confirm("Remove this featured university from the public page?")) return;
    startTransition(async () => {
      const res = await deleteFeaturedUniversity(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Removed");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Featured universities</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage the spotlight grid on <strong>Featured Universities &amp; Programs</strong> (/current-openings).
            Upload hero and logo images, edit rankings and copy, or add institutions for any country.
          </p>
        </div>
        <Button type="button" onClick={openCreate} className="bg-amber-600 text-white hover:bg-amber-500">
          Add featured university
        </Button>
      </div>

      <Card>
        <CardHeader className="p-0">
          <CardTitle className="px-5 py-4">All entries</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">University</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">QS / tag</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 text-zinc-500">{row.sort_order}</td>
                  <td className="px-4 py-3 font-medium text-zinc-900">{row.name}</td>
                  <td className="px-4 py-3">
                    <span className="mr-1" aria-hidden>
                      {row.flag_emoji}
                    </span>
                    {row.country}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{row.qs_label ?? "—"}</td>
                  <td className="px-4 py-3">{row.is_published ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(row)}>
                      Edit
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(row.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="p-6 text-center text-sm text-zinc-500">
              No featured universities yet. Add one or run the latest migration to seed defaults.
            </p>
          )}
        </CardContent>
      </Card>

      <dialog
        ref={dialogRef}
        className="w-[min(100%,720px)] rounded-2xl border border-zinc-200 p-0 shadow-xl backdrop:bg-black/40"
      >
        <form onSubmit={onSubmit} className="max-h-[90vh] overflow-y-auto p-6">
          <h2 className="text-lg font-semibold text-zinc-900">
            {draft.id ? "Edit featured university" : "New featured university"}
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="fu-name">University name</Label>
              <Input
                id="fu-name"
                required
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fu-country">Country</Label>
              <Input
                id="fu-country"
                required
                placeholder="e.g. Italy, Hungary, France"
                value={draft.country}
                onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fu-flag">Flag emoji (optional)</Label>
              <Input
                id="fu-flag"
                placeholder="🇮🇹"
                value={draft.flag_emoji}
                onChange={(e) => setDraft((d) => ({ ...d, flag_emoji: e.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="fu-prestige">Prestige line</Label>
              <Textarea
                id="fu-prestige"
                rows={2}
                value={draft.prestige_line}
                onChange={(e) => setDraft((d) => ({ ...d, prestige_line: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fu-qs">Ranking / badge (e.g. QS World #98)</Label>
              <Input
                id="fu-qs"
                placeholder="QS World #98"
                value={draft.qs_label}
                onChange={(e) => setDraft((d) => ({ ...d, qs_label: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fu-sort">Sort order</Label>
              <Input
                id="fu-sort"
                type="number"
                value={draft.sort_order}
                onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="fu-hero-url">Hero image URL</Label>
              <Input
                id="fu-hero-url"
                type="url"
                placeholder="https://… or upload below"
                value={draft.hero_image_url}
                onChange={(e) => setDraft((d) => ({ ...d, hero_image_url: e.target.value }))}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  ref={heroFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    void onUpload("hero", f);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading === "hero"}
                  onClick={() => heroFileRef.current?.click()}
                >
                  {uploading === "hero" ? "Uploading…" : "Upload hero image"}
                </Button>
                <span className="text-xs text-zinc-500">JPEG / PNG / WebP / GIF, max 5MB</span>
              </div>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="fu-hero-alt">Hero image alt text</Label>
              <Input
                id="fu-hero-alt"
                value={draft.hero_image_alt}
                onChange={(e) => setDraft((d) => ({ ...d, hero_image_alt: e.target.value }))}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="fu-logo-url">Logo URL (optional)</Label>
              <Input
                id="fu-logo-url"
                type="url"
                placeholder="Square logo; shown on card if set"
                value={draft.logo_url}
                onChange={(e) => setDraft((d) => ({ ...d, logo_url: e.target.value }))}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    void onUpload("logo", f);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading === "logo"}
                  onClick={() => logoFileRef.current?.click()}
                >
                  {uploading === "logo" ? "Uploading…" : "Upload logo"}
                </Button>
              </div>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="fu-logo-init">Logo initials (fallback if no logo)</Label>
              <Input
                id="fu-logo-init"
                value={draft.logo_initials}
                onChange={(e) => setDraft((d) => ({ ...d, logo_initials: e.target.value }))}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="fu-apply">Apply form program text (optional)</Label>
              <Input
                id="fu-apply"
                placeholder={`Default: “${draft.name || "University"} — flagship programs”`}
                value={draft.apply_program_summary}
                onChange={(e) => setDraft((d) => ({ ...d, apply_program_summary: e.target.value }))}
              />
              <p className="text-xs text-zinc-500">
                Sent as the <code className="rounded bg-zinc-100 px-1">program</code> query param on &quot;Apply now&quot;.
              </p>
            </div>

            <div className="sm:col-span-2 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-semibold">Flagship programs</Label>
                <Button type="button" variant="outline" size="sm" onClick={addProgramRow}>
                  Add program
                </Button>
              </div>
              <div className="space-y-3">
                {draft.programs.map((p, i) => (
                  <div
                    key={i}
                    className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-3 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-500">Program name</Label>
                      <Input
                        value={p.name}
                        onChange={(e) => setProgram(i, "name", e.target.value)}
                        placeholder="e.g. MSc Data Science"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-500">Tuition range</Label>
                      <Input
                        value={p.tuition_range}
                        onChange={(e) => setProgram(i, "tuition_range", e.target.value)}
                        placeholder="e.g. EUR 2,500 – 4,200 / yr"
                      />
                    </div>
                    <div className="flex items-end sm:justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-700"
                        disabled={draft.programs.length <= 1}
                        onClick={() => removeProgramRow(i)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 sm:col-span-2">
              <input
                id="fu-pub"
                type="checkbox"
                checked={draft.is_published}
                onChange={(e) => setDraft((d) => ({ ...d, is_published: e.target.checked }))}
              />
              <Label htmlFor="fu-pub" className="font-normal">
                Published on public site
              </Label>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="bg-zinc-900 text-white">
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
