import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ProductView from "@/components/product/ProductView";
import { getProductForPage, getStoreSettings } from "@/lib/catalog";
import { content } from "@/content/en";
import { shopHref } from "@/components/shop/shop-url";
import { formatPrice } from "@/lib/format";
import { openGraph } from "@/lib/seo";
import { assetUrl, findCategory } from "@/lib/site";
import { displayImages } from "@/lib/variants";

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductForPage(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description.slice(0, 160) || `Buy ${product.name} at Mohan Atta Chakki, Burdwan. Pure, fresh and healthy.`,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: openGraph({
      title: `${product.name} | Mohan Atta Chakki`,
      url: `/shop/${product.slug}`,
      images: displayImages(product)[0] ? [assetUrl(displayImages(product)[0])] : undefined,
    }),
  };
}

// Visitors can browse without logging in; login is only asked for wishlist / purchase.
export default function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetails params={params} />
      </Suspense>
    </section>
  );
}

async function ProductDetails({ params }: { params: PageProps<"/shop/[slug]">["params"] }) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProductForPage(slug), getStoreSettings()]);
  if (!product) notFound(); // missing or inactive products are not public

  const categoryInfo = findCategory(settings.categories, product.category);
  const category = categoryInfo?.name ?? product.category;
  const sub = product.subcategory ? categoryInfo?.subcategories.find((s) => s.slug === product.subcategory) : undefined;
  const subName = sub?.name ?? product.subcategory ?? null;
  const categoryHref = shopHref({ category: product.category });
  const subHref = product.subcategory ? shopHref({ category: product.category, subcategory: product.subcategory }) : null;

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-ink/60">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/shop" className="hover:text-accent">
              Shop
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={categoryHref} className="hover:text-accent">
              {category}
            </Link>
          </li>
          {subName && subHref && (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={subHref} className="hover:text-accent">
                  {subName}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true">/</li>
          <li className="truncate text-ink" aria-current="page">
            {product.name}
          </li>
        </ol>
      </nav>

      <ProductView
        product={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          images: product.images,
          price: product.price,
          salePrice: product.salePrice,
          sizes: product.sizes,
          stock: product.stock,
          variants: product.variants,
        }}
        heading={
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              {category}
              {subName ? ` · ${subName}` : ""}
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold leading-tight sm:text-4xl">{product.name}</h1>
          </>
        }
      >
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-black/10 pt-6 text-sm" data-testid="product-taxonomy">
            <dt className="text-ink/60">Category</dt>
            <dd>
              <Link href={categoryHref} className="font-medium underline hover:text-accent">
                {category}
              </Link>
            </dd>
            {subName && subHref && (
              <>
                <dt className="text-ink/60">Subcategory</dt>
                <dd>
                  <Link href={subHref} className="font-medium underline hover:text-accent">
                    {subName}
                  </Link>
                </dd>
              </>
            )}
          </dl>

          {product.description && (
            <div className="mt-8 border-t border-black/10 pt-6">
              <h2 className="font-display text-lg font-semibold">Description</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-ink/80">{product.description}</p>
            </div>
          )}

          <ul className="mt-8 space-y-1.5 rounded-2xl bg-neutral-50 p-4 text-sm text-ink/80" aria-label="Delivery and policies">
            <li><span aria-hidden="true">🚚</span> {content.policies.delivery} Estimated delivery: {settings.deliveryEstimate}.</li>
            <li><span aria-hidden="true">📦</span> Shipping: {formatPrice(settings.shippingCharge)} per order.</li>
            <li><span aria-hidden="true">🔁</span> {settings.exchangePolicy}</li>
            <li><span aria-hidden="true">✖</span> {settings.refundPolicy} {content.policies.cod}</li>
          </ul>
      </ProductView>
    </>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12" aria-hidden="true">
      <div className="aspect-[4/5] rounded-2xl bg-neutral-100" />
      <div className="space-y-4">
        <div className="h-4 w-24 rounded bg-neutral-100" />
        <div className="h-9 w-2/3 rounded bg-neutral-200" />
        <div className="h-7 w-28 rounded bg-neutral-100" />
        <div className="h-12 rounded bg-neutral-100" />
        <div className="h-12 rounded-full bg-neutral-100" />
      </div>
    </div>
  );
}
