import Link from "next/link";
import { getPublishedBlogs } from "@/lib/data/blogs";

export const revalidate = 60;

export default async function BlogPage() {
  const posts = await getPublishedBlogs();

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Blog</p>
      <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold text-[#0a1628]">Guides & updates</h1>
      <p className="mt-4 text-slate-600">Admissions tips, visa notes, and student life in Europe.</p>

      {!posts.length ? (
        <p className="mt-10 text-sm text-slate-500">New articles are on the way.{" "}
          <Link href="/contact" className="font-semibold text-amber-800 underline-offset-4 hover:underline">
            Contact us
          </Link>{" "}
          for a consultation in the meantime.
        </p>
      ) : (
        <ul className="mt-10 space-y-6">
          {posts.map((post) => (
            <li key={post.id}>
              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-amber-200/80">
                <Link href={`/blog/${post.slug}`} className="group">
                  <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-[#0a1628] group-hover:text-amber-800">
                    {post.title}
                  </h2>
                </Link>
                {post.excerpt ? <p className="mt-2 text-sm text-slate-600">{post.excerpt}</p> : null}
                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-3 inline-flex text-sm font-semibold text-amber-800 underline-offset-4 hover:underline"
                >
                  Read more
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/"
        className="mt-10 inline-flex rounded-full bg-[#0a1628] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#132a4a]"
      >
        Back to home
      </Link>
    </main>
  );
}
