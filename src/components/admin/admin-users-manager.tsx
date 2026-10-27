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
  updateAdminPermissionsV2,
} from "@/app/admin/cms/admin-users-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CenteredModal } from "@/components/ui/centered-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminAreaPermission } from "@/lib/auth/admin";
import { PermissionMatrix } from "@/components/admin/permission-matrix";
import { deniedDetailedPermissions } from "@/lib/auth/permission-selection";

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
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [newPerms, setNewPerms] = useState(deniedDetailedPermissions);
  const [edits, setEdits] = useState<Record<string, Perms>>({});
  const [permV2Edits, setPermV2Edits] = useState<Record<string, Record<string, boolean>>>({});
  const [permDialogUser, setPermDialogUser] = useState<AdminProfileRow | null>(null);
  const [pending, startTransition] = useTransition();

  const getEdit = (row: AdminProfileRow): Perms => edits[row.user_id] ?? toPerms(row);
  const getV2 = (row: AdminProfileRow): Record<string, boolean> => permV2Edits[row.user_id] ?? (row.permissions_v2 ?? {});

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await createAdminUser({ fullName, designation, email, password, permissionsV2: newPerms });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Staff account created. Profile and detailed permissions are saved; the login is ready.");
        setFullName("");
        setDesignation("");
        setEmail("");
        setNewPerms(deniedDetailedPermissions());
        setRows(current => [...current, res.row].sort((a, b) => a.email.localeCompare(b.email)));
        router.refresh();
      } catch {
        toast.error("Account creation could not be confirmed. Refresh the staff list before trying again.");
      } finally {
        setPassword("");
      }
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

  const openPermDialog = (row: AdminProfileRow) => {
    setPermDialogUser(row);
  };

  const saveV2 = (row: AdminProfileRow) => {
    startTransition(async () => {
      const res = await updateAdminPermissionsV2({ userId: row.user_id, permissionsV2: getV2(row) });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Detailed permissions updated");
      setPermDialogUser(null);
      setPermV2Edits((m) => {
        const c = { ...m };
        delete c[row.user_id];
        return c;
      });
      const list = await listAdminUsers();
      if (list.ok) setRows(list.rows);
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="p-0">
          <CardTitle className="px-5 py-3 text-base">Add Admin/Staff</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="space-y-6">
            <p className="max-w-2xl text-sm text-zinc-600">
              Set the staff member’s identity and detailed access before creating their login. Only Superadmins can manage staff access; staff can change their own password.
            </p>
            <fieldset disabled={pending} className="space-y-4">
              <legend className="mb-3 font-semibold text-zinc-900">A — Staff Information</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="nu-name">Full Name</Label>
                  <Input id="nu-name" value={fullName} onChange={e => setFullName(e.target.value)} required maxLength={160} autoComplete="off" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="nu-designation">Designation</Label>
                  <Input id="nu-designation" value={designation} onChange={e => setDesignation(e.target.value)} required maxLength={160} autoComplete="off" className="mt-1.5" />
                </div>
              </div>
            </fieldset>
            <fieldset disabled={pending} className="space-y-3">
              <legend className="mb-2 font-semibold text-zinc-900">B — Detailed Access Permissions</legend>
              <p className="text-sm text-zinc-600">Unselected permissions are denied. Expand a category to choose access. Superadmin-only actions remain reserved for Superadmins.</p>
              <PermissionMatrix value={newPerms} onChange={setNewPerms} idPrefix="new-staff" disabled={pending} />
            </fieldset>
            <fieldset disabled={pending} className="space-y-4">
              <legend className="mb-3 font-semibold text-zinc-900">C — Account Credentials</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="nu-email">Email Address</Label>
                  <Input id="nu-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="off" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="nu-pw">Initial Password</Label>
                  <Input id="nu-pw" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" className="mt-1.5" />
                </div>
              </div>
            </fieldset>
            <Button type="submit" disabled={pending} className="w-full bg-amber-600 text-white hover:bg-amber-500 sm:w-auto">
              {pending ? "Creating…" : "Create Staff Account"}
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
                      {row.full_name && row.full_name !== row.email ? <p className="font-semibold">{row.full_name}</p> : null}
                      {row.designation ? <p className="text-xs font-normal text-zinc-600">{row.designation}</p> : null}
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
                          <Button type="button" size="sm" variant="outline" onClick={() => openPermDialog(row)} disabled={pending}>
                            Detailed
                          </Button>
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

      <CenteredModal
        open={Boolean(permDialogUser)}
        onClose={() => setPermDialogUser(null)}
        title="Users & permissions"
        subtitle={permDialogUser?.email ? `Detailed permissions for ${permDialogUser.email}` : undefined}
        wide
        lockBodyScroll
      >
        {permDialogUser ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
              <p className="font-semibold text-zinc-900">How this works</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Super admins always have full access.</li>
                <li>
                  If you set any detailed permission, the user enters <span className="font-semibold">strict mode</span>: missing keys are denied.
                </li>
                <li>Use “Enable all / Disable all” per section, then adjust individual permissions.</li>
              </ul>
            </div>

            <PermissionMatrix value={getV2(permDialogUser)} idPrefix={`staff-${permDialogUser.user_id}`} disabled={pending}
              onChange={next => setPermV2Edits(current => ({ ...current, [permDialogUser.user_id]: next }))} />

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPermDialogUser(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-[#0a1628] text-white hover:bg-[#132a4a]"
                onClick={() => saveV2(permDialogUser)}
                disabled={pending}
              >
                {pending ? "Saving…" : "Save detailed permissions"}
              </Button>
            </div>
          </div>
        ) : null}
      </CenteredModal>
    </div>
  );
}
