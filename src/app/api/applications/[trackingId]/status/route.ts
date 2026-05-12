import { NextRequest, NextResponse } from "next/server";
import { updateApplicationStatus } from "@/lib/persistence";
import { getApplicationTypeByTrackingId } from "@/lib/persistence-admin";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { isAdminUser } from "@/lib/auth/admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import type { ReviewStatus } from "@/types/application";

type Context = {
  params: Promise<{ trackingId: string }>;
};

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const supabase = await createSupabaseServerAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { trackingId } = await context.params;
    const body = (await request.json()) as { reviewStatus?: ReviewStatus };

    if (!body.reviewStatus) {
      return NextResponse.json({ message: "reviewStatus is required." }, { status: 400 });
    }

    const allowed: ReviewStatus[] = ["Pending", "Approved", "Need More Info", "Rejected", "Completed"];

    if (!allowed.includes(body.reviewStatus)) {
      return NextResponse.json({ message: "Invalid review status." }, { status: 400 });
    }

    const appType = await getApplicationTypeByTrackingId(trackingId);
    const isSub = appType === "work_with_us" || appType === "join_us";
    const permKey = isSub ? "submissions.edit_status" : "applications.edit_status";
    if (!(await hasAdminPermission(user, permKey))) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
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
