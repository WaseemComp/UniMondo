import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { isAdminUser, isSuperAdmin } from "@/lib/auth/admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { deleteAgreement, getAgreementById, saveAgreement } from "@/lib/agreements/persistence";
import type { AgreementFormInput } from "@/types/agreement";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: Props) {
  try {
    const supabase = await createSupabaseServerAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const agreement = await getAgreementById(id);
    if (!agreement) {
      return NextResponse.json({ message: "Agreement not found." }, { status: 404 });
    }

    return NextResponse.json({ agreement });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to load agreement." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const supabase = await createSupabaseServerAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getAgreementById(id);
    if (!existing) {
      return NextResponse.json({ message: "Agreement not found." }, { status: 404 });
    }

    const body = (await request.json()) as AgreementFormInput;

    const discountVal = typeof body.discountValue === "number" ? body.discountValue : parseFloat(String(body.discountValue || "0"));
    const existingDiscountVal = existing.financials.discountValue;

    // If discount is being changed or introduced, enforce administrative authority
    if (discountVal > 0 && discountVal !== existingDiscountVal) {
      const isSuper = await isSuperAdmin(user);
      const hasDiscountPerm = await hasAdminPermission(user, "agreements.discount");
      if (!isSuper && !hasDiscountPerm) {
        return NextResponse.json(
          { message: "You do not have administrative authority to alter discounts." },
          { status: 403 }
        );
      }
    }

    const updated = await saveAgreement({ ...body, id }, user.email || undefined);
    return NextResponse.json({ agreement: updated });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update agreement." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  try {
    const supabase = await createSupabaseServerAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deleteAgreement(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to delete agreement." },
      { status: 500 }
    );
  }
}
