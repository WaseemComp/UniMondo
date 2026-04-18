"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveAboutSections } from "@/app/admin/cms/about-sections-actions";
import type { AboutSectionRow } from "@/lib/data/about-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  sections: AboutSectionRow[];
};

export function AboutSectionsForm({ sections: initial }: Props) {
  const router = useRouter();
  const [sections, setSections] = useState<AboutSectionRow[]>(initial);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSections(initial);
  }, [initial]);

  const update = (key: AboutSectionRow["section_key"], field: "title" | "body", value: string) => {
    setSections((prev) => prev.map((s) => (s.section_key === key ? { ...s, [field]: value } : s)));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveAboutSections(sections);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("About page saved");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">About page</h1>
        <p className="mt-1 text-sm text-zinc-600">Edit the public About page sections (Mission, Vision, and more).</p>
      </div>

      <div className="space-y-4">
        {sections.map((s) => (
          <Card key={s.section_key}>
            <CardHeader className="p-0">
              <CardTitle className="px-5 py-3 text-base capitalize">{s.section_key.replace(/_/g, " ")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5">
              <div>
                <Label htmlFor={`t-${s.section_key}`}>Section title</Label>
                <input
                  id={`t-${s.section_key}`}
                  value={s.title}
                  onChange={(e) => update(s.section_key, "title", e.target.value)}
                  className="mt-1.5 flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:outline-none"
                  required
                />
              </div>
              <div>
                <Label htmlFor={`b-${s.section_key}`}>Body</Label>
                <Textarea
                  id={`b-${s.section_key}`}
                  value={s.body}
                  onChange={(e) => update(s.section_key, "body", e.target.value)}
                  className="mt-1.5 min-h-[120px]"
                />
              </div>
            </CardContent>
          </Card>
        ))}
        {sections.length === 0 ? (
          <p className="text-sm text-amber-800">
            No sections found. Run Supabase migrations to create and seed <code className="rounded bg-amber-100 px-1">about_sections</code>.
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending || sections.length === 0} className="bg-amber-600 text-white hover:bg-amber-500">
        {pending ? "Saving…" : "Save all sections"}
      </Button>
    </form>
  );
}
