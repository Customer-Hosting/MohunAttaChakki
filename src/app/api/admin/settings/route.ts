import { handle, readJson, refreshSettings } from "@/lib/api";
import { getSettings, updateSettings } from "@/lib/data/settings";
import { requireAdmin } from "@/lib/firebase/admin";

export async function GET(request: Request) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  return handle(async () => Response.json({ settings: await getSettings() }));
}

/** PUT { ...fields } → saved settings. Categories are managed via /api/admin/categories. */
export async function PUT(request: Request) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  return handle(async () => {
    const settings = await updateSettings(await readJson(request));
    refreshSettings();
    return Response.json({ settings });
  });
}
