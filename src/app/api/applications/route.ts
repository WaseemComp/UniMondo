import { NextRequest, NextResponse } from "next/server";
import { buildPayloadSnapshot } from "@/lib/apply/map-to-legacy";
import { documentMetaListSchema, serverSubmitPayloadSchema } from "@/lib/apply/schema";
import { triggerStudentEmail } from "@/lib/notifications";
import { createApplicationWithDocuments, getApplications } from "@/lib/persistence";
import { evaluateApplication } from "@/lib/screening";
import { generateTrackingId } from "@/lib/tracking";
import type { ApplicationFormValues } from "@/lib/apply/schema";
import type { ReviewStatus } from "@/types/application";

export async function GET(request: NextRequest) {
  try {
    const statusParam = request.nextUrl.searchParams.get("status") as ReviewStatus | null;
    const applications = await getApplications(statusParam || undefined);
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

    const { sourceCountry, sourceProgram, ...rest } = parsedApp.data;
    const formValues: ApplicationFormValues = {
      personalInfo: rest.personalInfo,
      academicInfo: rest.academicInfo,
      studyPreferences: rest.studyPreferences,
      packageSelection: rest.packageSelection,
    };

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
    const payload = buildPayloadSnapshot(formValues, {
      country: sourceCountry,
      program: sourceProgram,
    });
    const screeningTag = evaluateApplication(payload.academicBackground);
    const submittedAt = new Date().toISOString();

    const record = await createApplicationWithDocuments({
      trackingId,
      submittedAt,
      screeningTag,
      reviewStatus: "Pending",
      payload,
      personalInfo: formValues.personalInfo,
      academicInfo: formValues.academicInfo,
      studyPreferences: formValues.studyPreferences,
      selectedPackage: formValues.packageSelection.packageSlug,
      selectedAddons: formValues.packageSelection.addonIds,
      documentItems: files.map((file, i) => ({
        file,
        category: parsedMeta.data[i].category,
        description: parsedMeta.data[i].description ?? "",
      })),
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
