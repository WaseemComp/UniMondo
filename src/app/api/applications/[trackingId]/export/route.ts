import { NextRequest, NextResponse } from "next/server";
import { requireApplicationViewer } from "@/lib/admin/application-api-access";
import {
  buildApplicationPdfBuffer,
  buildApplicationZipBuffer,
  pdfFilename,
  zipDownloadFilename,
} from "@/lib/apply/application-export";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ trackingId: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  try {
    const { trackingId } = await context.params;
    const auth = await requireApplicationViewer(trackingId);
    if ("error" in auth) {
      return auth.error;
    }

    const format = request.nextUrl.searchParams.get("type")?.trim().toLowerCase();
    const { record } = auth;

    if (format === "pdf") {
      const pdf = await buildApplicationPdfBuffer(record);
      return new NextResponse(new Uint8Array(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${pdfFilename(record)}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    if (format === "zip") {
      const zip = await buildApplicationZipBuffer(record);
      return new NextResponse(new Uint8Array(zip), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${zipDownloadFilename(record)}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    return NextResponse.json(
      { message: 'Invalid export type. Use ?type=pdf or ?type=zip.' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to export application." },
      { status: 500 }
    );
  }
}
