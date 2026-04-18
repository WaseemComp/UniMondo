"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteContactAddress,
  deleteContactEmail,
  deleteContactPhone,
  saveContactAddress,
  saveContactEmail,
  saveContactPhone,
} from "@/app/admin/cms/contact-info-actions";
import type { ContactAddressRow, ContactEmailRow, ContactPhoneRow } from "@/lib/data/contact-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  addresses: ContactAddressRow[];
  phones: ContactPhoneRow[];
  emails: ContactEmailRow[];
};

type DialogMode = "addr" | "phone" | "email" | null;

export function ContactInfoManager({ addresses, phones, emails }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<DialogMode>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  const [addrDraft, setAddrDraft] = useState<Partial<ContactAddressRow>>({});
  const [phoneDraft, setPhoneDraft] = useState<Partial<ContactPhoneRow>>({});
  const [emailDraft, setEmailDraft] = useState<Partial<ContactEmailRow>>({});

  const openAddr = (row?: ContactAddressRow) => {
    setMode("addr");
    setAddrDraft(row ?? { label: "", lines: "", sort_order: addresses.length });
    dialogRef.current?.showModal();
  };

  const openPhone = (row?: ContactPhoneRow) => {
    setMode("phone");
    setPhoneDraft(row ?? { label: "", number: "", kind: "landline", sort_order: phones.length });
    dialogRef.current?.showModal();
  };

  const openEmail = (row?: ContactEmailRow) => {
    setMode("email");
    setEmailDraft(row ?? { label: "", email: "", sort_order: emails.length });
    dialogRef.current?.showModal();
  };

  const close = () => {
    setMode(null);
    dialogRef.current?.close();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      if (mode === "addr") {
        const res = await saveContactAddress({
          id: addrDraft.id,
          label: addrDraft.label ?? "",
          lines: addrDraft.lines ?? "",
          sort_order: Number(addrDraft.sort_order ?? 0),
        });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
      } else if (mode === "phone") {
        const res = await saveContactPhone({
          id: phoneDraft.id,
          label: phoneDraft.label ?? "",
          number: phoneDraft.number ?? "",
          kind: phoneDraft.kind ?? "landline",
          sort_order: Number(phoneDraft.sort_order ?? 0),
        });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
      } else if (mode === "email") {
        const res = await saveContactEmail({
          id: emailDraft.id,
          label: emailDraft.label ?? "",
          email: emailDraft.email ?? "",
          sort_order: Number(emailDraft.sort_order ?? 0),
        });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
      }
      toast.success("Saved");
      close();
      router.refresh();
    });
  };

  const delAddr = (id: string) => {
    if (!confirm("Delete this address?")) return;
    startTransition(async () => {
      const res = await deleteContactAddress(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Deleted");
      router.refresh();
    });
  };

  const delPhone = (id: string) => {
    if (!confirm("Delete this number?")) return;
    startTransition(async () => {
      const res = await deleteContactPhone(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Deleted");
      router.refresh();
    });
  };

  const delEmail = (id: string) => {
    if (!confirm("Delete this email?")) return;
    startTransition(async () => {
      const res = await deleteContactEmail(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Deleted");
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Contact information</h1>
        <p className="mt-1 text-sm text-zinc-600">Displayed on the Contact page and summarized in the site footer.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-5">
          <CardTitle className="text-base">Addresses</CardTitle>
          <Button type="button" size="sm" className="bg-amber-600 text-white hover:bg-amber-500" onClick={() => openAddr()}>
            Add
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Lines</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {addresses.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">{a.label}</td>
                  <td className="max-w-md whitespace-pre-line px-4 py-3 text-zinc-700">{a.lines}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="outline" size="sm" className="mr-2" onClick={() => openAddr(a)}>
                      Edit
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="text-red-700" onClick={() => delAddr(a.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-5">
          <CardTitle className="text-base">Phones &amp; fax</CardTitle>
          <Button type="button" size="sm" className="bg-amber-600 text-white hover:bg-amber-500" onClick={() => openPhone()}>
            Add
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {phones.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 capitalize">{p.kind}</td>
                  <td className="px-4 py-3">{p.label}</td>
                  <td className="px-4 py-3">{p.number}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="outline" size="sm" className="mr-2" onClick={() => openPhone(p)}>
                      Edit
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="text-red-700" onClick={() => delPhone(p.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-5">
          <CardTitle className="text-base">Emails</CardTitle>
          <Button type="button" size="sm" className="bg-amber-600 text-white hover:bg-amber-500" onClick={() => openEmail()}>
            Add
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {emails.map((em) => (
                <tr key={em.id}>
                  <td className="px-4 py-3">{em.label}</td>
                  <td className="px-4 py-3">{em.email}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="outline" size="sm" className="mr-2" onClick={() => openEmail(em)}>
                      Edit
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="text-red-700" onClick={() => delEmail(em.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <dialog ref={dialogRef} className="w-full max-w-lg rounded-xl border border-zinc-200 p-0 shadow-xl backdrop:bg-black/40">
        <form onSubmit={onSubmit} className="max-h-[90vh] overflow-y-auto p-6">
          {mode === "addr" ? (
            <>
              <h2 className="text-lg font-semibold text-zinc-900">{addrDraft.id ? "Edit address" : "New address"}</h2>
              <div className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="ci-al">Label</Label>
                  <Input id="ci-al" value={addrDraft.label ?? ""} onChange={(e) => setAddrDraft((d) => ({ ...d, label: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="ci-ln">Address (multi-line)</Label>
                  <Textarea
                    id="ci-ln"
                    value={addrDraft.lines ?? ""}
                    onChange={(e) => setAddrDraft((d) => ({ ...d, lines: e.target.value }))}
                    required
                    className="min-h-[100px]"
                  />
                </div>
                <div>
                  <Label htmlFor="ci-as">Sort</Label>
                  <Input
                    id="ci-as"
                    type="number"
                    value={addrDraft.sort_order ?? 0}
                    onChange={(e) => setAddrDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </>
          ) : null}

          {mode === "phone" ? (
            <>
              <h2 className="text-lg font-semibold text-zinc-900">{phoneDraft.id ? "Edit phone" : "New phone / fax"}</h2>
              <div className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="ci-pk">Kind</Label>
                  <select
                    id="ci-pk"
                    value={phoneDraft.kind ?? "landline"}
                    onChange={(e) => setPhoneDraft((d) => ({ ...d, kind: e.target.value as ContactPhoneRow["kind"] }))}
                    className={cn(
                      "mt-1.5 flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm",
                      "focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:outline-none",
                    )}
                  >
                    <option value="landline">Landline</option>
                    <option value="fax">Fax</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="ci-pl">Label</Label>
                  <Input id="ci-pl" value={phoneDraft.label ?? ""} onChange={(e) => setPhoneDraft((d) => ({ ...d, label: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="ci-pn">Number</Label>
                  <Input id="ci-pn" value={phoneDraft.number ?? ""} onChange={(e) => setPhoneDraft((d) => ({ ...d, number: e.target.value }))} required />
                </div>
                <div>
                  <Label htmlFor="ci-ps">Sort</Label>
                  <Input
                    id="ci-ps"
                    type="number"
                    value={phoneDraft.sort_order ?? 0}
                    onChange={(e) => setPhoneDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </>
          ) : null}

          {mode === "email" ? (
            <>
              <h2 className="text-lg font-semibold text-zinc-900">{emailDraft.id ? "Edit email" : "New email"}</h2>
              <div className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="ci-el">Label</Label>
                  <Input id="ci-el" value={emailDraft.label ?? ""} onChange={(e) => setEmailDraft((d) => ({ ...d, label: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="ci-em">Email</Label>
                  <Input
                    id="ci-em"
                    type="email"
                    value={emailDraft.email ?? ""}
                    onChange={(e) => setEmailDraft((d) => ({ ...d, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="ci-es">Sort</Label>
                  <Input
                    id="ci-es"
                    type="number"
                    value={emailDraft.sort_order ?? 0}
                    onChange={(e) => setEmailDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </>
          ) : null}

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !mode} className="bg-amber-600 text-white hover:bg-amber-500">
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
