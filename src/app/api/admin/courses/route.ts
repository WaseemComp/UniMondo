import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  catalogueAccess,
  readPriceCatalogue,
  savePriceDraft,
} from "@/app/admin/cms/catalogue-actions";
function failure(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Course request failed.";
  return NextResponse.json(
    { message },
    {
      status:
        message === "Unauthorized"
          ? 401
          : /permission|access|allowed|Forbidden/i.test(message)
            ? 403
            : 400,
    },
  );
}
export async function GET() {
  try {
    const result = await readPriceCatalogue("courses");
    return NextResponse.json({
      courses: result.rows,
      websiteDefaults: result.defaults,
    });
  } catch (e) {
    return failure(e);
  }
}
async function write(request: Request, method: string) {
  try {
    await catalogueAccess("courses");
    const body = await request.json(),
      id = method === "POST" ? randomUUID() : body.id;
    if (method !== "POST" && typeof body.version !== "number")
      throw new Error(
        "Reload the current course editor before saving; a draft version is required.",
      );
    const { version, currencyChangeConfirmed, ...values } = body;
    delete values.id;
    const result = await savePriceDraft({
      kind: "courses",
      id,
      version: version ?? 0,
      currencyChangeConfirmed: currencyChangeConfirmed === true,
      values: {
        ...values,
        currency_code: values.currency_code ?? null,
        sort_order: values.sort_order ?? 0,
        source_key: values.source_key ?? null,
      },
    });
    return result.ok
      ? NextResponse.json({ ok: true, id, draft: true })
      : NextResponse.json({ message: result.error }, { status: 400 });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  return write(request, "POST");
}
export async function PATCH(request: Request) {
  return write(request, "PATCH");
}
export async function DELETE(request: Request) {
  try {
    await catalogueAccess("courses");
    const url = new URL(request.url),
      id = url.searchParams.get("id"),
      version = Number(url.searchParams.get("version"));
    if (!id || !url.searchParams.has("version"))
      throw new Error("Choose an existing course and draft version.");
    const result = await savePriceDraft({
      kind: "courses",
      id,
      version,
      values: {},
      archive: true,
    });
    return result.ok
      ? NextResponse.json({ ok: true, draft: true })
      : NextResponse.json({ message: result.error }, { status: 400 });
  } catch (e) {
    return failure(e);
  }
}
