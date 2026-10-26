import { agreementInput } from "@/lib/agreements/input";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { isAdminUser, isSuperAdmin } from "@/lib/auth/admin";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { AgreementPersistenceError, changeAgreementStatus, deleteAgreement, getAgreementById, saveAgreement } from "@/lib/agreements/persistence";
import { requiresAgreementPricingApproval, validateAgreementPricing, validateAgreementForExport } from "@/lib/agreements/financials";
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
      { status: error instanceof AgreementPersistenceError ? error.status : 500 }
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
    const existing = await getAgreementById(id, true);
    if (!existing) {
      return NextResponse.json({ message: "Agreement not found." }, { status: 404 });
    }

    const body = agreementInput((await request.json()) as AgreementFormInput);
    if (body.status && body.status !== "draft") return NextResponse.json({ message: "Manage status from the Agreements page." }, { status: 403 });
    const errors = validateAgreementPricing(body);
    if (errors.length) return NextResponse.json({ message: errors[0].message, errors }, { status: 400 });

    if (requiresAgreementPricingApproval(body, existing.financials)) {
      const isSuper = await isSuperAdmin(user);
      const hasDiscountPerm = await hasAdminPermission(user, "agreements.discount");
      if (!isSuper && !hasDiscountPerm) {
        return NextResponse.json(
          { message: "You do not have administrative authority to alter discounts." },
          { status: 403 }
        );
      }
    }

    const updated = await saveAgreement({ ...body, id }, user.email || user.id, body.version);
    return NextResponse.json({ agreement: updated });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update agreement." },
      { status: error instanceof AgreementPersistenceError ? error.status : 500 }
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

    if (!await isSuperAdmin(user)) return NextResponse.json({ message: "Only Superadmin may delete agreements." }, { status: 403 });
    const { id } = await params;
    const body = await _request.json();
    await deleteAgreement(id, body.version, user.email || user.id, true);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to delete agreement." },
      { status: error instanceof AgreementPersistenceError ? error.status : 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const supabase = await createSupabaseServerAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !await isAdminUser(user)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!await isSuperAdmin(user)) return NextResponse.json({ message: "Only Superadmin may change agreement status." }, { status: 403 });
    const { id } = await params;
    const body = await request.json();
    if (!["draft", "finalized"].includes(body.status)) return NextResponse.json({ message: "Invalid status." }, { status: 400 });
    const existing = await getAgreementById(id, true);
    if (!existing) return NextResponse.json({ message: "Agreement not found." }, { status: 404 });
    if (body.status === "finalized") {
      const errors = validateAgreementForExport({ ...existing, ...existing.financials });
      if (errors.length) return NextResponse.json({ message: errors[0].message, errors }, { status: 400 });
    }
    const agreement = await changeAgreementStatus(id, body.status, body.version, user.email || user.id, true);
    return NextResponse.json({ agreement });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to change status." },
      { status: error instanceof AgreementPersistenceError ? error.status : 500 });
  }
}
