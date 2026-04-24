"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

const contactMethodValues = ["whatsapp", "phone", "email"] as const;
const courseTypeValues = ["ielts_toefl", "german", "italian", "french", "other"] as const;
const levelValues = ["beginner", "intermediate", "advanced", "not_sure"] as const;
const goalValues = ["university_admission", "visa_preparation", "career", "exam_preparation", "personal_development"] as const;
const scheduleValues = ["weekdays", "weekends", "evening", "flexible"] as const;
const modeValues = ["online", "in_person", "hybrid"] as const;

const schema = z.object({
  basic: z.object({
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Valid email required"),
    phone: z.string().min(5, "Phone / WhatsApp is required"),
    countryOfResidence: z.string().min(2, "Country of residence is required"),
    preferredContactMethod: z.enum(contactMethodValues),
  }),
  selection: z.object({
    courseType: z.enum(courseTypeValues),
    currentLevel: z.enum(levelValues),
  }),
  goal: z.object({
    mainGoal: z.enum(goalValues),
    targetCountry: z.string().min(2, "Target country is required"),
  }),
  availability: z.object({
    preferredStartDate: z.string().min(1, "Preferred start date is required"),
    preferredSchedule: z.enum(scheduleValues),
    learningMode: z.enum(modeValues),
  }),
  final: z.object({
    notes: z.string().optional(),
    consent: z.boolean().refine((v) => v === true, "Consent is required"),
  }),
});

export type LanguageCourseFormValues = z.infer<typeof schema>;

type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; trackingId: string; screeningTag: string }
  | { status: "error"; message: string };

export function LanguageCourseWizard({
  preselectedCourse,
}: {
  preselectedCourse?: "ielts_toefl" | "german" | "italian_french";
}) {
  const initialCourse = useMemo<LanguageCourseFormValues["selection"]["courseType"]>(() => {
    if (preselectedCourse === "ielts_toefl") return "ielts_toefl";
    if (preselectedCourse === "german") return "german";
    if (preselectedCourse === "italian_french") return "other";
    return "ielts_toefl";
  }, [preselectedCourse]);

  const form = useForm<LanguageCourseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      basic: {
        fullName: "",
        email: "",
        phone: "",
        countryOfResidence: "",
        preferredContactMethod: "whatsapp",
      },
      selection: {
        courseType: initialCourse,
        currentLevel: "not_sure",
      },
      goal: {
        mainGoal: "university_admission",
        targetCountry: "Germany",
      },
      availability: {
        preferredStartDate: "",
        preferredSchedule: "flexible",
        learningMode: "online",
      },
      final: {
        notes: "",
        consent: false,
      },
    },
    mode: "onTouched",
  });

  const [step, setStep] = useState(1);
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });

  const { register, trigger, formState, handleSubmit } = form;

  const stepLabels = ["Basic Information", "Course Selection", "Goal", "Availability", "Final Details"];

  const next = async () => {
    const map: Array<keyof LanguageCourseFormValues> = ["basic", "selection", "goal", "availability", "final"];
    const key = map[step - 1];
    const ok = await trigger(key);
    if (!ok) return;
    setStep((s) => Math.min(5, s + 1));
  };

  const prev = () => setStep((s) => Math.max(1, s - 1));

  const onSubmit = handleSubmit(async (values) => {
    setSubmission({ status: "submitting" });
    try {
      const body = {
        applicationType: "language_course",
        contact: {
          fullName: values.basic.fullName,
          email: values.basic.email,
          phone: values.basic.phone,
        },
        languageCourse: {
          countryOfResidence: values.basic.countryOfResidence,
          preferredContactMethod: values.basic.preferredContactMethod,
          courseType: values.selection.courseType,
          currentLevel: values.selection.currentLevel,
          mainGoal: values.goal.mainGoal,
          targetCountry: values.goal.targetCountry,
          preferredStartDate: values.availability.preferredStartDate,
          preferredSchedule: values.availability.preferredSchedule,
          learningMode: values.availability.learningMode,
          notes: values.final.notes ?? "",
          consent: values.final.consent,
        },
      };

      const fd = new FormData();
      fd.append("application", JSON.stringify(body));
      fd.append("documentMeta", JSON.stringify([]));

      const response = await fetch("/api/applications", { method: "POST", body: fd });
      const data = (await response.json()) as { trackingId?: string; screeningTag?: string; message?: string; issues?: unknown };

      if (!response.ok || !data.trackingId || !data.screeningTag) {
        const extra =
          data.issues != null ? ` ${typeof data.issues === "string" ? data.issues : JSON.stringify(data.issues)}` : "";
        throw new Error((data.message || "Failed to submit application.") + extra);
      }

      setSubmission({ status: "success", trackingId: data.trackingId, screeningTag: data.screeningTag });
    } catch (e) {
      setSubmission({ status: "error", message: e instanceof Error ? e.message : "Unknown error occurred." });
    }
  });

  if (submission.status === "success") {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-emerald-900">Application Submitted</h2>
        <p className="mt-2 text-sm text-emerald-800">Tracking ID: {submission.trackingId}</p>
        <p className="mt-1 text-sm text-emerald-800">Initial Screening Result: {submission.screeningTag}</p>
      </section>
    );
  }

  return (
    <FormProvider {...form}>
      <div className="space-y-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {stepLabels.map((label, i) => {
              const n = i + 1;
              const active = n === step;
              const completed = n < step;
              return (
                <div
                  key={label}
                  className={`rounded-lg border px-2 py-2 text-center text-[11px] font-semibold leading-tight sm:text-xs ${
                    active
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : completed
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                        : "border-zinc-200 bg-zinc-50 text-zinc-600"
                  }`}
                >
                  <span className="block">Step {n}</span>
                  <span className="mt-0.5 block font-normal opacity-90">{label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name" error={formState.errors.basic?.fullName?.message}>
                <input {...register("basic.fullName")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2" />
              </Field>
              <Field label="Email" error={formState.errors.basic?.email?.message}>
                <input type="email" {...register("basic.email")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2" />
              </Field>
              <Field label="Phone / WhatsApp" error={formState.errors.basic?.phone?.message}>
                <input {...register("basic.phone")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2" />
              </Field>
              <Field label="Country of residence" error={formState.errors.basic?.countryOfResidence?.message}>
                <input {...register("basic.countryOfResidence")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2" />
              </Field>
              <label className="space-y-1 text-sm text-zinc-700 md:col-span-2">
                <span className="font-medium">Preferred contact method</span>
                <select {...register("basic.preferredContactMethod")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">Phone call</option>
                  <option value="email">Email</option>
                </select>
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-zinc-700">
                <span className="font-medium">Course type</span>
                <select {...register("selection.courseType")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2">
                  <option value="ielts_toefl">IELTS / TOEFL</option>
                  <option value="german">German Language</option>
                  <option value="italian">Italian Language</option>
                  <option value="french">French Language</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="space-y-1 text-sm text-zinc-700">
                <span className="font-medium">Current language level</span>
                <select {...register("selection.currentLevel")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="not_sure">Not sure</option>
                </select>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-zinc-700">
                <span className="font-medium">Main goal</span>
                <select {...register("goal.mainGoal")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2">
                  <option value="university_admission">University admission</option>
                  <option value="visa_preparation">Visa preparation</option>
                  <option value="career">Work / career</option>
                  <option value="exam_preparation">Exam preparation</option>
                  <option value="personal_development">Personal development</option>
                </select>
              </label>
              <Field label="Target country" error={formState.errors.goal?.targetCountry?.message}>
                <input {...register("goal.targetCountry")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2" />
              </Field>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Preferred start date" error={formState.errors.availability?.preferredStartDate?.message}>
                <input type="date" {...register("availability.preferredStartDate")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2" />
              </Field>
              <label className="space-y-1 text-sm text-zinc-700">
                <span className="font-medium">Preferred schedule</span>
                <select {...register("availability.preferredSchedule")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2">
                  <option value="weekdays">Weekdays</option>
                  <option value="weekends">Weekends</option>
                  <option value="evening">Evening classes</option>
                  <option value="flexible">Flexible</option>
                </select>
              </label>
              <label className="space-y-1 text-sm text-zinc-700 md:col-span-2">
                <span className="font-medium">Preferred learning mode</span>
                <select {...register("availability.learningMode")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2">
                  <option value="online">Online</option>
                  <option value="in_person">In-person</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </label>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <label className="space-y-1 text-sm text-zinc-700">
                <span className="font-medium">Notes / message (optional)</span>
                <textarea {...register("final.notes")} className="min-h-28 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2" />
              </label>

              <label className="flex items-start gap-2 text-sm text-zinc-700">
                <input type="checkbox" {...register("final.consent")} className="mt-1" />
                <span>
                  I consent to UniMondo contacting me about language course options and related guidance.
                </span>
              </label>
              {formState.errors.final?.consent?.message ? (
                <p className="text-sm text-red-700">{formState.errors.final.consent.message}</p>
              ) : null}

              {submission.status === "error" ? (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{submission.message}</p>
              ) : null}

              <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-950">
                <p className="font-semibold">Important</p>
                <p className="mt-1">
                  Successful students may also receive guidance for university admission in Europe.
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={prev}
              disabled={step === 1}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 disabled:opacity-40"
            >
              Back
            </button>

            {step < 5 ? (
              <button
                type="button"
                onClick={next}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void onSubmit()}
                disabled={submission.status === "submitting"}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submission.status === "submitting" ? "Submitting..." : "Submit"}
              </button>
            )}
          </div>
        </section>
      </div>
    </FormProvider>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1 text-sm text-zinc-700">
      <span className="font-medium">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  );
}

