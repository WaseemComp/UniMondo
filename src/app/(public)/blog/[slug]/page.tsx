import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogBySlug } from "@/lib/data/blogs";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);
  if (!post) {
    return {
      title: "Blog Post | UniMondo",
      alternates: {
        canonical: `/blog/${slug}`,
      },
    };
  }
  return {
    title: `${post.title} | UniMondo Blog`,
    description: post.excerpt || undefined,
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      url: `/blog/${slug}`,
      images: post.imageUrl ? [{ url: post.imageUrl }] : [],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <Link href="/blog" className="text-sm font-semibold text-[#244B50] hover:underline">
        ← All posts
      </Link>
      <article className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9AB76]">Blog & Insights</p>
        <h1 className="mt-3 font-[family-name:var(--font-editorial)] text-3xl font-normal text-[#244B50] sm:text-4xl md:text-5xl">
          {post.title}
        </h1>
        {post.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary CMS URLs
          <img src={post.imageUrl} alt="" className="mt-8 w-full rounded-2xl border border-[#E2DFD8] object-cover" />
        ) : null}
        {post.excerpt ? <p className="mt-6 text-lg text-[#4D5F64] leading-relaxed">{post.excerpt}</p> : null}
        <div className="prose prose-slate mt-8 max-w-none">
          <div className="whitespace-pre-wrap text-base leading-7 text-[#26343B]">{post.content}</div>
        </div>
      </article>
    </main>
  );
}

