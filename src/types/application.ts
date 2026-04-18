export type ScreeningTag = "Eligible" | "Review Needed" | "Not Eligible";

export type ReviewStatus = "Pending" | "Approved" | "Need More Info" | "Rejected";

export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
}

export interface AcademicBackground {
  highestQualification: string;
  institutionName: string;
  gpa: number;
  ieltsScore: number;
  graduationYear: string;
}

export interface ProgramPreferences {
  intake: "Fall 2026" | "Spring 2027";
  preferredContinent: string;
  destinationChoices: Array<{ rank: 1 | 2 | 3; country: string }>;
  manualDestination?: string;
  programInterest: string;
  notes?: string;
}

export interface UploadedDocument {
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface PackageSelection {
  /** Selected main package id (UUID from `packages`). */
  packageId: string;
  packageSlug: string;
  packageName: string;
  /** Selected add-on ids (UUID from `add_ons`). */
  addonIds: string[];
}

export interface ApplicationPayload {
  personalInfo: PersonalInfo;
  academicBackground: AcademicBackground;
  programPreferences: ProgramPreferences;
  /** Step 4: support package + optional add-ons (stored in Supabase with application). */
  packageSelection?: PackageSelection;
  sourceCountry?: string;
  sourceProgram?: string;
}

export interface ApplicationRecord {
  trackingId: string;
  submittedAt: string;
  screeningTag: ScreeningTag;
  reviewStatus: ReviewStatus;
  payload: ApplicationPayload;
  documents: UploadedDocument[];
}
