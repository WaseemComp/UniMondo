import Link from "next/link";
import { getLocale } from "next-intl/server";
import { getLocalized } from "@/lib/i18n/getLocalized";

type Course = {
  id: string;
  title: Record<string, string>;
  country: string | null;
  city: string | null;
  duration: string | null;
  price: number | null;
  description: Record<string, string> | null;
};

export default async function CoursesPage() {
  const locale = (await getLocale()) as "en" | "ar" | "de" | "fr";
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/courses`, { cache: "no-store" });
  const data = (await res.json()) as { courses: Course[] };
  const courses = data.courses ?? [];

  return (
    <main className="min-w-0 bg-zinc-50/80">
      <section className="border-b border-white/10 bg-[#0a1628] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/90">Courses</p>
          <h1 className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Language courses
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
            Explore active language courses and apply in minutes.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {courses.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600">
            No courses available yet.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => {
              const title = getLocalized<string>(c.title, locale) ?? c.title?.en ?? "Untitled course";
              return (
                <article key={c.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    {(c.country ?? "—") + (c.city ? ` · ${c.city}` : "")}
                  </p>
                  <p className="mt-3 text-sm text-zinc-700">
                    {c.duration ? <span className="font-medium">Duration:</span> : null} {c.duration ?? ""}
                    {c.price != null ? (
                      <span className="ml-2">
                        <span className="font-medium">Price:</span> £{c.price}
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-4">
                    <Link
                      href={`/${locale}/apply?type=language_course`}
                      className="inline-flex rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-[#0a1628] hover:bg-amber-400"
                    >
                      Apply
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

