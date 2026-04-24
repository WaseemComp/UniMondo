"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteTickerItem, upsertTickerItem } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  message: string;
  href: string | null;
  sort_order: number;
  is_published: boolean;
};

export function TickerAdminClient({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addPending, startAdd] = useTransition();

  const sorted = useMemo(() => [...rows].sort((a, b) => a.sort_order - b.sort_order), [rows]);

  async function save(row: Row) {
    setError(null);
    setSavingId(row.id);
    try {
      await upsertTickerItem({
        id: row.id,
        message: row.message,
        href: row.href ?? "",
        sortOrder: row.sort_order,
        isPublished: row.is_published,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this ticker line?")) return;
    setError(null);
    setDeletingId(id);
    try {
      await deleteTickerItem(id);
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  function addNew() {
    setError(null);
    startAdd(async () => {
      try {
        await upsertTickerItem({
          message: "New announcement",
          href: "",
          sortOrder: (rows[rows.length - 1]?.sort_order ?? 0) + 1,
          isPublished: true,
        });
        window.location.reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Add failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
        <p className="font-medium">Link (path) is optional</p>
        <p className="mt-1 text-amber-900/90">
          The strip appears on <strong>every</strong> public page, no matter which tab the visitor is on. If you add a
          path like <code className="rounded bg-white/80 px-1">/contact</code>, that line becomes a <strong>clickable</strong> link to
          that page. Leave the field <strong>empty</strong> for a plain line of text.
        </p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="space-y-4">
        {sorted.map((row) => (
          <div key={row.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="font-medium text-zinc-700">Message</span>
                <input
                  value={row.message}
                  onChange={(e) => setRows((r) => r.map((x) => (x.id === row.id ? { ...x, message: e.target.value } : x)))}
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
                />
              </label>
              <label className="text-sm">
                <span className="font-medium text-zinc-700">Link path (optional)</span>
                <input
                  value={row.href ?? ""}
                  onChange={(e) =>
                    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, href: e.target.value || null } : x)))
                  }
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
                  placeholder="e.g. /contact (or leave empty)"
                />
              </label>
              <label className="text-sm">
                <span className="font-medium text-zinc-700">Sort order</span>
                <input
                  type="number"
                  value={row.sort_order}
                  onChange={(e) =>
                    setRows((r) =>
                      r.map((x) => (x.id === row.id ? { ...x, sort_order: Number(e.target.value) || 0 } : x)),
                    )
                  }
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={row.is_published}
                  onChange={(e) => setRows((r) => r.map((x) => (x.id === row.id ? { ...x, is_published: e.target.checked } : x)))}
                />
                Published
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => save(row)}
                disabled={savingId === row.id}
                className={cn("min-w-[88px] bg-amber-600 text-white hover:bg-amber-500")}
              >
                {savingId === row.id ? "Saving…" : "Save"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => remove(row.id)}
                disabled={deletingId === row.id}
                className="text-red-700"
              >
                {deletingId === row.id ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={addNew}
        disabled={addPending}
        className="border-zinc-300"
      >
        {addPending ? "Adding…" : "Add ticker line"}
      </Button>
    </div>
  );
}
