"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteContactOffice, saveContactOffice } from "@/app/admin/cms/contact-offices-actions";
import type { ContactOfficeRow, OfficeEmail, OfficePhone, OfficeSocial } from "@/lib/data/contact-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  offices: ContactOfficeRow[];
};

const emptyOffice = (): Omit<ContactOfficeRow, "id"> & { id?: string } => ({
  office_type: "head",
  title: "",
  address_lines: "",
  phones: [],
  emails: [],
  social_links: [],
  sort_order: 0,
});

export function ContactManagementManager({ offices: initial }: Props) {
  const router = useRouter();
  const [offices, setOffices] = useState(initial);
  const [draft, setDraft] = useState<Partial<ContactOfficeRow> & { id?: string }>(emptyOffice());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setOffices(initial);
  }, [initial]);

  const openCreate = () => {
    setDraft({ ...emptyOffice(), sort_order: offices.length });
    dialogRef.current?.showModal();
  };

  const openEdit = (row: ContactOfficeRow) => {
    setDraft({
      ...row,
      title: row.title ?? "",
      phones: row.phones?.length ? [...row.phones] : [],
      emails: row.emails?.length ? [...row.emails] : [],
      social_links: row.social_links?.length ? [...row.social_links] : [],
    });
    dialogRef.current?.showModal();
  };

  const addPhone = () =>
    setDraft((d) => ({
      ...d,
      phones: [...(d.phones ?? []), { number: "", label: "", kind: "landline" as const }],
    }));
  const addEmail = () => setDraft((d) => ({ ...d, emails: [...(d.emails ?? []), { email: "", label: "" }] }));
  const addSocial = () =>
    setDraft((d) => ({ ...d, social_links: [...(d.social_links ?? []), { platform: "LinkedIn", url: "" }] }));

  const setPhone = (i: number, p: Partial<OfficePhone>) =>
    setDraft((d) => {
      const phones = [...(d.phones ?? [])];
      phones[i] = { ...phones[i]!, ...p };
      return { ...d, phones };
    });
  const setEmail = (i: number, e: Partial<OfficeEmail>) =>
    setDraft((d) => {
      const emails = [...(d.emails ?? [])];
      emails[i] = { ...emails[i]!, ...e };
      return { ...d, emails };
    });
  const setSocial = (i: number, s: Partial<OfficeSocial>) =>
    setDraft((d) => {
      const links = [...(d.social_links ?? [])];
      links[i] = { ...links[i]!, ...s };
      return { ...d, social_links: links };
    });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveContactOffice({
        id: draft.id,
        office_type: draft.office_type ?? "head",
        title: draft.title ?? "",
        address_lines: draft.address_lines ?? "",
        phones: draft.phones ?? [],
        emails: draft.emails ?? [],
        social_links: draft.social_links ?? [],
        sort_order: Number(draft.sort_order ?? 0),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Office saved");
      dialogRef.current?.close();
      router.refresh();
    });
  };

  const onDelete = (id: string) => {
    if (!confirm("Delete this office?")) return;
    startTransition(async () => {
      const res = await deleteContactOffice(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Deleted");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Contact management</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Offices (head / branch), addresses, phone lines, emails, and social links shown on /contact and in the footer.
          </p>
        </div>
        <Button type="button" onClick={openCreate} className="bg-amber-600 text-white hover:bg-amber-500">
          Add office
        </Button>
      </div>

      <Card>
        <CardHeader className="p-0">
          <CardTitle className="px-5 py-4">Offices</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Address (preview)</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {offices.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-50/80">
                  <td className="px-4 py-3 capitalize">{o.office_type}</td>
                  <td className="px-4 py-3 font-medium text-zinc-900">{o.title || "—"}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-zinc-600">{o.address_lines.split("\n")[0]}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="outline" size="sm" className="mr-2" onClick={() => openEdit(o)}>
                      Edit
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="text-red-700" onClick={() => onDelete(o.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {offices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-500">
                    No offices yet — add a head office to populate the contact page.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <dialog ref={dialogRef} className="w-full max-w-2xl rounded-xl border border-zinc-200 p-0 shadow-xl backdrop:bg-black/40">
        <form onSubmit={onSubmit} className="max-h-[92vh] overflow-y-auto p-6">
          <h2 className="text-lg font-semibold text-zinc-900">{draft.id ? "Edit office" : "New office"}</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ot">Office type</Label>
              <select
                id="ot"
                value={draft.office_type ?? "head"}
                onChange={(e) => setDraft((d) => ({ ...d, office_type: e.target.value as "head" | "branch" }))}
                className="mt-1.5 flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
              >
                <option value="head">Head office</option>
                <option value="branch">Branch office</option>
              </select>
            </div>
            <div>
              <Label htmlFor="otitle">Title (optional)</Label>
              <Input
                id="otitle"
                value={draft.title ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="e.g. Tripoli Head Office"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="addr">Full address</Label>
            <Textarea
              id="addr"
              value={draft.address_lines ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, address_lines: e.target.value }))}
              required
              className="mt-1.5 min-h-[100px]"
            />
          </div>

          <div className="mt-6 border-t border-zinc-100 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-800">Phone numbers</p>
              <Button type="button" variant="outline" size="sm" onClick={addPhone}>
                Add number
              </Button>
            </div>
            <div className="mt-3 space-y-3">
              {(draft.phones ?? []).map((p, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-zinc-100 p-3 sm:grid-cols-4">
                  <Input
                    placeholder="Number"
                    value={p.number}
                    onChange={(e) => setPhone(i, { number: e.target.value })}
                    className="sm:col-span-2"
                  />
                  <Input placeholder="Label" value={p.label ?? ""} onChange={(e) => setPhone(i, { label: e.target.value })} />
                  <select
                    value={p.kind ?? "landline"}
                    onChange={(e) => setPhone(i, { kind: e.target.value as OfficePhone["kind"] })}
                    className="rounded-md border border-zinc-200 px-2 text-sm"
                  >
                    <option value="landline">Landline</option>
                    <option value="mobile">Mobile</option>
                    <option value="fax">Fax</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-zinc-100 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-800">Email addresses</p>
              <Button type="button" variant="outline" size="sm" onClick={addEmail}>
                Add email
              </Button>
            </div>
            <div className="mt-3 space-y-3">
              {(draft.emails ?? []).map((em, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-2">
                  <Input
                    type="email"
                    placeholder="email@domain.com"
                    value={em.email}
                    onChange={(e) => setEmail(i, { email: e.target.value })}
                    required
                  />
                  <Input placeholder="Label (e.g. General)" value={em.label ?? ""} onChange={(e) => setEmail(i, { label: e.target.value })} />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-zinc-100 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-800">Social links</p>
              <Button type="button" variant="outline" size="sm" onClick={addSocial}>
                Add link
              </Button>
            </div>
            <div className="mt-3 space-y-3">
              {(draft.social_links ?? []).map((s, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Platform (e.g. LinkedIn)"
                    value={s.platform}
                    onChange={(e) => setSocial(i, { platform: e.target.value })}
                  />
                  <Input placeholder="https://…" value={s.url} onChange={(e) => setSocial(i, { url: e.target.value })} />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="sort">Sort order</Label>
            <Input
              id="sort"
              type="number"
              value={draft.sort_order ?? 0}
              onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
              className="mt-1.5 max-w-[120px]"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className={cn("bg-amber-600 text-white hover:bg-amber-500")}>
              {pending ? "Saving…" : "Save office"}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
