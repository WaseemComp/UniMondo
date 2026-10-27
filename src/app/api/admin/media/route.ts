import { NextResponse } from "next/server";
import { requireMediaAccess } from "@/lib/media/access";
import { loadMediaCatalogue } from "@/lib/media/catalogue";
import { uploadMedia } from "@/lib/media/operations";
import { boundedMediaForm, checkMediaOrigin, mediaFailure } from "@/lib/media/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const { permissions } = await requireMediaAccess();
    const catalogue = await loadMediaCatalogue(permissions);
    const params = new URL(request.url).searchParams, search = (params.get("q") ?? "").trim().toLowerCase().slice(0, 100), category = params.get("category"), archived = params.get("archived") === "true";
    const offset = Math.min(10000, Math.max(0, Number(params.get("offset")) || 0));
    const matching = catalogue.assets.filter(asset => asset.archived === archived && (!category || asset.category === category) && (!search || `${asset.name} ${asset.alt}`.toLowerCase().includes(search)));
    return NextResponse.json({ ...catalogue, assets: matching.slice(offset, offset + 60), total: matching.length }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return mediaFailure(error); }
}
export async function POST(request: Request) {
  try {
    checkMediaOrigin(request);
    const { user, permissions } = await requireMediaAccess();
    const form = await boundedMediaForm(request);
    const asset = await uploadMedia(form, user.id, permissions);
    return NextResponse.json({ asset }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return mediaFailure(error); }
}
