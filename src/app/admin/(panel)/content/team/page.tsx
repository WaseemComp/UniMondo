import { TeamMembersManager } from "@/components/admin/cms/team-members-manager";
import type { TeamMemberRow } from "@/lib/data/about-page";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export default async function AdminTeamPage() {
  const svc = createSupabaseServiceClient();
  if (!svc) {
    return (
      <p className="text-sm text-amber-800">
        Configure <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> to manage team members.
      </p>
    );
  }

  const { data, error } = await svc
    .from("team_members")
    .select("id, image_url, name, qualification, bio, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-900">Team members</h1>
        <p className="text-sm text-red-600">
          {error.message.includes("does not exist")
            ? "Run the latest Supabase migrations to create team_members."
            : error.message}
        </p>
      </div>
    );
  }

  return <TeamMembersManager members={(data ?? []) as TeamMemberRow[]} />;
}
