"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AgreementRecord } from "@/types/agreement";

export function AgreementActions({ agreement, isSuper }: { agreement: AgreementRecord; isSuper: boolean }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function update(method: "PATCH" | "DELETE", status?: string) {
    if (method === "DELETE" && !window.confirm(`Delete ${agreement.referenceNumber}? Finalized revisions and audit history will be retained.`)) return;
    setPending(true);
    try {
      const response = await fetch(`/api/admin/agreements/${agreement.id}`, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, version: agreement.version }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Agreement action failed.");
      toast.success(method === "DELETE" ? "Agreement deleted." : "Agreement status updated.");
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Agreement action failed."); }
    finally { setPending(false); }
  }
  if (!isSuper) return <span>{agreement.status === "finalized" ? "Finalized" : "Draft"}{agreement.hasDraftRevision && agreement.status === "finalized" ? " · Draft revision pending" : ""}</span>;
  return <div className="flex flex-wrap items-center gap-2">
    <select aria-label={`Status for ${agreement.referenceNumber}`} disabled={pending} value={agreement.status}
      onChange={e => update("PATCH", e.target.value)} className="rounded border border-zinc-300 bg-white p-1.5">
      <option value="draft">Draft</option><option value="finalized">Finalized</option>
    </select>
    {agreement.hasDraftRevision && agreement.status === "finalized" && <button disabled={pending} onClick={() => update("PATCH", "finalized")} className="rounded border border-zinc-300 px-2 py-1.5">Finalize revision</button>}
    <button disabled={pending} onClick={() => update("DELETE")} className="rounded border border-red-200 px-2 py-1.5 text-red-700">Delete</button>
  </div>;
}
