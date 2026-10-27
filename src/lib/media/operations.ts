import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { MediaAsset, MediaCategory, MediaGrants } from "./types";
import { MAX_UPLOAD_BYTES, MEDIA_BUCKET, MEDIA_PREFIX } from "./types";
import { MediaError, MEDIA_COLUMNS, imageIdentity, loadMediaCatalogue, mediaService, selectedMediaAsset, type MediaRow } from "./catalogue";
import { prepareMediaImage } from "./image";

const categorySchema = z.enum(["hero", "destinations", "universities", "stories", "general"]);
export async function uploadMedia(form: FormData, userId: string, permissions: MediaGrants): Promise<MediaAsset> {
  const category = categorySchema.safeParse(form.get("category"));
  if (!category.success || !permissions[category.data].upload) throw new MediaError("You do not have permission to upload to this category.", 403);
  const file = form.get("file"), alt = String(form.get("alt") ?? "").trim();
  if (!(file instanceof File) || form.getAll("file").length !== 1) throw new MediaError("Choose one image to upload.");
  if (!alt || alt.length > 500) throw new MediaError("Add an image description, up to 500 characters.");
  const service = mediaService();
  const { data: bucket, error: bucketError } = await service.storage.getBucket(MEDIA_BUCKET);
  if (bucketError || !bucket?.public || bucket.allowed_mime_types && !bucket.allowed_mime_types.includes("image/webp")) throw new MediaError("The existing website-image bucket is unavailable or incompatible. No storage settings have been changed.", 503);
  let image;
  try { image = await prepareMediaImage(file); }
  catch (error) { throw new MediaError(error instanceof Error ? error.message : "Choose a supported website image."); }
  if (bucket.file_size_limit && image.bytes > bucket.file_size_limit) throw new MediaError("The optimized image exceeds the existing bucket’s limit.");
  const id = randomUUID(), path = `${MEDIA_PREFIX}${id}.webp`;
  const { data: address } = service.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  const originalName = (file.name.split(/[\\/]/).pop() || "Website image").replace(/[\u0000-\u001f\u007f]/g, "").normalize("NFC").slice(0, 255);
  const row = { id, url: address.publicUrl, object_path: path, source: "upload", original_name: originalName, alt_text: alt, category: category.data, width: image.width, height: image.height, byte_size: image.bytes, mime_type: image.mime, status: "uploading", created_by: userId };
  const { error: reservationError } = await service.from("cms_media_assets").insert(row);
  if (reservationError) throw new MediaError("The image catalogue is not ready. No file was uploaded. Apply the prepared catalogue migration before release.", 503);
  const { error: uploadError } = await service.storage.from(MEDIA_BUCKET).upload(path, image.data, { contentType: image.mime, cacheControl: "31536000", upsert: false });
  if (uploadError) {
    // This UUID path was reserved by this request and has never been selectable or published.
    await service.storage.from(MEDIA_BUCKET).remove([path]);
    await service.from("cms_media_assets").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", id).eq("status", "uploading");
    throw new MediaError("The upload did not finish. Your existing images and content are unchanged. Refresh before retrying.", 502);
  }
  const { data: stored, error: activationError } = await service.from("cms_media_assets").update({ status: "ready", updated_at: new Date().toISOString() }).eq("id", id).eq("status", "uploading").select(MEDIA_COLUMNS).single();
  // Keep the file on uncertain database acknowledgement. Never remove an asset that may be ready.
  if (activationError || !stored || stored.url !== address.publicUrl || stored.byte_size !== image.bytes) throw new MediaError("The file reached storage, but catalogue confirmation is pending. Refresh the library before retrying; original images were not changed.", 503);
  return { id, url: stored.url, name: stored.original_name, alt: stored.alt_text, category: stored.category, width: stored.width, height: stored.height, bytes: stored.byte_size, createdAt: stored.created_at, source: "upload", archived: false, usage: [], usageVerified: false, heroCompatible: true };
}

const mutationSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("details"), category: categorySchema, alt: z.string().trim().max(500) }).strict(),
  z.object({ operation: z.literal("archive"), confirm: z.literal(true) }).strict(),
  z.object({ operation: z.literal("restore") }).strict(),
]);
export async function changeMedia(id: string, input: unknown, userId: string, permissions: MediaGrants) {
  if (!/^(?:[0-9a-f]{8}-[0-9a-f-]{27}|legacy:[0-9a-f]{64})$/i.test(id)) throw new MediaError("Choose a library image.");
  const parsed = mutationSchema.safeParse(input);
  if (!parsed.success) throw new MediaError("Check the image details and try again.");
  const catalogue = await loadMediaCatalogue(permissions);
  if (!catalogue.metadataReady) throw new MediaError("Catalogue setup is pending. Existing content has not changed.", 503);
  const asset = catalogue.assets.find(asset => asset.id === id);
  if (!asset) throw new MediaError("This image is unavailable or access is denied.", 404);
  const change = parsed.data, grant = permissions[asset.category];
  if (change.operation === "archive") {
    if (!grant.archive) throw new MediaError("You do not have permission to archive this image.", 403);
    if (!asset.usageVerified || asset.usage.length) throw new MediaError("This image is in use or its usage cannot be verified. Replace and save the content first; the original file will be retained.", 409);
  } else if (!grant.edit || change.operation === "details" && !permissions[change.category].edit) throw new MediaError("You do not have permission to change these image details.", 403);
  const service = mediaService();
  let current: MediaRow;
  if (id.startsWith("legacy:")) {
    const row = { id: randomUUID(), url: asset.url, object_path: null, source: asset.source, original_name: asset.name, alt_text: asset.alt, category: asset.category, width: asset.width, height: asset.height, byte_size: asset.bytes, status: "ready", created_by: userId };
    const inserted = await service.from("cms_media_assets").insert(row).select(MEDIA_COLUMNS).single();
    if (inserted.error || !inserted.data) throw new MediaError("Image details changed in another session. Refresh before retrying.", 409);
    current = inserted.data as MediaRow;
  } else {
    const { data, error } = await service.from("cms_media_assets").select(MEDIA_COLUMNS).eq("id", id).eq("status", "ready").single();
    if (error || !data || imageIdentity(data.url) !== imageIdentity(asset.url)) throw new MediaError("This image changed. Refresh before retrying.", 409);
    current = data as MediaRow;
  }
  const patch = change.operation === "details" ? { category: change.category, alt_text: change.alt } : { archived_at: change.operation === "archive" ? new Date().toISOString() : null };
  const { data, error } = await service.from("cms_media_assets").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", current.id).eq("updated_at", current.updated_at).select("id,url").single();
  if (error || !data || data.url !== current.url) throw new MediaError("Image details could not be confirmed. Refresh before retrying.", 409);
  return { id: data.id };
}

export async function validateManagedMediaSelection(url: string, permissions: MediaGrants) {
  const service = mediaService();
  const managed = imageIdentity(url).includes(`/${MEDIA_PREFIX}`);
  const { data, error } = await service.from("cms_media_assets").select("id,category,status,archived_at").eq("url", managed ? imageIdentity(url) : url).maybeSingle();
  if (error && ["42P01", "PGRST205"].includes(error.code)) {
    if (managed) throw new MediaError("The selected image’s catalogue is unavailable. Choose an existing website image.", 409);
    return;
  }
  if (error) throw new MediaError("Image availability could not be checked. Retry before saving.", 503);
  if (data && (data.status !== "ready" || data.archived_at || !permissions[data.category as MediaCategory]?.view)) throw new MediaError("The selected image is archived or no longer available to your account.", 409);
  if (!data && managed) throw new MediaError("Choose an image from the library before saving.", 409);
}
export async function librarySelection(id: string, permissions: MediaGrants) { return selectedMediaAsset(id, permissions); }
export const mediaFormLimit = MAX_UPLOAD_BYTES + 64 * 1024;
