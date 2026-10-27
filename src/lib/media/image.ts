import sharp from "sharp";
import { MAX_UPLOAD_BYTES } from "./types";

export function detectedImageType(data: Buffer): string | null {
  if (data.length < 16) return null;
  if (data.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return "image/jpeg";
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (data.toString("ascii", 4, 8) === "ftyp" && /avif|avis/.test(data.toString("ascii", 8, Math.min(data.length, 48)))) return "image/avif";
  return null;
}
export async function prepareMediaImage(file: File) {
  if (!file.size || file.size > MAX_UPLOAD_BYTES) throw new Error("Choose an image up to 4 MB.");
  const input = Buffer.from(await file.arrayBuffer());
  const type = detectedImageType(input);
  if (!type || (file.type && type !== file.type.toLowerCase())) throw new Error("The file content must match a JPG, PNG, WebP or AVIF image.");
  try {
    const pipeline = sharp(input, { limitInputPixels: 36_000_000, failOn: "warning" });
    const metadata = await pipeline.metadata();
    if (!metadata.width || !metadata.height || Math.min(metadata.width, metadata.height) < 16 || Math.max(metadata.width, metadata.height) > 12000 || (metadata.pages ?? 1) > 1) throw new Error("dimensions");
    if (type === "image/avif" && metadata.compression !== "av1") throw new Error("format");
    // Normalize orientation, remove EXIF/GPS and encode a website-sized, transparent-capable image.
    const { data, info } = await pipeline.rotate().resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true }).toColourspace("srgb").webp({ quality: 88, alphaQuality: 100, effort: 4 }).toBuffer({ resolveWithObject: true });
    if (data.length > MAX_UPLOAD_BYTES) throw new Error("size");
    return { data, width: info.width, height: info.height, bytes: data.length, mime: "image/webp" as const };
  } catch { throw new Error("This image cannot be processed. Use a still image at least 16 × 16 pixels, up to 36 megapixels and 12,000 pixels per side."); }
}
