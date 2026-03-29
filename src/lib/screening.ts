import type { AcademicBackground, ScreeningTag } from "@/types/application";

export function evaluateApplication(academic: AcademicBackground): ScreeningTag {
  const gpaEligible = academic.gpa >= 2.5;
  const ieltsEligible = academic.ieltsScore >= 6.0;

  if (gpaEligible && ieltsEligible) {
    return "Eligible";
  }

  if (academic.gpa < 2.0 || academic.ieltsScore < 5.5) {
    return "Not Eligible";
  }

  return "Review Needed";
}
