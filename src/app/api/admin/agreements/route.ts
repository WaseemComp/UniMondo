import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { isAdminUser, isSuperAdmin } from "@/lib/auth/admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { getAgreementsList, saveAgreement } from "@/lib/agreements/persistence";
import type { AgreementFormInput } from "@/types/agreement";

export async function GET() {
  try {
    const supabase = await createSupabaseServerAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const agreements = await getAgreementsList();
    return NextResponse.json({ agreements });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to load agreements." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as AgreementFormInput;

    // Check discount permissions if discount is being applied
    const discountVal = typeof body.discountValue === "number" ? body.discountValue : parseFloat(String(body.discountValue || "0"));
    if (discountVal > 0) {
      const isSuper = await isSuperAdmin(user);
      const hasDiscountPerm = await hasAdminPermission(user, "agreements.discount");
      if (!isSuper && !hasDiscountPerm) {
        return NextResponse.json(
          { message: "You do not have administrative authority to approve discounts." },
          { status: 403 }
        );
      }
    }

    const agreement = await saveAgreement(body, user.email || undefined);
    return NextResponse.json({ agreement }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to save agreement." },
      { status: 500 }
    );
  }
}
