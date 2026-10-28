import Link from "next/link";
import { academicAccess } from "@/lib/academic/server";
export default async function Page() {
  const { permissions } = await academicAccess();
  const items = [
    {
      kind: "countries" as const,
      title: "Destinations",
      href: "/admin/destinations/countries",
      description:
        "Country guides, images, costs, scholarships and public visibility.",
    },
    {
      kind: "universities" as const,
      title: "Universities",
      href: "/admin/universities",
      description:
        "Institutions, destination relationships, images and official information.",
    },
    {
      kind: "programmes" as const,
      title: "Academic programmes",
      href: "/admin/programs",
      description:
        "Individual degrees, requirements, fees, admissions and official verification.",
    },
  ];
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Academic catalogue</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Manage existing destinations, universities and academic programmes
          without changing their established identities.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {items
          .filter((item) => permissions[item.kind].view)
          .map((item) => (
            <Link
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm hover:border-[#2C786D]"
              key={item.kind}
              href={item.href}
            >
              <h2 className="font-semibold text-[#2C786D]">{item.title}</h2>
              <p className="mt-3 text-sm text-zinc-600">{item.description}</p>
              <span className="mt-5 inline-block text-sm font-semibold">
                Open catalogue →
              </span>
            </Link>
          ))}
      </div>
      <Link className="text-sm text-[#2C786D] underline" href="/admin/home">
        Manage homepage featured selections
      </Link>
    </div>
  );
}
