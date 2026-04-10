import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogBySlug } from "@/lib/data/blogs";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 60;

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <Link href="/blog" className="text-sm font-semibold text-amber-800 hover:underline">
        ← All posts
      </Link>
      <article className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Blog</p>
        <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold text-[#0a1628] sm:text-4xl">
          {post.title}
        </h1>
        {post.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary CMS URLs
          <img src={post.imageUrl} alt="" className="mt-8 w-full rounded-2xl border border-slate-200 object-cover" />
        ) : null}
        {post.excerpt ? <p className="mt-6 text-lg text-slate-600">{post.excerpt}</p> : null}
        <div className="prose prose-slate mt-8 max-w-none">
          <div className="whitespace-pre-wrap text-base leading-7 text-slate-700">{post.content}</div>
        </div>
      </article>
    </main>
  );
}
