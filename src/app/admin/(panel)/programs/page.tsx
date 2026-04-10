import { ProgramsManager, type ProgramAdminRow } from "@/components/admin/cms/programs-manager";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export default async function AdminProgramsCmsPage() {
  const svc = createSupabaseServiceClient();
  if (!svc) {
    return (
      <p className="text-sm text-amber-800">
        Configure <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> to manage programs.
      </p>
    );
  }

  const { data, error } = await svc.from("programs").select("*").order("sort_order", { ascending: true });

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-900">Programs</h1>
        <p className="text-sm text-red-600">
          {error.message.includes("does not exist")
            ? "Run the latest Supabase migrations to create the programs table."
            : error.message}
        </p>
      </div>
    );
  }

  return <ProgramsManager programs={(data ?? []) as ProgramAdminRow[]} />;
}
