import { NextRequest, NextResponse } from "next/server";
import { triggerStudentEmail } from "@/lib/notifications";
import { getApplications, saveApplication, uploadDocuments } from "@/lib/persistence";
import { evaluateApplication } from "@/lib/screening";
import { generateTrackingId } from "@/lib/tracking";
import type { ApplicationPayload, ReviewStatus } from "@/types/application";

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

    if (!rawApplication || typeof rawApplication !== "string") {
      return NextResponse.json({ message: "Application payload is missing." }, { status: 400 });
    }

    const payload = JSON.parse(rawApplication) as ApplicationPayload;
    const files = formData.getAll("documents").filter((entry): entry is File => entry instanceof File);

    const trackingId = generateTrackingId();
    const screeningTag = evaluateApplication(payload.academicBackground);
    const submittedAt = new Date().toISOString();

    const uploadedDocuments = await uploadDocuments(files, trackingId);

    const record = {
      trackingId,
      submittedAt,
      screeningTag,
      reviewStatus: "Pending" as const,
      payload,
      documents: uploadedDocuments,
    };

    await saveApplication(record);
    await triggerStudentEmail(record);

    return NextResponse.json({ trackingId, screeningTag }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to submit application." },
      { status: 500 }
    );
  }
}
