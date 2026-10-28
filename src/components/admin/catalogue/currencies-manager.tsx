"use client";
import { useState, useTransition } from "react";
import { saveCurrency } from "@/app/admin/cms/currencies-actions";
import type { Currency } from "@/lib/currencies/model";
export function CurrenciesManager({
  currencies,
  ready,
}: {
  currencies: Currency[];
  ready: boolean;
}) {
  const [rows, setRows] = useState(currencies),
    [draft, setDraft] = useState<Currency>({
      code: "",
      name: "",
      symbol: "",
      decimals: 2,
      active: true,
    }),
    [editing, setEditing] = useState(false),
    [message, setMessage] = useState(""),
    [busy, start] = useTransition();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Currencies</h1>
      <p className="text-sm text-zinc-600">
        Select a denomination; this registry does not convert prices. Agreements
        retain their seven separately validated currencies. Currency codes
        cannot be renamed or deleted, and referenced precision is protected.
      </p>
      {!ready && (
        <p role="alert">
          Currency setup is pending the owner’s manual migration. Saving is
          disabled.
        </p>
      )}
      <button
        className="cms-button-secondary"
        onClick={() => {
          setEditing(false);
          setDraft({
            code: "",
            name: "",
            symbol: "",
            decimals: 2,
            active: true,
          });
        }}
      >
        Add currency
      </button>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((c) => (
          <button
            className="rounded-xl border bg-white p-4 text-left"
            key={c.code}
            onClick={() => {
              setEditing(true);
              setDraft(c);
            }}
          >
            {c.code} · {c.name} · {c.symbol} · {c.decimals} decimal places ·{" "}
            {c.active ? "Active" : "Inactive"}
          </button>
        ))}
      </div>
      <form
        className="grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const result = await saveCurrency(draft);
            if (result.ok) {
              setRows((old) => [
                ...old.filter((c) => c.code !== draft.code),
                draft,
              ]);
              setEditing(true);
              setMessage("Currency saved.");
            } else setMessage(result.error || "Save failed.");
          });
        }}
      >
        {["code", "name", "symbol"].map((key) => (
          <label key={key} className="text-sm">
            {key === "code"
              ? "Currency code"
              : key === "name"
                ? "Currency name"
                : "Symbol"}
            <input
              className="mt-1 w-full rounded border p-2"
              disabled={key === "code" && editing}
              required
              value={draft[key as "code" | "name" | "symbol"]}
              onChange={(e) =>
                setDraft((c) => ({
                  ...c,
                  [key]:
                    key === "code"
                      ? e.target.value.toUpperCase()
                      : e.target.value,
                }))
              }
            />
          </label>
        ))}
        <label className="text-sm">
          Decimal places
          <input
            className="mt-1 w-full rounded border p-2"
            type="number"
            min={0}
            max={4}
            value={draft.decimals}
            onChange={(e) =>
              setDraft((c) => ({ ...c, decimals: Number(e.target.value) }))
            }
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) =>
              setDraft((c) => ({ ...c, active: e.target.checked }))
            }
          />{" "}
          Active for new price selections
        </label>
        <button className="cms-button-primary" disabled={!ready || busy}>
          Save currency
        </button>
        <p role="status">{message}</p>
      </form>
    </div>
  );
}
