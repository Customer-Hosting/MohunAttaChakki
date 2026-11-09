import { after } from "next/server";
import { requireAdmin } from "@/lib/firebase/admin";
import { cleanupOrphanedMedia, saveImage, UploadError } from "@/lib/media";
import { UPLOAD_FOLDERS, type UploadFolder } from "@/lib/upload-rules";

/*
 * POST multipart/form-data { file, folder? } → 201 { url: "/media/<id>.<ext>" }   (admin only)
 *
 * Images are stored in MongoDB (see lib/media.ts). The admin UI resizes photos in the browser
 * first (originals up to 16 MB → at most 2000 px, usually well under 1 MB), so the request stays
 * under Vercel's 4.5 MB function body limit; the server accepts at most 4 MB.
 */
export async function POST(request: Request) {
  let uid: string;
  try {
    const { user, error } = await requireAdmin(request);
    if (error) return error;
    uid = user.uid;
  } catch (err) {
    console.error("[upload] admin check failed", err);
    return Response.json({ error: "Could not check your admin access. Please retry." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "The upload was incomplete. Please retry." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Please choose an image to upload." }, { status: 400 });
  const folderValue = String(form.get("folder") ?? "products");
  const folder: UploadFolder = (UPLOAD_FOLDERS as readonly string[]).includes(folderValue) ? (folderValue as UploadFolder) : "products";

  try {
    const url = await saveImage(file, folder, uid);
    after(() => cleanupOrphanedMedia().catch((e) => console.error("[upload] orphan cleanup failed", e)));
    return Response.json({ url }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) return Response.json({ error: err.message }, { status: err.status });
    const quota = typeof err === "object" && err !== null && "code" in err && (err as { code?: number }).code === 8000;
    console.error("[upload] storing image failed", quota ? "(storage quota)" : "", err);
    return quota
      ? Response.json({ error: "Image storage is full. Delete unused products or images, then retry." }, { status: 507 })
      : Response.json({ error: "Could not save the image. Please retry." }, { status: 503 });
  }
}
