"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createAdminUser,
  listAdminUsers,
  removeAdminAccess,
  type AdminProfileRow,
  updateAdminPermissions,
} from "@/app/admin/cms/admin-users-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AdminAreaPermission } from "@/lib/auth/admin";

const AREAS: { key: AdminAreaPermission; label: string }[] = [
  { key: "academic", label: "Academic & catalog" },
  { key: "content", label: "Site content" },
  { key: "applications", label: "Applications" },
  { key: "submissions", label: "Submissions" },
];

type Perms = Record<AdminAreaPermission, boolean>;

function toPerms(row: AdminProfileRow): Perms {
  const p = (row.permissions ?? {}) as Record<string, boolean>;
  return {
    academic: p.academic !== false,
    content: p.content !== false,
    applications: p.applications !== false,
    submissions: p.submissions !== false,
  };
}

type Props = {
  initialRows: AdminProfileRow[];
  currentUserId: string;
};

export function AdminUsersManager({ initialRows, currentUserId }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPerms, setNewPerms] = useState<Perms>({ academic: true, content: true, applications: true, submissions: true });
  const [edits, setEdits] = useState<Record<string, Perms>>({});
  const [pending, startTransition] = useTransition();

  const getEdit = (row: AdminProfileRow): Perms => edits[row.user_id] ?? toPerms(row);

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createAdminUser({ email, password, permissions: newPerms });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("User created — they can sign in with this email and password");
      setEmail("");
      setPassword("");
      const list = await listAdminUsers();
      if (list.ok) setRows(list.rows);
      router.refresh();
    });
  };

  const onSaveRow = (row: AdminProfileRow) => {
    if (row.is_super_admin) return;
    const perms = getEdit(row);
    startTransition(async () => {
      const res = await updateAdminPermissions({ userId: row.user_id, permissions: perms });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Permissions updated");
      setEdits((m) => {
        const c = { ...m };
        delete c[row.user_id];
        return c;
      });
      const list = await listAdminUsers();
      if (list.ok) setRows(list.rows);
      router.refresh();
    });
  };

  const onRemove = (userId: string) => {
    if (!confirm("Remove admin access and delete this login?")) return;
    startTransition(async () => {
      const res = await removeAdminAccess(userId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Access removed");
      setRows((r) => r.filter((x) => x.user_id !== userId));
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="p-0">
          <CardTitle className="px-5 py-3 text-base">Add admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid gap-4 sm:max-w-md">
            <p className="text-sm text-zinc-600">
              Only a super admin can add staff. You set which areas this account may use. Only you can change those
              permissions later (not the new user). They can change their own password in this screen.
            </p>
            <div>
              <Label htmlFor="nu-email">Email</Label>
              <Input id="nu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="nu-pw">Initial password</Label>
              <Input id="nu-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="mt-1.5" />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-zinc-800">Access</span>
              {AREAS.map((a) => (
                <label key={a.key} className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={newPerms[a.key]}
                    onChange={(e) => setNewPerms((m) => ({ ...m, [a.key]: e.target.checked }))}
                  />
                  {a.label}
                </label>
              ))}
            </div>
            <Button type="submit" disabled={pending} className={cn("w-fit bg-amber-600 text-white hover:bg-amber-500")}>
              {pending ? "Creating…" : "Create admin"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-0">
          <CardTitle className="px-5 py-3 text-base">Admins & permissions</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                {AREAS.map((a) => (
                  <th key={a.key} className="px-2 py-3 text-center">
                    {a.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row) => {
                const ed = getEdit(row);
                const isSelf = row.user_id === currentUserId;
                return (
                  <tr key={row.user_id} className="align-top">
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {row.email}
                      {row.is_super_admin ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                          Super
                        </span>
                      ) : null}
                    </td>
                    {AREAS.map((a) => (
                      <td key={a.key} className="px-2 py-3 text-center">
                        {row.is_super_admin ? (
                          <span className="text-zinc-400">—</span>
                        ) : (
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={ed[a.key]}
                            onChange={(e) =>
                              setEdits((m) => ({
                                ...m,
                                [row.user_id]: { ...ed, [a.key]: e.target.checked },
                              }))
                            }
                          />
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      {row.is_super_admin || isSelf ? (
                        <span className="text-zinc-400">—</span>
                      ) : (
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button type="button" size="sm" className="bg-amber-600 text-white hover:bg-amber-500" onClick={() => onSaveRow(row)} disabled={pending}>
                            Save
                          </Button>
                          <Button type="button" size="sm" variant="outline" className="text-red-700" onClick={() => onRemove(row.user_id)} disabled={pending}>
                            Remove
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
