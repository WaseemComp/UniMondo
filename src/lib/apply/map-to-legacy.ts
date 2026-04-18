import type { ApplicationFormValues } from "@/lib/apply/schema";
import type { ApplicationPayload } from "@/types/application";

/** Normalize academic result to a 4.0-scale GPA number for screening rules. */
export function toScreeningGpaAndIelts(academic: ApplicationFormValues["academicInfo"]): {
  gpa: number;
  ieltsScore: number;
} {
  let gpaOn4 = 0;
  if (academic.gradeType === "gpa" && academic.obtainedGpa != null && academic.totalGpaScale && academic.totalGpaScale > 0) {
    gpaOn4 = (academic.obtainedGpa / academic.totalGpaScale) * 4;
  } else if (academic.obtainedPercentage != null) {
    gpaOn4 = (academic.obtainedPercentage / 100) * 4;
  }
  return { gpa: gpaOn4, ieltsScore: academic.ieltsScore };
}

export function buildPayloadSnapshot(
  values: ApplicationFormValues,
  pref?: { country?: string; program?: string },
): ApplicationPayload {
  const { gpa, ieltsScore } = toScreeningGpaAndIelts(values.academicInfo);
  const a = values.academicInfo;
  return {
    personalInfo: values.personalInfo,
    academicBackground: {
      highestQualification: a.highestQualification,
      institutionName: a.institutionName,
      gpa,
      ieltsScore,
      graduationYear: a.graduated
        ? (a.graduationDate?.slice(0, 4) ?? "")
        : (a.expectedGraduationDate?.slice(0, 4) ?? ""),
    },
    programPreferences: {
      intake: values.studyPreferences.intake,
      programLevel: values.studyPreferences.programLevel,
      preferredContinent: values.studyPreferences.preferredContinent,
      destinationChoices: values.studyPreferences.destinations.map((d) => ({
        rank: d.rank as 1 | 2 | 3,
        country: d.country,
      })),
      programInterest: values.studyPreferences.programInterest,
      notes: values.studyPreferences.notes ?? "",
    },
    packageSelection: values.packageSelection,
    sourceCountry: pref?.country,
    sourceProgram: pref?.program,
  };
}
