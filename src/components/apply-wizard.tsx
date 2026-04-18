"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import {
  DESTINATION_OPTIONS,
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  type DocumentCategory,
} from "@/lib/apply/constants";
import { applicationFormSchema, type ApplicationFormValues } from "@/lib/apply/schema";
import type { StudyAddOnPublic, StudyPackagePublic } from "@/lib/cms/pricing-types";
const stepLabels = [
  "Personal Info",
  "Academic Information",
  "Study Preferences",
  "Support Package",
  "Documents",
  "Review & Submit",
];

type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; trackingId: string; screeningTag: string }
  | { status: "error"; message: string };

type PendingDoc = {
  key: string;
  file: File;
  category: DocumentCategory;
  description: string;
};

type Props = {
  packages: StudyPackagePublic[];
  addOns: StudyAddOnPublic[];
};

function newDocKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ApplyWizard({ packages, addOns }: Props) {
  const searchParams = useSearchParams();
  const prefilledCountry = searchParams.get("country")?.trim() || DESTINATION_OPTIONS[0];
  const prefilledProgram = searchParams.get("program")?.trim() || "";

  const defaultValues = useMemo<ApplicationFormValues>(
    () => ({
      personalInfo: {
        fullName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        nationality: "",
      },
      academicInfo: {
        highestQualification: "",
        institutionName: "",
        gradeType: "gpa",
        obtainedGpa: undefined,
        totalGpaScale: undefined,
        obtainedPercentage: undefined,
        ieltsScore: 0,
        graduated: true,
        graduationDate: "",
        expectedGraduationDate: "",
      },
      studyPreferences: {
        intake: "Fall 2026",
        preferredContinent: "Europe",
        destinations: [{ rank: 1, country: prefilledCountry }],
        programInterest: prefilledProgram,
        notes: "",
      },
      packageSelection: {
        packageId: packages[0]?.id ?? "",
        packageSlug: packages[0]?.slug ?? "",
        packageName: packages[0]?.name ?? "",
        addonIds: [],
      },
    }),
    [packages, prefilledCountry, prefilledProgram]
  );

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues,
    mode: "onTouched",
  });

  const { handleSubmit, register, watch, setValue, trigger, reset, formState } = form;

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const [step, setStep] = useState(1);
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });
  const [packageStepError, setPackageStepError] = useState<string | null>(null);

  const gradeType = watch("academicInfo.gradeType");
  const graduated = watch("academicInfo.graduated");
  const destinations = watch("studyPreferences.destinations");
  const watched = watch();

  const selectedAddonNames = useMemo(() => {
    const ids = watched.packageSelection.addonIds;
    return addOns.filter((a) => ids.includes(a.id)).map((a) => a.name);
  }, [addOns, watched.packageSelection.addonIds]);

  const nextStep = async () => {
    if (step === 1) {
      const ok = await trigger("personalInfo");
      if (!ok) return;
    } else if (step === 2) {
      const ok = await trigger("academicInfo");
      if (!ok) return;
    } else if (step === 3) {
      const ok = await trigger("studyPreferences");
      if (!ok) return;
    } else if (step === 4) {
      if (!packages.length) {
        setPackageStepError("Support packages are not available yet. Please contact UniMondo to continue.");
        return;
      }
      const ok = await trigger("packageSelection");
      if (!ok) {
        setPackageStepError("Please select a support package.");
        return;
      }
      if (!watched.packageSelection.packageId) {
        setPackageStepError("Please select a support package to continue.");
        return;
      }
      setPackageStepError(null);
    }
    setStep((s) => Math.min(s + 1, 6));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const selectPackage = (pkg: StudyPackagePublic) => {
    setPackageStepError(null);
    setValue("packageSelection.packageId", pkg.id, { shouldValidate: true });
    setValue("packageSelection.packageSlug", pkg.slug, { shouldValidate: true });
    setValue("packageSelection.packageName", pkg.name, { shouldValidate: true });
  };

  const toggleAddon = (id: string) => {
    const cur = watched.packageSelection.addonIds;
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    setValue("packageSelection.addonIds", next, { shouldValidate: true });
  };

  const addDestination = () => {
    const d = watched.studyPreferences.destinations;
    if (d.length >= 3) return;
    setValue(
      "studyPreferences.destinations",
      [...d, { rank: d.length + 1, country: "" }],
      { shouldValidate: true }
    );
  };

  const removeLastDestination = () => {
    const d = watched.studyPreferences.destinations;
    if (d.length <= 1) return;
    const next = d.slice(0, -1).map((row, i) => ({ ...row, rank: i + 1 }));
    setValue("studyPreferences.destinations", next, { shouldValidate: true });
  };

  const appendFilesForCategory = (category: DocumentCategory, list: FileList | null) => {
    if (!list?.length) return;
    const next: PendingDoc[] = Array.from(list).map((file) => ({
      key: newDocKey(),
      file,
      category,
      description: "",
    }));
    setPendingDocs((prev) => [...prev, ...next]);
  };

  const removePendingDoc = (key: string) => {
    setPendingDocs((prev) => prev.filter((p) => p.key !== key));
  };

  const updatePendingDescription = (key: string, description: string) => {
    setPendingDocs((prev) => prev.map((p) => (p.key === key ? { ...p, description } : p)));
  };

  const onFinalSubmit = handleSubmit(async (values) => {
    setSubmission({ status: "submitting" });
    try {
      const body = {
        ...values,
        studyPreferences: {
          ...values.studyPreferences,
          destinations: values.studyPreferences.destinations.map((d, i) => ({
            rank: typeof d.rank === "number" ? d.rank : i + 1,
            country: d.country,
          })),
        },
        sourceCountry: prefilledCountry,
        sourceProgram: prefilledProgram,
      };

      const documentMeta = pendingDocs.map((p) => ({
        category: p.category,
        description: p.description,
      }));

      const fd = new FormData();
      fd.append("application", JSON.stringify(body));
      fd.append("documentMeta", JSON.stringify(documentMeta));
      pendingDocs.forEach((p) => fd.append("documents", p.file));

      const response = await fetch("/api/applications", { method: "POST", body: fd });
      const data = (await response.json()) as {
        trackingId?: string;
        screeningTag?: string;
        message?: string;
        issues?: unknown;
      };

      if (!response.ok || !data.trackingId || !data.screeningTag) {
        const extra =
          data.issues != null ? ` ${typeof data.issues === "string" ? data.issues : JSON.stringify(data.issues)}` : "";
        throw new Error((data.message || "Failed to submit application.") + extra);
      }

      setSubmission({
        status: "success",
        trackingId: data.trackingId,
        screeningTag: data.screeningTag,
      });
    } catch (error) {
      setSubmission({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error occurred.",
      });
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
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {stepLabels.map((label, index) => {
              const stepNumber = index + 1;
              const active = stepNumber === step;
              const completed = stepNumber < step;

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
                  <span className="block">Step {stepNumber}</span>
                  <span className="mt-0.5 block font-normal opacity-90">{label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full Name" error={formState.errors.personalInfo?.fullName?.message}>
                <input
                  {...register("personalInfo.fullName")}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                />
              </Field>
              <Field label="Email" error={formState.errors.personalInfo?.email?.message}>
                <input
                  type="email"
                  {...register("personalInfo.email")}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                />
              </Field>
              <Field label="Phone" error={formState.errors.personalInfo?.phone?.message}>
                <input
                  {...register("personalInfo.phone")}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                />
              </Field>
              <Field label="Date of Birth" error={formState.errors.personalInfo?.dateOfBirth?.message}>
                <input
                  type="date"
                  {...register("personalInfo.dateOfBirth")}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                />
              </Field>
              <Field label="Nationality" error={formState.errors.personalInfo?.nationality?.message}>
                <input
                  {...register("personalInfo.nationality")}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Highest qualification"
                error={formState.errors.academicInfo?.highestQualification?.message}
              >
                <input
                  {...register("academicInfo.highestQualification")}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                />
              </Field>
              <Field label="Institution name" error={formState.errors.academicInfo?.institutionName?.message}>
                <input
                  {...register("academicInfo.institutionName")}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                />
              </Field>

              <div className="md:col-span-2">
                <p className="text-sm font-medium text-zinc-900">Result format</p>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-700">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="radio" value="gpa" {...register("academicInfo.gradeType")} />
                    GPA
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="radio" value="percentage" {...register("academicInfo.gradeType")} />
                    Percentage
                  </label>
                </div>
              </div>

              {gradeType === "gpa" && (
                <>
                  <Field label="Obtained GPA" error={formState.errors.academicInfo?.obtainedGpa?.message}>
                    <input
                      type="number"
                      step="any"
                      {...register("academicInfo.obtainedGpa", { valueAsNumber: true })}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                    />
                  </Field>
                  <Field label="Total GPA scale" error={formState.errors.academicInfo?.totalGpaScale?.message}>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 4.0 or 5.0"
                      {...register("academicInfo.totalGpaScale", { valueAsNumber: true })}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                    />
                  </Field>
                </>
              )}

              {gradeType === "percentage" && (
                <Field
                  label="Obtained percentage"
                  error={formState.errors.academicInfo?.obtainedPercentage?.message}
                >
                  <input
                    type="number"
                    step="any"
                    {...register("academicInfo.obtainedPercentage", { valueAsNumber: true })}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                  />
                </Field>
              )}

              <Field label="IELTS score (0–9)" error={formState.errors.academicInfo?.ieltsScore?.message}>
                <input
                  type="number"
                  step="0.5"
                  {...register("academicInfo.ieltsScore", { valueAsNumber: true })}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                />
              </Field>

              <div className="md:col-span-2">
                <p className="text-sm font-medium text-zinc-900">Graduation status</p>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-700">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      checked={graduated === true}
                      onChange={() => setValue("academicInfo.graduated", true, { shouldValidate: true })}
                    />
                    Graduated
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      checked={graduated === false}
                      onChange={() => setValue("academicInfo.graduated", false, { shouldValidate: true })}
                    />
                    Not graduated
                  </label>
                </div>
              </div>

              {graduated ? (
                <Field label="Graduation date" error={formState.errors.academicInfo?.graduationDate?.message}>
                  <input
                    type="date"
                    {...register("academicInfo.graduationDate")}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                  />
                </Field>
              ) : (
                <Field
                  label="Expected graduation date"
                  error={formState.errors.academicInfo?.expectedGraduationDate?.message}
                >
                  <input
                    type="date"
                    {...register("academicInfo.expectedGraduationDate")}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                  />
                </Field>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-zinc-700">
                <span className="font-medium">Intake</span>
                <select
                  {...register("studyPreferences.intake")}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                >
                  <option value="Fall 2026">Fall 2026</option>
                  <option value="Spring 2027">Spring 2027</option>
                </select>
              </label>

              <Field
                label="Preferred continent / region"
                error={formState.errors.studyPreferences?.preferredContinent?.message}
              >
                <input
                  {...register("studyPreferences.preferredContinent")}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                />
              </Field>

              <div className="md:col-span-2 space-y-3">
                <p className="text-sm font-semibold text-zinc-900">Destination countries (ranked)</p>
                {formState.errors.studyPreferences?.destinations?.message && (
                  <p className="text-sm text-red-600">{formState.errors.studyPreferences.destinations.message}</p>
                )}
                {destinations.map((row, index) => (
                  <label key={`${row.rank}-${index}`} className="block space-y-1 text-sm text-zinc-700">
                    <input
                      type="hidden"
                      {...register(`studyPreferences.destinations.${index}.rank` as const, {
                        valueAsNumber: true,
                      })}
                    />
                    <span className="font-medium">No. {row.rank} — destination</span>
                    <select
                      {...register(`studyPreferences.destinations.${index}.country` as const)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                    >
                      <option value="">Select country</option>
                      {DESTINATION_OPTIONS.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                    {formState.errors.studyPreferences?.destinations?.[index]?.country?.message && (
                      <span className="text-xs text-red-600">
                        {formState.errors.studyPreferences.destinations[index]?.country?.message}
                      </span>
                    )}
                  </label>
                ))}

                <div className="flex flex-wrap gap-2 pt-1">
                  {destinations.length < 3 && (
                    <button
                      type="button"
                      onClick={addDestination}
                      className="rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100"
                    >
                      + Add another destination
                    </button>
                  )}
                  {destinations.length > 1 && (
                    <button
                      type="button"
                      onClick={removeLastDestination}
                      className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                    >
                      Remove last destination
                    </button>
                  )}
                </div>
              </div>

              <Field
                label="Program interest"
                error={formState.errors.studyPreferences?.programInterest?.message}
              >
                <input
                  {...register("studyPreferences.programInterest")}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                />
              </Field>

              <label className="space-y-1 text-sm text-zinc-700 md:col-span-2">
                <span className="font-medium">Notes (optional)</span>
                <textarea
                  {...register("studyPreferences.notes")}
                  className="min-h-24 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                />
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <p className="rounded-lg border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-amber-950">
                <strong className="font-semibold">Application submission with UniMondo is completely FREE.</strong> You
                can upgrade or change your package later. Package prices are not shown here — see{" "}
                <Link href="/packages" className="font-medium text-amber-900 underline underline-offset-2">
                  Our packages
                </Link>{" "}
                for pricing details.
              </p>

              {!packages.length ? (
                <p className="text-sm text-red-700">
                  Packages are not loaded. Please try again later or contact UniMondo.
                </p>
              ) : (
                <fieldset className="space-y-3">
                  <legend className="text-sm font-semibold text-zinc-900">Main package</legend>
                  <div className="grid gap-3">
                    {packages.map((pkg) => {
                      const selected = watched.packageSelection.packageId === pkg.id;
                      return (
                        <label
                          key={pkg.id}
                          className={`flex cursor-pointer flex-col rounded-xl border-2 p-4 transition ${
                            selected ? "border-amber-500 bg-amber-50/50" : "border-zinc-200 hover:border-zinc-300"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="study-package"
                              checked={selected}
                              onChange={() => selectPackage(pkg)}
                              className="mt-1"
                            />
                            <div>
                              <span className="font-semibold text-zinc-900">{pkg.name}</span>
                              <p className="mt-1 text-sm leading-relaxed text-zinc-600">{pkg.teaser}</p>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {addOns.length > 0 && (
                <fieldset className="space-y-3">
                  <legend className="text-sm font-semibold text-zinc-900">Add-ons (optional)</legend>
                  <div className="space-y-2">
                    {addOns.map((a) => {
                      const checked = watched.packageSelection.addonIds.includes(a.id);
                      return (
                        <label
                          key={a.id}
                          className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 p-3 hover:bg-zinc-50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAddon(a.id)}
                            className="mt-1"
                          />
                          <div>
                            <span className="font-medium text-zinc-900">{a.name}</span>
                            <p className="mt-0.5 text-xs text-zinc-600 sm:text-sm">{a.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {packageStepError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {packageStepError}
                </p>
              )}
              {formState.errors.packageSelection?.packageId?.message && (
                <p className="text-sm text-red-600">{formState.errors.packageSelection.packageId.message}</p>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <p className="text-sm text-zinc-600">
                Upload documents by category. You can add multiple files per category. Accepted: PDF, images, Word
                documents.
              </p>

              {DOCUMENT_CATEGORIES.map((category) => (
                <div key={category} className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900">{DOCUMENT_CATEGORY_LABELS[category]}</h3>
                    <label className="cursor-pointer rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800">
                      Add files
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        accept=".pdf,.doc,.docx,image/*"
                        onChange={(e) => appendFilesForCategory(category, e.target.files)}
                      />
                    </label>
                  </div>
                </div>
              ))}

              {pendingDocs.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-zinc-900">Selected files</p>
                  <ul className="space-y-3">
                    {pendingDocs.map((p) => (
                      <li
                        key={p.key}
                        className="rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-zinc-900">{p.file.name}</p>
                            <p className="text-xs text-zinc-500">
                              {DOCUMENT_CATEGORY_LABELS[p.category]} · {Math.round(p.file.size / 1024)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePendingDoc(p.key)}
                            className="text-xs font-semibold text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                        <label className="mt-2 block space-y-1 text-xs text-zinc-600">
                          <span>Description (optional)</span>
                          <input
                            value={p.description}
                            onChange={(e) => updatePendingDescription(p.key, e.target.value)}
                            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                            placeholder="e.g. Bachelor transcript, 2024"
                          />
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4 text-sm text-zinc-700">
              <p>
                <span className="font-semibold">Name:</span> {watched.personalInfo.fullName || "—"}
              </p>
              <p>
                <span className="font-semibold">Email:</span> {watched.personalInfo.email || "—"}
              </p>
              <p>
                <span className="font-semibold">Academic:</span>{" "}
                {watched.academicInfo.gradeType === "gpa"
                  ? `GPA ${watched.academicInfo.obtainedGpa ?? "—"} / ${watched.academicInfo.totalGpaScale ?? "—"}`
                  : `Percentage ${watched.academicInfo.obtainedPercentage ?? "—"}%`}
                {" · "}
                IELTS {watched.academicInfo.ieltsScore}
                {" · "}
                {watched.academicInfo.graduated ? "Graduated" : "Not graduated"}
              </p>
              <p>
                <span className="font-semibold">Destinations:</span>{" "}
                {watched.studyPreferences.destinations.map((d) => `No.${d.rank} ${d.country}`).join(" · ") || "—"}
              </p>
              <p>
                <span className="font-semibold">Program:</span> {watched.studyPreferences.programInterest || "—"}
              </p>
              <p>
                <span className="font-semibold">Support package:</span> {watched.packageSelection.packageName || "—"}
              </p>
              {selectedAddonNames.length > 0 && (
                <p>
                  <span className="font-semibold">Add-ons:</span> {selectedAddonNames.join(", ")}
                </p>
              )}
              <p>
                <span className="font-semibold">Documents:</span> {pendingDocs.length} file(s)
              </p>

              {submission.status === "error" && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{submission.message}</p>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 1}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 disabled:opacity-40"
            >
              Back
            </button>

            {step < 6 ? (
              <button
                type="button"
                onClick={nextStep}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void onFinalSubmit()}
                disabled={submission.status === "submitting"}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submission.status === "submitting" ? "Submitting..." : "Submit Application"}
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
