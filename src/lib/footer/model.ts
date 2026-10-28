import { z } from "zod";
import { safeDestination, safeImage } from "@/lib/homepage/validation";

const text = (max = 600) => z.string().trim().max(max);
const required = (max = 600) => text(max).min(1, "Enter a value.");
const safeEmail = (value: string) =>
  z.email().safeParse(value).success && !/%0[ad]/i.test(value);
const identity = z.string().min(1).max(100);
export const FOOTER_ICONS = [
  "linkedin",
  "instagram",
  "facebook",
  "youtube",
  "x",
  "email",
  "website",
] as const;
export const FOOTER_SECTIONS = [
  "branding",
  "explore",
  "company",
  "contact",
] as const;
const link = z
  .object({
    id: identity,
    label: required(120),
    href: required(2000).refine(
      safeDestination,
      "Use a website path or secure https:// link.",
    ),
    visible: z.boolean(),
  })
  .strict();
const unique = <T extends { id: string }>(items: T[]) =>
  new Set(items.map((item) => item.id)).size === items.length;
const links = z
  .array(link)
  .max(30)
  .refine(unique, "Each item needs its own identity.");
const socialLink = link.extend({ icon: z.enum(FOOTER_ICONS) }).extend({
  href: required(2000).refine(
    (value) =>
      safeDestination(value) ||
      (value.startsWith("mailto:") && safeEmail(value.slice(7))),
    "Use a secure website link or an email address starting with mailto:.",
  ),
});
export const footerSchema = z
  .object({
    visible: z.boolean(),
    brandName: required(120),
    description: required(3000),
    logoUrl: text(2500).refine(
      (value) =>
        !value || safeImage(value, process.env.NEXT_PUBLIC_SUPABASE_URL),
      "Choose a supported image from the Media Library.",
    ),
    logoAlt: text(300),
    sections: z
      .array(
        z
          .object({
            id: z.enum(FOOTER_SECTIONS),
            title: required(120),
            visible: z.boolean(),
          })
          .strict(),
      )
      .length(4)
      .refine(unique, "Retain each footer section once."),
    explore: links,
    company: links,
    contacts: z
      .array(
        z
          .object({
            id: identity,
            kind: z.enum(["address", "email", "phone", "text"]),
            label: text(120),
            value: required(3000),
            visible: z.boolean(),
          })
          .strict()
          .superRefine((item, ctx) => {
            if (item.kind === "email" && !safeEmail(item.value))
              ctx.addIssue({
                code: "custom",
                path: ["value"],
                message: "Enter a valid email address.",
              });
            if (
              item.kind === "phone" &&
              !/^\+?[0-9() .-]{5,50}$/.test(item.value)
            )
              ctx.addIssue({
                code: "custom",
                path: ["value"],
                message: "Enter a valid telephone number.",
              });
          }),
      )
      .max(30)
      .refine(unique),
    social: z.array(socialLink).max(20).refine(unique),
    copyright: required(600),
    notices: z
      .array(
        z
          .object({
            id: identity,
            text: required(4000),
            visible: z.boolean(),
            links,
          })
          .strict(),
      )
      .max(15)
      .refine(unique),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.logoUrl && !value.logoAlt.trim())
      ctx.addIssue({
        code: "custom",
        path: ["logoAlt"],
        message: "Describe the branding image for screen readers.",
      });
  });
export type FooterConfig = z.infer<typeof footerSchema>;
export type FooterSummary = {
  headAddressShort: string | null;
  branchAddressShort: string | null;
  primaryPhone: string | null;
  emailHello: string;
  emailAdmissions: string;
};
export const FOOTER_RESOURCE = { type: "home" as const, key: "footer" };
export function footerDefaults(contact: FooterSummary): FooterConfig {
  return {
    visible: true,
    brandName: "UniMondo",
    logoUrl: "",
    logoAlt: "",
    description:
      "Student-focused education consultancy for European university admissions — from shortlisting to visa-ready departure.",
    sections: [
      { id: "branding", title: "UniMondo", visible: true },
      { id: "explore", title: "Explore", visible: true },
      { id: "company", title: "Company", visible: true },
      { id: "contact", title: "Contact", visible: true },
    ],
    explore: [
      ["destinations", "Destinations", "/destinations"],
      ["courses", "Language Courses", "/courses"],
      ["packages", "Our Packages", "/packages"],
      ["apply", "Apply", "/apply"],
    ].map(([id, label, href]) => ({ id, label, href, visible: true })),
    company: [
      ["about", "About", "/about"],
      ["contact", "Contact", "/contact"],
      ["blog", "Blog", "/blog"],
      ["staff", "Staff sign in", "/admin/login"],
    ].map(([id, label, href]) => ({ id, label, href, visible: true })),
    contacts: [
      {
        id: "head",
        kind: "address",
        label: contact.headAddressShort ? "Head office" : "Advisory Centre",
        value: contact.headAddressShort || "United Kingdom & Europe",
        visible: true,
      },
      ...(contact.branchAddressShort
        ? [
            {
              id: "branch",
              kind: "address" as const,
              label: "Branch",
              value: contact.branchAddressShort,
              visible: true,
            },
          ]
        : []),
      {
        id: "phone",
        kind: contact.primaryPhone ? "phone" : "text",
        label: "",
        value: contact.primaryPhone || "See contact page",
        visible: true,
      },
      {
        id: "hello",
        kind: "email",
        label: "",
        value: contact.emailHello,
        visible: true,
      },
      {
        id: "admissions",
        kind: "email",
        label: "",
        value: contact.emailAdmissions,
        visible: true,
      },
    ],
    social: [
      {
        id: "linkedin",
        icon: "website",
        label: "UniMondo on LinkedIn",
        href: "https://www.linkedin.com/company/unimondo",
        visible: true,
      },
      {
        id: "email",
        icon: "email",
        label: "Email",
        href: "mailto:" + contact.emailHello,
        visible: true,
      },
    ],
    copyright: "© {year} UniMondo. All rights reserved.",
    notices: [
      {
        id: "tagline",
        text: "Study in Europe with clarity, care, and momentum.",
        visible: true,
        links: [],
      },
      {
        id: "staff-notice",
        text: "Staff sign-in is for UniMondo team only — not for student applications. Use Apply to start a program application.",
        visible: true,
        links: [
          {
            id: "staff",
            label: "Staff sign-in",
            href: "/admin/login",
            visible: true,
          },
          { id: "apply", label: "Apply", href: "/apply", visible: true },
        ],
      },
    ],
  };
}
export function resolveFooter(
  defaults: FooterConfig,
  blocks: { block_key?: unknown; content?: unknown; is_active?: boolean }[],
) {
  const block = blocks.find((row) => row.block_key === "configuration"),
    raw = block?.content as { footer?: unknown } | undefined;
  const parsed = footerSchema.safeParse(raw?.footer);
  return {
    config: parsed.success
      ? {
          ...parsed.data,
          visible: block?.is_active !== false && parsed.data.visible,
        }
      : defaults,
    source: parsed.success
      ? ("Saved" as const)
      : ("Default / inherited" as const),
  };
}
/** Keep newly introduced items during a historical restore, hidden rather than erased. */
export function restoreFooter(
  earlier: FooterConfig,
  current: FooterConfig,
): FooterConfig {
  const retain = <T extends { id: string; visible: boolean }>(
    a: T[],
    b: T[],
  ) => [
    ...a,
    ...b
      .filter((item) => !a.some((old) => old.id === item.id))
      .map((item) => ({ ...item, visible: false })),
  ];
  return {
    ...earlier,
    explore: retain(earlier.explore, current.explore),
    company: retain(earlier.company, current.company),
    contacts: retain(earlier.contacts, current.contacts),
    social: retain(earlier.social, current.social),
    notices: retain(earlier.notices, current.notices),
  };
}
