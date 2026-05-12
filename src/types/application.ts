export type ScreeningTag = "Eligible" | "Review Needed" | "Not Eligible";

export type ReviewStatus = "Pending" | "Approved" | "Need More Info" | "Rejected" | "Completed";

export type ApplicationType = "university" | "language_course" | "work_with_us" | "join_us";

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
  /** Undergraduate vs graduate program (added after earlier submissions). */
  programLevel?: "bachelors_undergraduate" | "masters_postgraduate";
  preferredContinent: string;
  destinationChoices: Array<{ rank: 1 | 2 | 3; country: string }>;
  programInterest: string;
  notes?: string;
}

export interface UploadedDocument {
  name: string;
  type: string;
  size: number;
  url: string;
  category?: string;
  description?: string;
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
  /** Unified submissions: non-university payloads live here. */
  submission?: {
    applicationType: ApplicationType;
    data: unknown;
  };
}

export interface ApplicationRecord {
  trackingId: string;
  submittedAt: string;
  /** Submission pipeline field from `applications.status` (e.g. submitted). */
  pipelineStatus?: string;
  screeningTag: ScreeningTag;
  reviewStatus: ReviewStatus;
  /** Unified submissions system (defaults to university). */
  applicationType?: ApplicationType;
  payload: ApplicationPayload;
  documents: UploadedDocument[];
}
