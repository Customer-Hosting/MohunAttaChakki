import { handle, readJson, refreshProducts, refreshSettings } from "@/lib/api";
import {
  createCategory,
  createSubcategory,
  deleteCategory,
  deleteSubcategory,
  getCategories,
  getCategoryUsage,
  updateCategory,
  updateSubcategory,
} from "@/lib/data/categories";
import { requireAdmin } from "@/lib/firebase/admin";

/** GET → { categories, usage } (usage = product counts, used to warn before deleting). */
export async function GET(request: Request) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  return handle(async () => {
    const [categories, usage] = await Promise.all([getCategories(), getCategoryUsage()]);
    return Response.json({ categories, usage });
  });
}

/**
 * POST { action, ... } → { categories, usage }
 *   createCategory { name, image? } · updateCategory { id, name?, image? } · deleteCategory { id }
 *   createSubcategory { categoryId, name } · updateSubcategory { categoryId, id, name } · deleteSubcategory { categoryId, id }
 * Deleting something that products still use is refused with an explanation (400).
 */
export async function POST(request: Request) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  return handle(async () => {
    const body = await readJson(request);
    const id = String(body.id ?? "");
    const categoryId = String(body.categoryId ?? "");
    switch (body.action) {
      case "createCategory":
        await createCategory({ name: body.name, image: body.image });
        break;
      case "updateCategory":
        await updateCategory(id, { name: body.name, image: body.image });
        break;
      case "deleteCategory":
        await deleteCategory(id);
        break;
      case "createSubcategory":
        await createSubcategory(categoryId, { name: body.name });
        break;
      case "updateSubcategory":
        await updateSubcategory(categoryId, id, { name: body.name });
        break;
      case "deleteSubcategory":
        await deleteSubcategory(categoryId, id);
        break;
      default:
        return Response.json({ error: "Unknown action." }, { status: 400 });
    }
    // Renames move products to the new slug, so both caches are refreshed.
    refreshSettings();
    refreshProducts();
    const [categories, usage] = await Promise.all([getCategories(), getCategoryUsage()]);
    return Response.json({ categories, usage });
  });
}
