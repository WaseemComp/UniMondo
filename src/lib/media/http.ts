import { NextResponse } from "next/server";
import { MediaError } from "./catalogue";
import { mediaFormLimit } from "./operations";

export function mediaFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (error instanceof MediaError) return NextResponse.json({ error: message }, { status: error.status });
  if (message === "Unauthorized") return NextResponse.json({ error: "Sign in to use the image library." }, { status: 401 });
  if (message === "MEDIA_FORBIDDEN") return NextResponse.json({ error: "You do not have access to the image library." }, { status: 403 });
  return NextResponse.json({ error: "The image library is temporarily unavailable. Please retry." }, { status: 503 });
}
export function checkMediaOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || origin && origin !== new URL(request.url).origin) throw new MediaError("Open the image library in UniMondo before making changes.", 403);
}
export async function boundedMediaForm(request: Request) {
  if (Number(request.headers.get("content-length")) > mediaFormLimit) throw new MediaError("Choose an image up to 4 MB.", 413);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;") || !request.body) throw new MediaError("Choose an image to upload.");
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const next = await reader.read(); if (next.done) break;
    bytes += next.value.byteLength;
    if (bytes > mediaFormLimit) { await reader.cancel(); throw new MediaError("Choose an image up to 4 MB.", 413); }
    chunks.push(next.value);
  }
  return new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
}

export async function boundedMediaJson(request: Request) {
  if (!request.body || Number(request.headers.get("content-length")) > 8192) throw new MediaError("Image details are too long.", 413);
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const next = await reader.read(); if (next.done) break;
    bytes += next.value.byteLength;
    if (bytes > 8192) { await reader.cancel(); throw new MediaError("Image details are too long.", 413); }
    chunks.push(next.value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown; }
  catch { throw new MediaError("Check the image details and try again."); }
}
