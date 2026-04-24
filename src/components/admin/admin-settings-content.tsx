import { AdminChangePasswordForm } from "@/components/admin/admin-change-password-form";
import { AdminUsersManager } from "@/components/admin/admin-users-manager";
import type { AdminAccessContext } from "@/lib/auth/admin";
import type { AdminProfileRow } from "@/app/admin/cms/admin-users-actions";

type Props = {
  access: AdminAccessContext;
  currentUserId: string;
  adminRows: AdminProfileRow[];
};

export function AdminSettingsContent({ access, currentUserId, adminRows }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Team & account</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {access.isSuper
            ? "Invite other admins, set their site areas, and manage your own password. Only super admins can change other users’ access."
            : "Update your own password. Contact your super admin if you need a different level of access."}
        </p>
      </div>
      {access.isSuper ? <AdminUsersManager initialRows={adminRows} currentUserId={currentUserId} /> : null}
      <AdminChangePasswordForm />
    </div>
  );
}
