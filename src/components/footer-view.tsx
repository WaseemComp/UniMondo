import Image from "next/image";
import Link from "next/link";
import { Globe, Mail, MapPin, Phone, Camera, Play } from "lucide-react";
import type { FooterConfig } from "@/lib/footer/model";
const icons = { website: Globe, email: Mail, instagram: Camera, youtube: Play };
function Notice({ notice }: { notice: FooterConfig["notices"][number] }) {
  const links = notice.links.filter((link) => link.visible),
    segments: React.ReactNode[] = [];
  let remaining = notice.text,
    index = 0;
  while (remaining) {
    const next = links
      .map((link) => ({ link, at: remaining.indexOf(link.label) }))
      .filter((item) => item.at >= 0)
      .sort((a, b) => a.at - b.at)[0];
    if (!next) {
      segments.push(remaining);
      break;
    }
    segments.push(
      remaining.slice(0, next.at),
      <Link
        key={index++}
        href={next.link.href}
        className="underline underline-offset-2 hover:text-[#244B50]"
      >
        {next.link.label}
      </Link>,
    );
    remaining = remaining.slice(next.at + next.link.label.length);
  }
  return (
    <p>
      {segments}
      {links
        .filter((link) => !notice.text.includes(link.label))
        .map((link) => (
          <Link
            className="ml-3 underline underline-offset-2"
            key={link.id}
            href={link.href}
          >
            {link.label}
          </Link>
        ))}
    </p>
  );
}
/** Shared public renderer: the footer editor previews this exact component. */
export function FooterView({
  config,
  year = new Date().getFullYear(),
}: {
  config: FooterConfig;
  year?: number;
}) {
  if (!config.visible) return null;
  return (
    <footer className="um-footer border-t border-[#D9E2E8] bg-[#E4F1F7] text-[#2F3E46]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {config.sections
          .filter((section) => section.visible)
          .map((section) => (
            <div
              key={section.id}
              className={`min-w-0 break-words ${section.id === "branding" ? "sm:col-span-2 lg:col-span-1" : ""}`}
            >
              {section.id === "branding" ? (
                <>
                  {config.logoUrl ? (
                    <Image
                      src={config.logoUrl}
                      alt={config.logoAlt}
                      width={240}
                      height={80}
                      sizes="240px"
                      className="mb-4 h-auto max-h-20 w-auto max-w-full object-contain object-left"
                    />
                  ) : (
                    <p className="font-[family-name:var(--font-editorial)] text-2xl font-bold tracking-tight text-[#244B50]">
                      {config.brandName}
                    </p>
                  )}
                  <p className="mt-3 max-w-xs whitespace-pre-line text-sm leading-relaxed">
                    {config.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {config.social
                      .filter((link) => link.visible)
                      .map((link) => {
                        const Icon =
                          link.icon in icons
                            ? icons[link.icon as keyof typeof icons]
                            : null;
                        return (
                          <a
                            key={link.id}
                            href={link.href}
                            {...(link.href.startsWith("https:")
                              ? { target: "_blank", rel: "noopener noreferrer" }
                              : {})}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#244B50]/25 text-[#244B50] transition hover:bg-white"
                            aria-label={link.label}
                          >
                            {Icon ? (
                              <Icon className="h-5 w-5" aria-hidden />
                            ) : (
                              <span aria-hidden className="font-semibold">
                                {link.icon === "linkedin"
                                  ? "in"
                                  : link.icon === "facebook"
                                    ? "f"
                                    : "X"}
                              </span>
                            )}
                          </a>
                        );
                      })}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#244B50]">
                    {section.title}
                  </h3>
                  {section.id === "contact" ? (
                    <ul className="mt-4 space-y-3 text-sm">
                      {config.contacts
                        .filter((item) => item.visible)
                        .map((item) => {
                          const Icon =
                            item.kind === "address"
                              ? MapPin
                              : item.kind === "email"
                                ? Mail
                                : Phone;
                          return (
                            <li key={item.id} className="flex min-w-0 gap-2">
                              <Icon
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#244B50]"
                                aria-hidden
                              />
                              <div className="min-w-0">
                                {item.label && (
                                  <span className="mb-0.5 block text-xs font-semibold uppercase tracking-wide">
                                    {item.label}
                                  </span>
                                )}
                                {item.kind === "email" ? (
                                  <a
                                    className="break-all hover:underline"
                                    href={`mailto:${item.value}`}
                                  >
                                    {item.value}
                                  </a>
                                ) : item.kind === "phone" ? (
                                  <a
                                    className="hover:underline"
                                    href={`tel:${item.value.replace(/\s+/g, "")}`}
                                  >
                                    {item.value}
                                  </a>
                                ) : (
                                  <span className="whitespace-pre-line">
                                    {item.value}
                                  </span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                    </ul>
                  ) : (
                    <ul className="mt-4 space-y-2 text-sm">
                      {config[section.id]
                        .filter((link) => link.visible)
                        .map((link) => (
                          <li key={link.id}>
                            <Link
                              href={link.href}
                              className="transition hover:text-[#244B50] hover:underline"
                            >
                              {link.label}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          ))}
      </div>
      <div className="border-t border-[#D9E2E8]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>{config.copyright.replaceAll("{year}", String(year))}</p>
          <div className="max-w-2xl space-y-3 leading-relaxed">
            {config.notices
              .filter((item) => item.visible)
              .map((notice) => (
                <Notice key={notice.id} notice={notice} />
              ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
