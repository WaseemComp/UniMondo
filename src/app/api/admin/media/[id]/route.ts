import { NextResponse } from "next/server";
import { requireMediaAccess } from "@/lib/media/access";
import { changeMedia, librarySelection } from "@/lib/media/operations";
import { boundedMediaJson, checkMediaOrigin, mediaFailure } from "@/lib/media/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try { const { permissions } = await requireMediaAccess(); const { id } = await context.params; return NextResponse.json({ asset: await librarySelection(id, permissions) }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return mediaFailure(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    checkMediaOrigin(request);
    const { user, permissions } = await requireMediaAccess();
    const { id } = await context.params;
    const result = await changeMedia(id, await boundedMediaJson(request), user.id, permissions);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return mediaFailure(error); }
}
