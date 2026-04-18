"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitJoinUsForm } from "@/app/admin/cms/public-forms-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormProps = {
  layout?: "section" | "dialog";
  onSuccess?: () => void;
};

export function JoinUsForm({ layout = "section", onSuccess }: FormProps) {
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await submitJoinUsForm({
        full_name: fullName,
        email,
        phone,
        position_applying_for: position,
        preferred_location: preferredLocation,
        current_location: currentLocation,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Application received — our HR team will review and respond.");
      setFullName("");
      setEmail("");
      setPhone("");
      setPosition("");
      setPreferredLocation("");
      setCurrentLocation("");
      onSuccess?.();
    });
  };

  const form = (
    <form onSubmit={onSubmit} className={layout === "section" ? "mt-6 space-y-4" : "space-y-4"}>
        <div>
          <Label htmlFor="ju-name">Full name</Label>
          <Input id="ju-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" required autoComplete="name" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="ju-email">Email</Label>
            <Input
              id="ju-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="ju-phone">Phone</Label>
            <Input id="ju-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" required autoComplete="tel" />
          </div>
        </div>

        <div>
          <Label htmlFor="ju-pos">Position applying for</Label>
          <Input id="ju-pos" value={position} onChange={(e) => setPosition(e.target.value)} className="mt-1.5" required />
        </div>

        <div>
          <Label htmlFor="ju-pref">Preferred location</Label>
          <Input
            id="ju-pref"
            value={preferredLocation}
            onChange={(e) => setPreferredLocation(e.target.value)}
            className="mt-1.5"
            required
          />
        </div>

        <div>
          <Label htmlFor="ju-cur">Current location (optional)</Label>
          <Input id="ju-cur" value={currentLocation} onChange={(e) => setCurrentLocation(e.target.value)} className="mt-1.5" />
        </div>

      <Button type="submit" disabled={pending} className="w-full bg-[#0a1628] text-white hover:bg-[#0a1628]/90 sm:w-auto">
        {pending ? "Submitting…" : "Submit"}
      </Button>
    </form>
  );

  if (layout === "dialog") {
    return <div className="text-slate-900">{form}</div>;
  }

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
      <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-[#0a1628]">Join us</h2>
      <p className="mt-2 text-sm text-slate-600">
        Interested in building a career at UniMondo? Share your details — no file uploads required at this stage.
      </p>
      {form}
    </section>
  );
}
