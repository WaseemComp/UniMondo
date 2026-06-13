import { NextResponse } from "next/server";
import { getApplicationRecordByTrackingId } from "@/lib/persistence";
import { isAdminUser } from "@/lib/auth/admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import type { ApplicationRecord, ApplicationType } from "@/types/application";

export async function requireApplicationViewer(trackingId: string): Promise<
  | { record: ApplicationRecord }
  | { error: NextResponse }
> {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isAdminUser(user))) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  const record = await getApplicationRecordByTrackingId(trackingId);
  if (!record) {
    return { error: NextResponse.json({ message: "Application not found." }, { status: 404 }) };
  }

  const appType = (record.applicationType ?? "university") as ApplicationType;
  const isSubmission = appType === "work_with_us" || appType === "join_us";
  const permView = isSubmission ? "submissions.view" : "applications.view";

  if (!(await hasAdminPermission(user, permView))) {
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }

  return { record };
}
