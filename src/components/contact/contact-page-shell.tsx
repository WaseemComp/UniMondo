"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  Briefcase,
  ChevronRight,
  Landmark,
  Mail,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import { useCallback, useState } from "react";
import type { ContactPageData } from "@/lib/data/contact-page";
import { cn } from "@/lib/utils";
import { CenteredModal } from "@/components/ui/centered-modal";
import { ContactOfficesSection } from "./contact-offices-section";
import { JoinUsForm } from "./join-us-form";
import { WorkWithUsForm } from "./work-with-us-form";

type ModalPanel = "work" | "join" | null;

type Props = {
  contact: ContactPageData;
};

const paths = [
  {
    id: "work" as const,
    step: "01",
    tag: "Work With Us",
    title: "For organizations & partnerships",
    body: "Formal collaborations, agent networks, and university introductions — aligned with how we counsel students.",
    Icon: Briefcase,
    cta: "Open partnership form",
  },
  {
    id: "join" as const,
    step: "02",
    tag: "Join Us",
    title: "For job & career applicants",
    body: "Careers across counseling, operations, and student success — from screening to departure support.",
    Icon: Users,
    cta: "Open career form",
  },
  {
    id: "offices" as const,
    step: "03",
    tag: "Where to reach us",
    title: "Offices & channels",
    body: "Head office and branches — full addresses, phone lines, emails, and social links below.",
    Icon: Landmark,
    cta: "View office details",
  },
] as const;

export function ContactPageShell({ contact }: Props) {
  const [modal, setModal] = useState<ModalPanel>(null);

  const closeModal = useCallback(() => setModal(null), []);

  const scrollToOffices = () => {
    document.getElementById("our-offices")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  type InboxRow = { email: string; label?: string };

  const officeEmails = contact.offices.flatMap((o) => o.emails ?? []).filter((e) => e.email?.trim());
  const hasOfficeInboxes = officeEmails.length > 0;
  const legacyEmails = contact.emails.map((e) => ({ email: e.email, label: e.label || undefined }));
  const officeNorm = new Set(officeEmails.map((e) => e.email.trim().toLowerCase()));
  const merged: InboxRow[] = hasOfficeInboxes
    ? [
        ...officeEmails,
        ...legacyEmails.filter((e) => e.email?.trim() && !officeNorm.has(e.email.trim().toLowerCase())),
      ]
    : legacyEmails;

  const dedupedByEmail = merged.filter(
    (e, i, arr) =>
      e.email?.trim() &&
      arr.findIndex((x) => x.email.trim().toLowerCase() === e.email.trim().toLowerCase()) === i,
  );

  /** One pill per inbox *label* (case-insensitive); unlabeled rows keyed by email so distinct addresses still show. */
  const inboxLabelKey = (e: InboxRow) => {
    const L = (e.label ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    return L.length > 0 ? `label:${L}` : `email:${e.email.trim().toLowerCase()}`;
  };

  const uniqueEmails = dedupedByEmail.filter((e, i, arr) => arr.findIndex((x) => inboxLabelKey(x) === inboxLabelKey(e)) === i);

  const openPath = (id: (typeof paths)[number]["id"]) => {
    if (id === "work") setModal("work");
    else if (id === "join") setModal("join");
    else scrollToOffices();
  };

  return (
    <main className="bg-gradient-to-b from-[#050d1a] via-slate-50 to-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2000&q=70"
            alt=""
            fill
            className="object-cover opacity-[0.42]"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628]/95 via-[#0a1628]/88 to-[#051525]/98" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.12),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.08),transparent_50%)]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-300/95">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" aria-hidden />
              Contact
            </div>
            <h1 className="mt-6 font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-[3.25rem] md:leading-[1.1]">
              Every conversation starts with <span className="text-amber-400">clarity</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-300 sm:text-base">
              The same navy-and-gold standard you see across UniMondo — partnerships, careers, or a direct line to our
              offices.
            </p>

            <div className="mx-auto mt-10 h-px max-w-md bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-16 max-w-6xl px-4 pb-10 sm:-mt-20 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          {paths.map(({ id, step, title, tag, body, Icon, cta }, i) => (
            <motion.button
              key={id}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              onClick={() => openPath(id)}
              className={cn(
                "group relative flex cursor-pointer flex-col overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#0a1628] p-7 text-left shadow-2xl shadow-black/30 outline-none transition",
                "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-amber-500/90 before:via-amber-400/70 before:to-amber-600/50",
                "hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-900/25",
                "focus-visible:ring-2 focus-visible:ring-amber-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1628]",
                "active:translate-y-0",
              )}
            >
              <span
                className="absolute right-5 top-5 font-[family-name:var(--font-heading)] text-5xl font-bold leading-none text-white/[0.06]"
                aria-hidden
              >
                {step}
              </span>

              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-0.5 shadow-lg shadow-amber-900/30 ring-2 ring-amber-400/40 transition group-hover:ring-amber-300/60">
                  <div className="flex h-full w-full items-center justify-center rounded-[0.9rem] bg-[#0a1628]">
                    <Icon className="h-8 w-8 text-amber-400 transition group-hover:scale-105" strokeWidth={1.75} aria-hidden />
                  </div>
                </div>

                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300/90">{tag}</p>
                <h2 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-white">{title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{body}</p>

                <span className="mt-6 inline-flex items-center gap-2 border-b border-transparent text-sm font-semibold text-amber-300/95 transition group-hover:border-amber-400/70 group-hover:text-amber-200">
                  {cta}
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                </span>
              </div>
            </motion.button>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mt-14 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white px-6 py-8 shadow-xl sm:px-10"
        >
          <div className="pointer-events-none absolute -right-16 top-0 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 ring-2 ring-amber-500/25">
                <Mail className="h-7 w-7 text-amber-800" aria-hidden />
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#0a1628] sm:text-xl">
                  Prefer to write first?
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Use these inboxes for general questions and admissions — we route every message to the right desk.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              {uniqueEmails.slice(0, 6).map((e) => (
                <a
                  key={e.email}
                  href={`mailto:${e.email}`}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-amber-600/30 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-[#0a1628] transition hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow-md"
                >
                  <MessageCircle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
                  <span className="max-w-[14rem] truncate">{e.label || e.email}</span>
                </a>
              ))}
              {uniqueEmails.length === 0 ? (
                <span className="text-sm text-slate-600">Add offices or emails in Admin → Contact management.</span>
              ) : null}
            </div>
          </div>
        </motion.div>

        <div className="mt-16">
          <ContactOfficesSection offices={contact.offices} />
        </div>
      </section>

      <CenteredModal
        open={modal === "work"}
        onClose={closeModal}
        title="Work with us"
        subtitle="For organizations, partnerships, and collaborations."
        icon={<Briefcase className="h-5 w-5 text-amber-300" aria-hidden />}
        labelledBy="contact-modal-work-title"
      >
        <WorkWithUsForm layout="dialog" onSuccess={closeModal} />
      </CenteredModal>

      <CenteredModal
        open={modal === "join"}
        onClose={closeModal}
        title="Join us"
        subtitle="For job and career applicants."
        icon={<Users className="h-5 w-5 text-amber-300" aria-hidden />}
        labelledBy="contact-modal-join-title"
      >
        <JoinUsForm layout="dialog" onSuccess={closeModal} />
      </CenteredModal>
    </main>
  );
}
