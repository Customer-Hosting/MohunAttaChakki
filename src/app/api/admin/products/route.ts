import { handle, readJson, refreshProducts } from "@/lib/api";
import { countProducts, createProduct, listProducts } from "@/lib/data/products";
import { requireAdmin } from "@/lib/firebase/admin";

/** GET ?q=&category=&page= → all products (active + inactive), newest first. */
export async function GET(request: Request) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  return handle(async () => {
    const url = new URL(request.url);
    const query = {
      includeInactive: true,
      search: url.searchParams.get("q") ?? undefined,
      category: url.searchParams.get("category") || undefined,
    };
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = 50;
    const [products, total] = await Promise.all([
      listProducts({ ...query, limit: pageSize, skip: (page - 1) * pageSize }),
      countProducts(query),
    ]);
    return Response.json({ products, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) });
  });
}

/** POST → create a product. */
export async function POST(request: Request) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  return handle(async () => {
    const product = await createProduct(await readJson(request));
    refreshProducts();
    return Response.json({ product }, { status: 201 });
  });
}
