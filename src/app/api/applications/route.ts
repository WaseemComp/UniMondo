import { NextRequest, NextResponse } from "next/server";
import { buildPayloadSnapshot } from "@/lib/apply/map-to-legacy";
import { documentMetaListSchema, serverSubmitPayloadSchema } from "@/lib/apply/schema";
import { triggerStudentEmail } from "@/lib/notifications";
import { createApplicationWithDocuments, getApplications } from "@/lib/persistence";
import { evaluateApplication } from "@/lib/screening";
import { generateTrackingId } from "@/lib/tracking";
import type { ApplicationFormValues } from "@/lib/apply/schema";
import type { ApplicationPayload, ApplicationType, ReviewStatus } from "@/types/application";

export async function GET(request: NextRequest) {
  try {
    const statusParam = request.nextUrl.searchParams.get("status") as ReviewStatus | null;
    const typeParam = request.nextUrl.searchParams.get("type") as ApplicationType | null;
    const allowedStatuses: ReviewStatus[] = ["Pending", "Approved", "Need More Info", "Rejected"];
    const allowedTypes: ApplicationType[] = ["university", "language_course", "work_with_us", "join_us"];

    const status = statusParam && allowedStatuses.includes(statusParam) ? statusParam : undefined;
    const type = typeParam && allowedTypes.includes(typeParam) ? typeParam : undefined;

    const applications = await getApplications({ status, type });
    return NextResponse.json({ applications });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to load applications." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const rawApplication = formData.get("application");
    const rawMeta = formData.get("documentMeta");

    if (!rawApplication || typeof rawApplication !== "string") {
      return NextResponse.json({ message: "Application payload is missing." }, { status: 400 });
    }

    let json: unknown;
    try {
      json = JSON.parse(rawApplication);
    } catch {
      return NextResponse.json({ message: "Invalid application JSON." }, { status: 400 });
    }

    const parsedApp = serverSubmitPayloadSchema.safeParse(json);
    if (!parsedApp.success) {
      return NextResponse.json(
        { message: "Validation failed.", issues: parsedApp.error.issues },
        { status: 400 }
      );
    }

    const applicationType = parsedApp.data.applicationType as ApplicationType;

    let metaJson: unknown = [];
    if (rawMeta != null && typeof rawMeta === "string") {
      try {
        metaJson = JSON.parse(rawMeta);
      } catch {
        return NextResponse.json({ message: "Invalid document metadata JSON." }, { status: 400 });
      }
    }

    const parsedMeta = documentMetaListSchema.safeParse(metaJson);
    if (!parsedMeta.success) {
      return NextResponse.json(
        { message: "Invalid document metadata.", issues: parsedMeta.error.issues },
        { status: 400 }
      );
    }

    const files = formData.getAll("documents").filter((entry): entry is File => entry instanceof File);

    if (parsedMeta.data.length !== files.length) {
      return NextResponse.json(
        { message: "Each uploaded file must include matching metadata (category and description)." },
        { status: 400 }
      );
    }

    const trackingId = generateTrackingId();
    const submittedAt = new Date().toISOString();

    const commonDocItems = files.map((file, i) => ({
      file,
      category: parsedMeta.data[i].category,
      description: parsedMeta.data[i].description ?? "",
    }));

    if (applicationType !== "university") {
      const contact =
        "contact" in parsedApp.data && parsedApp.data.contact && typeof parsedApp.data.contact === "object"
          ? (parsedApp.data.contact as { fullName: string; email: string; phone: string })
          : { fullName: "—", email: "—", phone: "—" };

      const payload: ApplicationPayload = {
        personalInfo: {
          fullName: contact.fullName,
          email: contact.email,
          phone: contact.phone,
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
          preferredContinent: "",
          destinationChoices: [],
          programInterest: "",
        },
        submission: {
          applicationType,
          data: parsedApp.data,
        },
      };

      const screeningTag = "Review Needed" as const;

      await createApplicationWithDocuments({
        trackingId,
        submittedAt,
        screeningTag,
        reviewStatus: "Pending",
        applicationType,
        payload,
        personalInfo: contact,
        documentItems: commonDocItems,
      });

      return NextResponse.json({ trackingId, screeningTag }, { status: 201 });
    }

    const data = parsedApp.data as unknown as {
      personalInfo: ApplicationFormValues["personalInfo"];
      academicInfo: ApplicationFormValues["academicInfo"];
      studyPreferences: ApplicationFormValues["studyPreferences"];
      packageSelection: ApplicationFormValues["packageSelection"];
      sourceCountry?: string;
      sourceProgram?: string;
    };

    const formValues: ApplicationFormValues = {
      personalInfo: data.personalInfo,
      academicInfo: data.academicInfo,
      studyPreferences: data.studyPreferences,
      packageSelection: data.packageSelection,
    };

    const payload = buildPayloadSnapshot(formValues, {
      country: data.sourceCountry,
      program: data.sourceProgram,
    });

    const screeningTag = evaluateApplication(payload.academicBackground);

    const record = await createApplicationWithDocuments({
      trackingId,
      submittedAt,
      screeningTag,
      reviewStatus: "Pending",
      applicationType,
      payload,
      personalInfo: formValues.personalInfo,
      academicInfo: formValues.academicInfo,
      studyPreferences: formValues.studyPreferences,
      selectedPackage: formValues.packageSelection.packageSlug,
      selectedAddons: formValues.packageSelection.addonIds,
      documentItems: commonDocItems,
    });

    await triggerStudentEmail(record);

    return NextResponse.json({ trackingId, screeningTag }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to submit application." },
      { status: 500 }
    );
  }
}
