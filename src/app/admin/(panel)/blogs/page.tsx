import { BlogsManager, type BlogAdminRow } from "@/components/admin/cms/blogs-manager";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export default async function AdminBlogsPage() {
  const svc = createSupabaseServiceClient();
  if (!svc) {
    return (
      <p className="text-sm text-amber-800">
        Configure <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> to manage blog posts.
      </p>
    );
  }

  const { data, error } = await svc.from("blogs").select("*").order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-900">Blog</h1>
        <p className="text-sm text-red-600">
          {error.message.includes("does not exist")
            ? "Run the latest Supabase migrations to create the blogs table."
            : error.message}
        </p>
      </div>
    );
  }

  return <BlogsManager blogs={(data ?? []) as BlogAdminRow[]} />;
}
