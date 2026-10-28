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
  return <details className="relative inline-block text-left">
    <summary className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 font-medium">Actions</summary>
    <div className="relative z-20 mt-1 grid min-w-48 gap-1 rounded-xl border bg-white p-2 shadow-lg [&>a]:rounded [&>a]:px-3 [&>a]:py-2 [&>a:hover]:bg-zinc-50 [&>button]:rounded [&>button]:px-3 [&>button]:py-2 [&>button]:text-left">
      <a href={`/admin/agreements/${agreement.id}`}>Edit draft</a>
      <a href={`/api/admin/agreements/${agreement.id}/export?format=docx`}>Download Word</a>
      <a href={`/api/admin/agreements/${agreement.id}/export?format=pdf`}>Download PDF</a>
      <a href={`/admin/agreements/${agreement.id}/print`} target="_blank" rel="noreferrer">Print agreement</a>
      <a href={`/admin/agreements/${agreement.id}/revisions`}>Revision history</a>
      {isSuper&&<>
        {(agreement.status==="draft"||agreement.hasDraftRevision)&&<button disabled={pending} onClick={()=>{if(window.confirm("Finalize this saved draft as a new immutable revision?"))update("PATCH","finalized");}}>{agreement.revisionNumber || agreement.status === "finalized" ? "Finalize revision" : "Finalize agreement"}</button>}
        {agreement.status==="finalized"&&<button disabled={pending} onClick={()=>update("PATCH","draft")}>Reopen as draft</button>}
        <button disabled={pending} onClick={()=>update("DELETE")} className="text-red-700">Delete agreement</button>
      </>}
    </div>
  </details>;
}
