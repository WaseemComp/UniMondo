import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl: string | null;
  published: boolean;
  createdAt: string;
};

function mapRow(row: Record<string, unknown>): BlogPost {
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    excerpt: String(row.excerpt ?? ""),
    content: String(row.content ?? ""),
    imageUrl: (row.image_url as string | null) ?? null,
    published: Boolean(row.published),
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date(row.created_at as string).toISOString(),
  };
}

export async function getPublishedBlogs(): Promise<BlogPost[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("blogs")
    .select("id, title, slug, excerpt, content, image_url, published, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getPublishedBlogs]", error.message);
    return [];
  }

  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

export async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("blogs")
    .select("id, title, slug, excerpt, content, image_url, published, created_at")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[getBlogBySlug]", error.message);
    return null;
  }

  return mapRow(data as Record<string, unknown>);
}
