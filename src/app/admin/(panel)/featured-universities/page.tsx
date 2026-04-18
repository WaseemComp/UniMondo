import {
  FeaturedUniversitiesManager,
  type FeaturedUniversityAdminRow,
} from "@/components/admin/cms/featured-universities-manager";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export default async function AdminFeaturedUniversitiesPage() {
  const svc = createSupabaseServiceClient();
  if (!svc) {
    return (
      <p className="text-sm text-amber-800">
        Configure <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> to manage featured
        universities.
      </p>
    );
  }

  const { data, error } = await svc.from("featured_universities").select("*").order("sort_order", { ascending: true });

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-900">Featured universities</h1>
        <p className="text-sm text-red-600">
          {error.message.includes("does not exist")
            ? "Run the latest Supabase migration (featured_universities + storage bucket)."
            : error.message}
        </p>
      </div>
    );
  }

  return <FeaturedUniversitiesManager universities={(data ?? []) as FeaturedUniversityAdminRow[]} />;
}
