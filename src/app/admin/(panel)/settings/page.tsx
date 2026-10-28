import Link from "next/link";
import { AdminChangePasswordForm } from "@/components/admin/admin-change-password-form";
import { AdminProfileForm } from "@/components/admin/admin-profile-form";
import { requireAdminUser } from "@/app/admin/require-admin";
import { isSuperAdmin } from "@/lib/auth/admin";
import { staffDisplayName } from "@/lib/auth/staff-identity";
export default async function SettingsPage() {
  const user = await requireAdminUser();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-zinc-600">
          Your profile, password and available site settings.
        </p>
      </header>
      <section id="account">
        <AdminProfileForm displayName={staffDisplayName(user)} />
      </section>
      <AdminChangePasswordForm />
      {(await isSuperAdmin(user)) && (
        <div className="flex flex-wrap gap-3">
          <Link
            className="cms-button-secondary"
            href="/admin/settings/currencies"
          >
            Currencies
          </Link>
          <Link className="cms-button-secondary" href="/admin/team">
            Team &amp; Permissions
          </Link>
        </div>
      )}
    </div>
  );
}
