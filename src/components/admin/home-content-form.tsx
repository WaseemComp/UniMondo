"use client";

import { useState } from "react";
import { saveSiteContent } from "@/app/admin/actions";
import type { SiteContentMap } from "@/lib/data/site-content";

const KEYS = [
  { key: "home.hero.title", label: "Hero headline" },
  { key: "home.hero.subtitle", label: "Hero paragraph" },
  { key: "home.hero.cta_explore", label: "Primary button (Explore programs)" },
  { key: "home.hero.cta_apply", label: "Secondary button (Apply)" },
  { key: "home.ticker.enabled", label: "Show news ticker (type true or false)" },
] as const;

export function HomeContentForm({ initial }: { initial: SiteContentMap }) {
  const [values, setValues] = useState(() => {
    const v: Record<string, string> = {};
    for (const { key } of KEYS) {
      v[key] = initial[key] ?? "";
    }
    return v;
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage(null);
    try {
      await saveSiteContent(KEYS.map(({ key }) => ({ key, value: values[key] ?? "" })));
      setStatus("saved");
      setMessage("Saved. Public site will refresh shortly.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      {KEYS.map(({ key, label }) => (
        <label key={key} className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-800">{label}</span>
          {key === "home.hero.subtitle" ? (
            <textarea
              value={values[key]}
              onChange={(e) => setValues((s) => ({ ...s, [key]: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          ) : (
            <input
              value={values[key]}
              onChange={(e) => setValues((s) => ({ ...s, [key]: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          )}
        </label>
      ))}
      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-lg bg-[#0a1628] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#132a4a] disabled:opacity-60"
      >
        {status === "saving" ? "Saving…" : "Save homepage"}
      </button>
    </form>
  );
}
