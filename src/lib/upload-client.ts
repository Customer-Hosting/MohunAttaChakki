"use client";

import {
  MAX_IMAGE_EDGE,
  MAX_STORED_BYTES,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  UPLOAD_TYPES,
  isUploadType,
  type UploadFolder,
  type UploadType,
} from "./upload-rules";

/** An upload failure with a message for the admin; `retry` is false when retrying cannot help. */
export class UploadFailure extends Error {
  constructor(
    message: string,
    readonly retry: boolean,
  ) {
    super(message);
  }
}

const EXT_TYPES: Record<string, UploadType> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Browser-side checks of the ORIGINAL file (the server checks the uploaded bytes again). */
export function checkImageFile(file: File): UploadType {
  const type = isUploadType(file.type) ? file.type : EXT_TYPES[file.name.split(".").pop()?.toLowerCase() ?? ""];
  if (!type) throw new UploadFailure(`${file.name}: only JPG, PNG or WebP images are allowed.`, false);
  if (file.size === 0) throw new UploadFailure(`${file.name}: the file is empty.`, false);
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadFailure(`${file.name} is too large (max ${MAX_UPLOAD_LABEL}).`, false);
  return type;
}

const SMALL_ENOUGH = 1.5 * 1024 * 1024;

function encode(canvas: HTMLCanvasElement, type: UploadType, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Resizes photos to at most MAX_IMAGE_EDGE px and re-encodes them (WebP, which keeps
 * transparency) so the upload is at most MAX_STORED_BYTES. Small images are sent unchanged.
 */
async function prepareForUpload(file: File, type: UploadType): Promise<{ file: Blob; type: UploadType }> {
  const bitmap =
    typeof createImageBitmap === "function" ? await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null) : null;
  if (!bitmap) {
    // Can't decode here; let the server validate it if it is small enough to send.
    if (file.size <= MAX_STORED_BYTES) return { file, type };
    throw new UploadFailure(`${file.name} could not be processed. Please save it as a smaller JPG and retry.`, false);
  }
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= MAX_IMAGE_EDGE && file.size <= SMALL_ENOUGH) return { file, type };

    for (const [edge, quality] of [
      [MAX_IMAGE_EDGE, 0.85],
      [MAX_IMAGE_EDGE, 0.72],
      [1600, 0.72],
      [1200, 0.7],
    ] as const) {
      const scale = Math.min(1, edge / longest);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      let out = await encode(canvas, "image/webp", quality);
      let outType: UploadType = "image/webp";
      if (!out || out.type !== "image/webp") {
        // Browser can't encode WebP: JPEG for photos, PNG where transparency may matter.
        outType = type === "image/jpeg" ? "image/jpeg" : "image/png";
        out = await encode(canvas, outType, quality);
      }
      if (!out) break;
      if (out.size <= MAX_STORED_BYTES) {
        // Not resized and not smaller: keep the original bytes.
        return scale === 1 && out.size >= file.size && file.size <= MAX_STORED_BYTES ? { file, type } : { file: out, type: outType };
      }
    }
  } finally {
    bitmap.close();
  }
  if (file.size <= MAX_STORED_BYTES) return { file, type };
  throw new UploadFailure(`${file.name} is too detailed to shrink below 4 MB. Please use a smaller photo.`, false);
}

/** POST with upload progress (fetch() can't report upload progress). */
function send(
  form: FormData,
  token: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<{ status: number; body: { url?: string; error?: string } }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => resolve({ status: xhr.status, body: (xhr.response as { url?: string; error?: string } | null) ?? {} });
    xhr.onerror = () => reject(new UploadFailure("Network error. Check your connection and retry.", true));
    xhr.ontimeout = () => reject(new UploadFailure("The upload timed out. Please retry.", true));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.timeout = 120_000;
    xhr.send(form);
  });
}

/**
 * Uploads one image: check → resize/compress in the browser → POST /api/admin/upload (admin only,
 * stored in MongoDB). Returns the image URL ("/media/<id>.<ext>").
 */
export async function uploadImage(
  original: File,
  folder: UploadFolder,
  getToken: () => Promise<string | null>,
  { onProgress, signal }: { onProgress?: (percent: number) => void; signal?: AbortSignal } = {},
): Promise<string> {
  const { file, type } = await prepareForUpload(original, checkImageFile(original));
  signal?.throwIfAborted(); // cancelled while resizing
  const token = await getToken();
  if (!token) throw new UploadFailure("Your session has expired. Please log in again.", false);
  signal?.throwIfAborted();

  const form = new FormData();
  form.append("file", file, `image.${UPLOAD_TYPES[type]}`);
  form.append("folder", folder);
  const { status, body } = await send(form, token, onProgress, signal);
  if (status >= 200 && status < 300 && body.url) return body.url;

  // Validation errors won't change on retry; auth, rate-limit and server errors might.
  const retry = status === 0 || status === 401 || status === 408 || status === 429 || status >= 500;
  const fallback = status === 413 ? "Image is too large to upload." : "Upload failed.";
  throw new UploadFailure(body.error || fallback, retry);
}
