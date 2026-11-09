// Image upload rules shared by the admin UI (browser) and the upload API (server).

/** Largest ORIGINAL photo an admin may pick. It is resized in the browser before upload. */
export const MAX_UPLOAD_BYTES = 16 * 1024 * 1024; // 16 MiB
export const MAX_UPLOAD_LABEL = "16 MB";

/**
 * Largest file the server stores (after browser resizing). Stays under Vercel's 4.5 MB
 * function request-body limit, and far under MongoDB's 16 MB document limit.
 */
export const MAX_STORED_BYTES = 4 * 1024 * 1024; // 4 MiB

/** Longest edge stored for storefront use; larger photos are resized in the browser before upload. */
export const MAX_IMAGE_EDGE = 2000;

export const UPLOAD_FOLDERS = ["products", "settings", "categories"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export const UPLOAD_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export type UploadType = keyof typeof UPLOAD_TYPES;

export function isUploadType(type: string): type is UploadType {
  return Object.hasOwn(UPLOAD_TYPES, type);
}

/** Public URL of an uploaded image: `/media/<24 hex>.<ext>`. */
export const MEDIA_PATH = /^\/media\/([a-f0-9]{24})\.(jpg|png|webp)$/;
