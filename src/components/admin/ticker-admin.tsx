"use client";

import { useMemo, useState } from "react";
import { deleteTickerItem, upsertTickerItem } from "@/app/admin/actions";

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

  const sorted = useMemo(() => [...rows].sort((a, b) => a.sort_order - b.sort_order), [rows]);

  async function save(row: Row) {
    setError(null);
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
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this ticker line?")) return;
    setError(null);
    try {
      await deleteTickerItem(id);
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function addNew() {
    setError(null);
    try {
      await upsertTickerItem({
        message: "New announcement",
        href: "/contact",
        sortOrder: (rows[rows.length - 1]?.sort_order ?? 0) + 1,
        isPublished: true,
      });
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add failed");
    }
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="space-y-4">
        {sorted.map((row) => (
          <div key={row.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="font-medium text-zinc-700">Message</span>
                <input
                  value={row.message}
                  onChange={(e) =>
                    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, message: e.target.value } : x)))
                  }
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
                />
              </label>
              <label className="text-sm">
                <span className="font-medium text-zinc-700">Link (path)</span>
                <input
                  value={row.href ?? ""}
                  onChange={(e) =>
                    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, href: e.target.value || null } : x)))
                  }
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
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
                  onChange={(e) =>
                    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, is_published: e.target.checked } : x)))
                  }
                />
                Published
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => save(row)}
                className="rounded-lg bg-[#0a1628] px-4 py-1.5 text-sm font-medium text-white"
              >
                Save
              </button>
              <button type="button" onClick={() => remove(row.id)} className="text-sm text-red-700 hover:underline">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addNew}
        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800"
      >
        Add ticker line
      </button>
    </div>
  );
}
