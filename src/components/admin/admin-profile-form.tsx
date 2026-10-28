"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
export function AdminProfileForm({ displayName }: { displayName: string }) {
  const [name, setName] = useState(displayName),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <form
      className="max-w-xl space-y-3 rounded-xl border bg-white p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const value = name.trim();
        if (!value || value.length > 160) {
          setMessage("Enter a display name of 1–160 characters.");
          return;
        }
        setBusy(true);
        try {
          const client = getSupabaseBrowserClient();
          if (!client) throw new Error("Account service is unavailable.");
          const { error } = await client.auth.updateUser({
            data: { display_name: value },
          });
          if (error) throw error;
          setMessage("Display name updated.");
          router.refresh();
        } catch {
          setMessage("Your display name could not be updated. Please retry.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-lg font-semibold">My profile</h2>
      <label className="block text-sm">
        Full / display name
        <input
          className="mt-1 w-full rounded border p-2"
          value={name}
          maxLength={160}
          required
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <p className="text-sm text-zinc-600">
        Used in your dashboard and account menu. Your assigned designation,
        email and permissions are managed by Superadmin.
      </p>
      <button disabled={busy} className="cms-button-primary" type="submit">
        {busy ? "Saving…" : "Save display name"}
      </button>
      <p role="status" className="text-sm">
        {message}
      </p>
    </form>
  );
}
