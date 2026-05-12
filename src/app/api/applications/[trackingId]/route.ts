import { NextRequest, NextResponse } from "next/server";
import {
  deleteApplicationByTrackingId,
  getApplicationRecordByTrackingId,
} from "@/lib/persistence";
import { getApplicationTypeByTrackingId } from "@/lib/persistence-admin";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { isAdminUser } from "@/lib/auth/admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import type { ApplicationType } from "@/types/application";

type Context = {
  params: Promise<{ trackingId: string }>;
};

async function authorizeApplicationAccess(
  user: { id: string; email?: string | null },
  applicationType: ApplicationType,
  mode: "view" | "delete"
) {
  const isSub = applicationType === "work_with_us" || applicationType === "join_us";
  const permDelete = isSub ? "submissions.delete" : "applications.delete";
  const permView = isSub ? "submissions.view" : "applications.view";

  if (mode === "delete") {
    return await hasAdminPermission(user, permDelete);
  }
  return await hasAdminPermission(user, permView);
}

export async function GET(_request: NextRequest, context: Context) {
  try {
    const supabase = await createSupabaseServerAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { trackingId } = await context.params;

    const record = await getApplicationRecordByTrackingId(trackingId);
    if (!record) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    const appType = (record.applicationType ?? "university") as ApplicationType;
    if (!(await authorizeApplicationAccess(user, appType, "view"))) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ application: record });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to load application." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const supabase = await createSupabaseServerAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { trackingId } = await context.params;

    const appType = await getApplicationTypeByTrackingId(trackingId);
    if (!appType) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    if (!(await authorizeApplicationAccess(user, appType, "delete"))) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const deleted = await deleteApplicationByTrackingId(trackingId);
    if (!deleted) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to delete application." },
      { status: 500 }
    );
  }
}
