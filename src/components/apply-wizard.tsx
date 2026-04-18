"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { StudyAddOnPublic, StudyPackagePublic } from "@/lib/cms/pricing-types";
import type { ApplicationPayload } from "@/types/application";

const stepLabels = [
  "Personal Info",
  "Academic Background",
  "Program Preferences",
  "Support Package",
  "Document Upload",
  "Review & Submit",
];

type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; trackingId: string; screeningTag: string }
  | { status: "error"; message: string };

type Props = {
  packages: StudyPackagePublic[];
  addOns: StudyAddOnPublic[];
};

export function ApplyWizard({ packages, addOns }: Props) {
  const searchParams = useSearchParams();

  const prefilledCountry = searchParams.get("country") || "Italy";
  const prefilledProgram = searchParams.get("program") || "";

  const destinationOptions = useMemo(
    () => [
      "Italy",
      "Germany",
      "France",
      "Spain",
      "Netherlands",
      "Poland",
      "Ireland",
      "Sweden",
      "Norway",
      "Finland",
      "Austria",
      "Belgium",
      "Denmark",
      "Hungary",
    ],
    []
  );

  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });
  const [packageStepError, setPackageStepError] = useState<string | null>(null);

  const [form, setForm] = useState<ApplicationPayload>({
    personalInfo: {
      fullName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      nationality: "",
    },
    academicBackground: {
      highestQualification: "",
      institutionName: "",
      gpa: 0,
      ieltsScore: 0,
      graduationYear: "",
    },
    programPreferences: {
      intake: "Fall 2026",
      preferredContinent: "Europe",
      destinationChoices: [
        { rank: 1, country: prefilledCountry },
        { rank: 2, country: "Germany" },
        { rank: 3, country: "France" },
      ],
      manualDestination: "",
      programInterest: prefilledProgram,
      notes: "",
    },
    packageSelection: {
      packageId: "",
      packageSlug: "",
      packageName: "",
      addonIds: [],
    },
    sourceCountry: prefilledCountry,
    sourceProgram: prefilledProgram,
  });

  const updatePersonal = (key: keyof ApplicationPayload["personalInfo"], value: string) => {
    setForm((prev) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [key]: value,
      },
    }));
  };

  const updateAcademic = (
    key: keyof ApplicationPayload["academicBackground"],
    value: string | number
  ) => {
    setForm((prev) => ({
      ...prev,
      academicBackground: {
        ...prev.academicBackground,
        [key]: value,
      },
    }));
  };

  const updateProgramPreference = (
    key: keyof ApplicationPayload["programPreferences"],
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      programPreferences: {
        ...prev.programPreferences,
        [key]: value,
      },
    }));
  };

  const updateDestinationRank = (rank: 1 | 2 | 3, country: string) => {
    setForm((prev) => ({
      ...prev,
      programPreferences: {
        ...prev.programPreferences,
        destinationChoices: prev.programPreferences.destinationChoices.map((choice) =>
          choice.rank === rank ? { ...choice, country } : choice
        ),
      },
    }));
  };

  const selectPackage = (pkg: StudyPackagePublic) => {
    setPackageStepError(null);
    setForm((prev) => ({
      ...prev,
      packageSelection: {
        ...prev.packageSelection!,
        packageId: pkg.id,
        packageSlug: pkg.slug,
        packageName: pkg.name,
      },
    }));
  };

  const toggleAddon = (id: string) => {
    setForm((prev) => {
      const cur = prev.packageSelection?.addonIds ?? [];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return {
        ...prev,
        packageSelection: {
          packageId: prev.packageSelection?.packageId ?? "",
          packageSlug: prev.packageSelection?.packageSlug ?? "",
          packageName: prev.packageSelection?.packageName ?? "",
          addonIds: next,
        },
      };
    });
  };

  const appendFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = Array.from(incoming);
    setFiles((prev) => [...prev, ...next]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const nextStep = () => {
    if (step === 4) {
      if (!packages.length) {
        setPackageStepError("Support packages are not available yet. Please contact UniMondo to continue.");
        return;
      }
      if (!form.packageSelection?.packageId) {
        setPackageStepError("Please select a support package to continue.");
        return;
      }
      setPackageStepError(null);
    }
    setStep((prev) => Math.min(prev + 1, 6));
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const submitApplication = async () => {
    setSubmission({ status: "submitting" });

    try {
      const payload = new FormData();
      payload.append("application", JSON.stringify(form));

      files.forEach((file) => payload.append("documents", file));

      const response = await fetch("/api/applications", {
        method: "POST",
        body: payload,
      });

      const data = (await response.json()) as {
        trackingId?: string;
        screeningTag?: string;
        message?: string;
      };

      if (!response.ok || !data.trackingId || !data.screeningTag) {
        throw new Error(data.message || "Failed to submit application.");
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
  };

  const selectedAddonNames = useMemo(() => {
    const ids = form.packageSelection?.addonIds ?? [];
    return addOns.filter((a) => ids.includes(a.id)).map((a) => a.name);
  }, [addOns, form.packageSelection?.addonIds]);

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
            <Input label="Full Name" value={form.personalInfo.fullName} onChange={(value) => updatePersonal("fullName", value)} />
            <Input label="Email" type="email" value={form.personalInfo.email} onChange={(value) => updatePersonal("email", value)} />
            <Input label="Phone" value={form.personalInfo.phone} onChange={(value) => updatePersonal("phone", value)} />
            <Input label="Date of Birth" type="date" value={form.personalInfo.dateOfBirth} onChange={(value) => updatePersonal("dateOfBirth", value)} />
            <Input label="Nationality" value={form.personalInfo.nationality} onChange={(value) => updatePersonal("nationality", value)} />
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Highest Qualification"
              value={form.academicBackground.highestQualification}
              onChange={(value) => updateAcademic("highestQualification", value)}
            />
            <Input
              label="Institution Name"
              value={form.academicBackground.institutionName}
              onChange={(value) => updateAcademic("institutionName", value)}
            />
            <Input
              label="GPA"
              type="number"
              value={String(form.academicBackground.gpa)}
              onChange={(value) => updateAcademic("gpa", Number(value || 0))}
            />
            <Input
              label="IELTS Score"
              type="number"
              value={String(form.academicBackground.ieltsScore)}
              onChange={(value) => updateAcademic("ieltsScore", Number(value || 0))}
            />
            <Input
              label="Graduation Year"
              value={form.academicBackground.graduationYear}
              onChange={(value) => updateAcademic("graduationYear", value)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm text-zinc-700">
              <span className="font-medium">Intake</span>
              <select
                value={form.programPreferences.intake}
                onChange={(event) => updateProgramPreference("intake", event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
              >
                <option value="Fall 2026">Fall 2026</option>
                <option value="Spring 2027">Spring 2027</option>
              </select>
            </label>

            <Input
              label="Preferred Continent"
              value={form.programPreferences.preferredContinent}
              onChange={(value) => updateProgramPreference("preferredContinent", value)}
            />

            {[1, 2, 3].map((rank) => (
              <label key={rank} className="space-y-1 text-sm text-zinc-700">
                <span className="font-medium">{rank} Choice Destination</span>
                <select
                  value={
                    form.programPreferences.destinationChoices.find((choice) => choice.rank === rank)?.country ||
                    ""
                  }
                  onChange={(event) => updateDestinationRank(rank as 1 | 2 | 3, event.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                >
                  {destinationOptions.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            <Input
              label="Manual Destination Entry (Optional)"
              value={form.programPreferences.manualDestination || ""}
              onChange={(value) => updateProgramPreference("manualDestination", value)}
            />

            <Input
              label="Program Interest"
              value={form.programPreferences.programInterest}
              onChange={(value) => updateProgramPreference("programInterest", value)}
            />

            <label className="space-y-1 text-sm text-zinc-700 md:col-span-2">
              <span className="font-medium">Notes (Optional)</span>
              <textarea
                value={form.programPreferences.notes || ""}
                onChange={(event) => updateProgramPreference("notes", event.target.value)}
                className="min-h-24 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
              />
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <p className="rounded-lg border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-amber-950">
              Select a support package that suits your needs.{" "}
              <strong className="font-semibold">Application submission is completely FREE.</strong> You can upgrade or
              change it later. Prices are not shown here — see the{" "}
              <Link href="/packages" className="font-medium text-amber-900 underline underline-offset-2">
                Our packages
              </Link>{" "}
              page for details.
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
                    const selected = form.packageSelection?.packageId === pkg.id;
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
                    const checked = (form.packageSelection?.addonIds ?? []).includes(a.id);
                    return (
                      <label
                        key={a.id}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 p-3 hover:bg-zinc-50"
                      >
                        <input type="checkbox" checked={checked} onChange={() => toggleAddon(a.id)} className="mt-1" />
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
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{packageStepError}</p>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <label
              className="block rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-10 text-center text-sm text-zinc-600"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                appendFiles(event.dataTransfer.files);
              }}
            >
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) => appendFiles(event.target.files)}
              />
              Drag and drop documents here, or click to browse
            </label>

            {!!files.length && (
              <ul className="space-y-2">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2"
                  >
                    <span className="text-sm text-zinc-700">
                      {file.name} ({Math.round(file.size / 1024)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-xs font-semibold text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4 text-sm text-zinc-700">
            <p>
              <span className="font-semibold">Name:</span> {form.personalInfo.fullName || "-"}
            </p>
            <p>
              <span className="font-semibold">Email:</span> {form.personalInfo.email || "-"}
            </p>
            <p>
              <span className="font-semibold">GPA:</span> {form.academicBackground.gpa}
            </p>
            <p>
              <span className="font-semibold">IELTS:</span> {form.academicBackground.ieltsScore}
            </p>
            <p>
              <span className="font-semibold">Program:</span> {form.programPreferences.programInterest || "-"}
            </p>
            <p>
              <span className="font-semibold">Support package:</span> {form.packageSelection?.packageName || "-"}
            </p>
            {selectedAddonNames.length > 0 && (
              <p>
                <span className="font-semibold">Add-ons:</span> {selectedAddonNames.join(", ")}
              </p>
            )}
            <p>
              <span className="font-semibold">Files:</span> {files.length}
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
              onClick={submitApplication}
              disabled={submission.status === "submitting"}
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submission.status === "submitting" ? "Submitting..." : "Submit Application"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="space-y-1 text-sm text-zinc-700">
      <span className="font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
      />
    </label>
  );
}
