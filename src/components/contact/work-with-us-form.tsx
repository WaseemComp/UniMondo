"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitWorkWithUsForm } from "@/app/admin/cms/public-forms-actions";
import { WORK_WITH_US_COLLAB_OPTIONS, type WorkWithUsCollaborationNature } from "@/lib/contact-form-options";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FormProps = {
  /** `dialog` hides the outer marketing card (used inside the contact page modal). */
  layout?: "section" | "dialog";
  onSuccess?: () => void;
};

export function WorkWithUsForm({ layout = "section", onSuccess }: FormProps) {
  const [pending, startTransition] = useTransition();
  const [entityType, setEntityType] = useState<"individual" | "organization">("organization");
  const [organizationName, setOrganizationName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [collab, setCollab] = useState<WorkWithUsCollaborationNature>("University partnership");
  const [collabOther, setCollabOther] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await submitWorkWithUsForm({
        entity_type: entityType,
        organization_name: organizationName,
        contact_person_name: contactName,
        email,
        phone,
        collaboration_nature: collab,
        collaboration_other: collabOther,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Thank you — we will reach out shortly.");
      setOrganizationName("");
      setContactName("");
      setEmail("");
      setPhone("");
      setCollabOther("");
      onSuccess?.();
    });
  };

  const form = (
    <form onSubmit={onSubmit} className={cn("space-y-4", layout === "section" && "mt-6")}>
        <fieldset>
          <legend className="text-sm font-medium text-slate-800">Entity type</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {(
              [
                ["individual", "Individual"],
                ["organization", "Organization"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="entity_type"
                  value={value}
                  checked={entityType === value}
                  onChange={() => setEntityType(value)}
                  className="accent-amber-600"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {entityType === "organization" ? (
          <div>
            <Label htmlFor="wwu-org">Organization name</Label>
            <Input
              id="wwu-org"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="mt-1.5"
              required={entityType === "organization"}
              autoComplete="organization"
            />
          </div>
        ) : null}

        <div>
          <Label htmlFor="wwu-contact">Contact person name</Label>
          <Input
            id="wwu-contact"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="mt-1.5"
            required
            autoComplete="name"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="wwu-email">Email</Label>
            <Input
              id="wwu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="wwu-phone">Phone</Label>
            <Input
              id="wwu-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5"
              required
              autoComplete="tel"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="wwu-collab">Nature of collaboration</Label>
          <select
            id="wwu-collab"
            value={collab}
            onChange={(e) => setCollab(e.target.value as WorkWithUsCollaborationNature)}
            className={cn(
              "mt-1.5 flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm",
              "ring-offset-white focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:outline-none",
            )}
          >
            {WORK_WITH_US_COLLAB_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {collab === "Other" ? (
          <div>
            <Label htmlFor="wwu-other">Describe collaboration</Label>
            <Textarea
              id="wwu-other"
              value={collabOther}
              onChange={(e) => setCollabOther(e.target.value)}
              className="mt-1.5 min-h-[88px]"
              required
            />
          </div>
        ) : null}

      <Button type="submit" disabled={pending} className="w-full bg-amber-600 text-white hover:bg-amber-500 sm:w-auto">
        {pending ? "Sending…" : "Submit inquiry"}
      </Button>
    </form>
  );

  if (layout === "dialog") {
    return <div className="text-slate-900">{form}</div>;
  }

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
      <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-[#0a1628]">Work with us</h2>
      <p className="mt-2 text-sm text-slate-600">
        For organizations exploring partnerships, collaborations, or co-marketing with UniMondo.
      </p>
      {form}
    </section>
  );
}
