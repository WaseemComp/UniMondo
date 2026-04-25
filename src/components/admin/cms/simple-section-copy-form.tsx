"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { upsertCmsBlock } from "@/app/admin/cms/cms-block-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ExistingBlock = {
  id: string;
  is_active: boolean;
  sort_order: number;
  content: Record<string, unknown> | null;
};

type Field = { key: string; label: string; type: "text" | "textarea" };

type Props = {
  title: string;
  description?: string;
  pageSlug: string;
  sectionKey: string;
  blockKey: string;
  permissionKey: string;
  revalidatePaths: string[];
  fields: Field[];
  existing?: ExistingBlock | null;
};

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function SimpleSectionCopyForm({
  title,
  description,
  pageSlug,
  sectionKey,
  blockKey,
  permissionKey,
  revalidatePaths,
  fields,
  existing,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const c = existing?.content ?? {};
    const next: Record<string, string> = {};
    for (const f of fields) next[f.key] = asString(c[f.key]);
    setValues(next);
  }, [existing, fields]);

  const save = () => {
    startTransition(async () => {
      const res = await upsertCmsBlock({
        id: existing?.id,
        page_slug: pageSlug,
        section_key: sectionKey,
        block_key: blockKey,
        block_type: "section_copy",
        is_active: true,
        sort_order: 0,
        content: values,
        media: {},
        permission_key: permissionKey,
        revalidate_paths: revalidatePaths,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Saved");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="p-0">
        <CardTitle className="px-5 py-4">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {description ? <p className="text-sm text-zinc-600">{description}</p> : null}
        {fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label>{f.label}</Label>
            {f.type === "textarea" ? (
              <Textarea
                rows={4}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((m) => ({ ...m, [f.key]: e.target.value }))}
              />
            ) : (
              <Input value={values[f.key] ?? ""} onChange={(e) => setValues((m) => ({ ...m, [f.key]: e.target.value }))} />
            )}
          </div>
        ))}
        <div className="flex justify-end">
          <Button type="button" onClick={save} disabled={pending} className="bg-[#0a1628] text-white hover:bg-[#132a4a]">
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

