import "server-only";
import { randomBytes } from "node:crypto";
import { Binary } from "mongodb";
import { collections } from "./db";
import type { MediaDoc } from "./types";
import { MAX_STORED_BYTES, MEDIA_PATH, UPLOAD_TYPES, type UploadFolder, type UploadType } from "./upload-rules";

/*
 * Uploaded images stored in MongoDB (the `media` collection) and served from /media/<id>.<ext>.
 *
 * Why MongoDB: it is already the live, configured database, so uploads need no extra service,
 * token or paid plan. Files are resized in the browser first and capped at MAX_STORED_BYTES
 * (4 MiB), so each one fits in a single document and in one Vercel function request.
 * Product / settings / order documents store only the short URL, never the bytes.
 */

/** A failure reported to the admin with a specific status and a safe message. */
export class UploadError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Real image type from the file's first bytes (never trust the browser's MIME type). */
export function sniffImageType(bytes: Uint8Array): UploadType | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(1, 4) === "PNG" && bytes[4] === 0x0d && bytes[5] === 0x0a) return "image/png";
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Light structural check so truncated / garbage files with a valid header are rejected. */
function looksComplete(type: UploadType, bytes: Uint8Array): boolean {
  const n = bytes.length;
  if (type === "image/jpeg") {
    // Ends with the EOI marker (some encoders pad a few bytes after it).
    for (let i = n - 2; i >= Math.max(0, n - 32); i--) if (bytes[i] === 0xff && bytes[i + 1] === 0xd9) return true;
    return false;
  }
  if (type === "image/png") {
    // Last chunk is IEND.
    return n >= 12 && String.fromCharCode(...bytes.subarray(n - 8, n - 4)) === "IEND";
  }
  // WebP: RIFF size field matches the file length.
  const riffSize = bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24);
  return riffSize + 8 === n || riffSize + 9 === n; // odd-sized payloads may be padded by one byte
}

/** Validates and stores one image. Returns its public URL. */
export async function saveImage(file: File, folder: UploadFolder, uploadedBy: string): Promise<string> {
  if (file.size === 0) throw new UploadError(400, "The file is empty.");
  if (file.size > MAX_STORED_BYTES) {
    throw new UploadError(413, "Image is still too large after resizing (max 4 MB). Please use a smaller photo.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) throw new UploadError(400, "That file is not a valid JPG, PNG or WebP image.");
  if (!looksComplete(type, bytes)) throw new UploadError(400, "The image file is damaged or incomplete. Please re-save it and retry.");

  const id = randomBytes(12).toString("hex");
  const { media } = await collections();
  await media.insertOne({
    _id: id,
    contentType: type,
    size: bytes.length,
    folder,
    data: new Binary(bytes),
    uploadedBy,
    createdAt: new Date(),
  });
  return `/media/${id}.${UPLOAD_TYPES[type]}`;
}

/** The stored image for a `/media/<id>.<ext>` file name, or null. */
export async function getImage(fileName: string): Promise<MediaDoc | null> {
  const match = MEDIA_PATH.exec(`/media/${fileName}`);
  if (!match) return null;
  const { media } = await collections();
  const doc = await media.findOne({ _id: match[1] });
  return doc && UPLOAD_TYPES[doc.contentType] === match[2] ? doc : null;
}

const mediaId = (url: string) => MEDIA_PATH.exec(url)?.[1] ?? null;

/** Media URLs still used by any product, the store settings (logo, QR, owner photo, categories) or any order. */
async function referencedMediaIds(): Promise<Set<string>> {
  const { products, orders, settings } = await collections();
  const [productDocs, orderDocs, settingsDoc] = await Promise.all([
    products
      .find({ $or: [{ images: { $regex: "^/media/" } }, { "variants.images": { $regex: "^/media/" } }] }, { projection: { images: 1, "variants.images": 1 } })
      .toArray(),
    orders.find({ "items.image": { $regex: "^/media/" } }, { projection: { "items.image": 1 } }).toArray(),
    settings.findOne({ _id: "store" }, { projection: { logo: 1, qrCode: 1, ownerImage: 1, "categories.image": 1 } }),
  ]);
  const urls = [
    ...productDocs.flatMap((p) => [...p.images, ...(p.variants ?? []).flatMap((v) => v.images ?? [])]),
    ...orderDocs.flatMap((o) => o.items.map((i) => i.image ?? "")),
    settingsDoc?.logo ?? "",
    settingsDoc?.qrCode ?? "",
    settingsDoc?.ownerImage ?? "",
    ...(settingsDoc?.categories ?? []).map((c) => c.image),
  ];
  return new Set(urls.map(mediaId).filter((id): id is string => id !== null));
}

/** Deletes uploaded images that nothing references any more (never touches site photos or other URLs). */
export async function deleteUnreferencedMedia(candidates: string[]): Promise<void> {
  const ids = [...new Set(candidates.map(mediaId).filter((id): id is string => id !== null))];
  if (ids.length === 0) return;
  const inUse = await referencedMediaIds();
  const unused = ids.filter((id) => !inUse.has(id));
  if (unused.length === 0) return;
  const { media } = await collections();
  await media.deleteMany({ _id: { $in: unused } });
}

const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
let lastCleanup = 0;

/**
 * Removes uploads that were never saved on anything (e.g. the admin uploaded, then left the form)
 * once they are a day old. Runs at most hourly per server instance, after an upload response.
 */
export async function cleanupOrphanedMedia(): Promise<void> {
  if (Date.now() - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = Date.now();
  const { media } = await collections();
  const old = await media
    .find({ createdAt: { $lt: new Date(Date.now() - ORPHAN_AGE_MS) } }, { projection: { _id: 1 } })
    .sort({ createdAt: 1 })
    .limit(200)
    .toArray();
  if (old.length === 0) return;
  const inUse = await referencedMediaIds();
  const orphans = old.map((d) => d._id).filter((id) => !inUse.has(id));
  if (orphans.length) await media.deleteMany({ _id: { $in: orphans } });
}
