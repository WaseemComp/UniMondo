import { z } from "zod";
import { DOCUMENT_CATEGORIES } from "./constants";

export const personalInfoSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(5, "Phone is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  nationality: z.string().min(2, "Nationality is required"),
});

export const academicInfoSchema = z
  .object({
    highestQualification: z.string().min(1, "Required"),
    institutionName: z.string().min(1, "Required"),
    gradeType: z.enum(["gpa", "percentage"]),
    obtainedGpa: z.number().optional(),
    totalGpaScale: z.number().optional(),
    obtainedPercentage: z.number().optional(),
    ieltsScore: z.number().min(0).max(9),
    graduated: z.boolean(),
    graduationDate: z.string().optional(),
    expectedGraduationDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.gradeType === "gpa") {
      if (
        data.obtainedGpa == null ||
        (typeof data.obtainedGpa === "number" && Number.isNaN(data.obtainedGpa))
      ) {
        ctx.addIssue({ code: "custom", message: "Obtained GPA is required", path: ["obtainedGpa"] });
      }
      if (
        data.totalGpaScale == null ||
        (typeof data.totalGpaScale === "number" && Number.isNaN(data.totalGpaScale)) ||
        (data.totalGpaScale != null && data.totalGpaScale <= 0)
      ) {
        ctx.addIssue({ code: "custom", message: "Total GPA scale is required (e.g. 4.0)", path: ["totalGpaScale"] });
      }
      if (
        data.obtainedGpa != null &&
        data.totalGpaScale != null &&
        data.obtainedGpa > data.totalGpaScale
      ) {
        ctx.addIssue({ code: "custom", message: "GPA cannot exceed scale", path: ["obtainedGpa"] });
      }
    } else {
      if (
        data.obtainedPercentage == null ||
        (typeof data.obtainedPercentage === "number" && Number.isNaN(data.obtainedPercentage))
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Percentage is required",
          path: ["obtainedPercentage"],
        });
      }
      if (
        data.obtainedPercentage != null &&
        (data.obtainedPercentage < 0 || data.obtainedPercentage > 100)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Percentage must be 0–100",
          path: ["obtainedPercentage"],
        });
      }
    }
    if (data.graduated) {
      if (!data.graduationDate?.trim()) {
        ctx.addIssue({ code: "custom", message: "Graduation date is required", path: ["graduationDate"] });
      }
    } else if (!data.expectedGraduationDate?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Expected graduation date is required",
        path: ["expectedGraduationDate"],
      });
    }
  });

export const destinationRowSchema = z.object({
  rank: z.number().int().min(1).max(3),
  country: z.string().min(1, "Select a country"),
});

export const studyPreferencesSchema = z
  .object({
    intake: z.enum(["Fall 2026", "Spring 2027"]),
    preferredContinent: z.string().min(1, "Required"),
    destinations: z.array(destinationRowSchema).min(1, "Add at least one destination").max(3),
    programInterest: z.string().min(1, "Program interest is required"),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const countries = data.destinations.map((d) => d.country.trim()).filter(Boolean);
    if (countries.length !== new Set(countries).size) {
      ctx.addIssue({
        code: "custom",
        message: "Each destination must be a different country.",
        path: ["destinations"],
      });
    }
    const ranks = [...data.destinations.map((d) => d.rank)].sort((a, b) => a - b);
    for (let i = 0; i < ranks.length; i++) {
      if (ranks[i] !== i + 1) {
        ctx.addIssue({
          code: "custom",
          message: "Destination ranks must be consecutive (1, 2, 3, …).",
          path: ["destinations"],
        });
        break;
      }
    }
  });

export const packageSelectionSchema = z.object({
  packageId: z.string().uuid("Select a support package"),
  packageSlug: z.string().min(1),
  packageName: z.string().min(1),
  addonIds: z.array(z.string()),
});

export const applicationFormSchema = z.object({
  personalInfo: personalInfoSchema,
  academicInfo: academicInfoSchema,
  studyPreferences: studyPreferencesSchema,
  packageSelection: packageSelectionSchema,
});

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

export const documentCategorySchema = z.enum(DOCUMENT_CATEGORIES);

export const uploadMetaSchema = z.object({
  category: documentCategorySchema,
  description: z.string().optional().default(""),
});

export const documentMetaListSchema = z.array(uploadMetaSchema);

export const serverSubmitPayloadSchema = applicationFormSchema.extend({
  sourceCountry: z.string().optional(),
  sourceProgram: z.string().optional(),
});
