import { NextRequest, NextResponse } from "next/server";
import { updateApplicationStatus } from "@/lib/persistence";
import type { ReviewStatus } from "@/types/application";

type Context = {
  params: Promise<{ trackingId: string }>;
};

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { trackingId } = await context.params;
    const body = (await request.json()) as { reviewStatus?: ReviewStatus };

    if (!body.reviewStatus) {
      return NextResponse.json({ message: "reviewStatus is required." }, { status: 400 });
    }

    const allowed: ReviewStatus[] = ["Pending", "Approved", "Need More Info", "Rejected"];

    if (!allowed.includes(body.reviewStatus)) {
      return NextResponse.json({ message: "Invalid review status." }, { status: 400 });
    }

    const updated = await updateApplicationStatus(trackingId, body.reviewStatus);

    if (!updated) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update status." },
      { status: 500 }
    );
  }
}
