import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-200/80 bg-white p-8 shadow-sm">
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950">
          Internal use only — UniMondo staff. Student applications belong on the public Apply flow, not here.
        </p>
        <h1 className="mt-5 font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#0a1628]">Admin sign in</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Sign in with your Supabase Auth account. Access is limited to emails listed in{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">ADMIN_EMAILS</code>.
        </p>
        <div className="mt-6">
          <Suspense fallback={<p className="text-sm text-zinc-500">Loading form…</p>}>
            <AdminLoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
