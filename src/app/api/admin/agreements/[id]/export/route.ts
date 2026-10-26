import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { isAdminUser } from "@/lib/auth/admin";
import { getAgreementById } from "@/lib/agreements/persistence";
import { validateAgreementForExport } from "@/lib/agreements/financials";
import { generateAgreementDocx } from "@/lib/agreements/docx-generator";
import { generateAgreementPdf } from "@/lib/agreements/pdf-generator";

type Props = {
  params: Promise<{ id: string }>;
};

function safeFilename(ref: string, ext: string): string {
  const cleanRef = ref.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `UniMondo_Agreement_${cleanRef}.${ext}`;
}

export async function GET(request: NextRequest, { params }: Props) {
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

    const format = request.nextUrl.searchParams.get("format")?.toLowerCase() || "docx";

    // Validate agreement for export
    const validationErrors = validateAgreementForExport({
      referenceNumber: agreement.referenceNumber,
      agreementDate: agreement.agreementDate,
      applicationId: agreement.applicationId,
      status: agreement.status,
      consultantEntityName: agreement.consultantEntityName,
      consultantRegNumber: agreement.consultantRegNumber,
      consultantAddress: agreement.consultantAddress,
      studentFullName: agreement.studentFullName,
      studentParentGuardian: agreement.studentParentGuardian,
      studentCnicPassport: agreement.studentCnicPassport,
      studentAddress: agreement.studentAddress,
      studentEmail: agreement.studentEmail,
      studentPhone: agreement.studentPhone,
      degreeLevel: agreement.degreeLevel,
      fieldOfStudy: agreement.fieldOfStudy,
      preferredDestination: agreement.preferredDestination,
      academicYearIntake: agreement.academicYearIntake,
      paymentCurrency: agreement.financials.paymentCurrency,
      agreedExchangeRate: agreement.financials.agreedExchangeRate,
      exchangeRateDate: agreement.financials.exchangeRateDate,
      discountType: agreement.financials.discountType,
      discountValue: agreement.financials.discountValue,
      repName: agreement.repName,
      repDesignation: agreement.repDesignation,
      repDate: agreement.repDate,
      studentSignatureDate: agreement.studentSignatureDate,
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          message: "Agreement has missing required fields for export.",
          errors: validationErrors,
        },
        { status: 400 }
      );
    }

    if (format === "pdf") {
      const pdfBuffer = await generateAgreementPdf(agreement);
      const filename = safeFilename(agreement.referenceNumber || agreement.id, "pdf");

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(pdfBuffer.length),
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    // Default: docx
    const docxBuffer = await generateAgreementDocx(agreement);
    const filename = safeFilename(agreement.referenceNumber || agreement.id, "docx");

    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(docxBuffer.length),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[agreements-export] Error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to export agreement." },
      { status: 500 }
    );
  }
}
