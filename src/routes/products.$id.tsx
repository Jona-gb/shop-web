import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Minus, Plus, ArrowLeft, Truck, RotateCcw, ShieldCheck } from "lucide-react";
import { useApiProduct, useApiRelatedProducts, categoryName, type Product } from "@/lib/products";
import { formatPrice, useCart } from "@/lib/cart";
import { ProductCard } from "@/components/ProductCard";
import { getInventoryLabel, getInventoryStatus, getInventoryTextClass } from "@/lib/inventory";

export const Route = createFileRoute("/products/$id")({
  loader: async ({ params }) => {
    if (import.meta.env.SSR) {
      const { getProductById } = await import("@/lib/db");
      const product = await getProductById(params.id);
      if (!product) throw notFound();
      return product;
    }
    const response = await fetch("/api/products/" + encodeURIComponent(params.id));
    if (response.status === 404) throw notFound();
    if (!response.ok) throw new Error("Failed to load product");
    return (await response.json()) as Product;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — ShopEase` },
          { name: "description", content: loaderData.description },
          { property: "og:title", content: loaderData.name },
          { property: "og:description", content: loaderData.description },
          { property: "og:image", content: loaderData.image },
          { name: "twitter:image", content: loaderData.image },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-32 text-center">
      <h1 className="font-display text-3xl font-bold">Product not found</h1>
      <Link
        to="/products"
        className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
      >
        Back to shop →
      </Link>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const loaderProduct = Route.useLoaderData() as Product;
  const { data: queriedProduct } = useApiProduct(loaderProduct.id, loaderProduct);
  const product = queriedProduct ?? loaderProduct;
  const { data: relatedProducts = [] } = useApiRelatedProducts(product.category, product.id, 4);
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const inStock = product.stock > 0;
  const inventoryStatus = getInventoryStatus(product.stock);

  const related = relatedProducts;

  const [history, setHistory] = useState(
    [] as Array<{
      id?: number;
      oldStock: number;
      newStock: number;
      note?: string;
      createdAt?: string;
    }>,
  );
  const [imageOpen, setImageOpen] = useState(false);

  useEffect(() => {
    setQty((current) => Math.max(1, Math.min(product.stock || 1, current)));
  }, [product.stock]);

  useEffect(() => {
    let mounted = true;
    import("@/lib/apiClient").then(({ getProductInventoryHistory }) => {
      getProductInventoryHistory(product.id, 20)
        .then((res) => {
          if (!mounted) return;
          setHistory(Array.isArray(res) ? res : []);
        })
        .catch(() => {});
    });
    return () => {
      mounted = false;
    };
  }, [product.id]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        to="/products"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to shop
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div
          className="overflow-hidden rounded-2xl bg-muted cursor-zoom-in"
          onClick={() => setImageOpen(true)}
        >
          <img
            src={product.image}
            alt={product.name}
            className="aspect-square w-full object-cover"
          />
        </div>

        <div className="lg:py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {categoryName(product.category)}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
            {product.name}
          </h1>
          <p className="mt-4 text-2xl font-bold text-foreground">{formatPrice(product.price)}</p>

          <p className="mt-6 leading-relaxed text-muted-foreground">{product.description}</p>
          <p className={`mt-4 text-sm font-medium ${getInventoryTextClass(inventoryStatus)}`}>
            {getInventoryLabel(product.stock, true)}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border border-border bg-card">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={!inStock}
                className="px-3 py-2.5 text-foreground/70 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Decrease"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-semibold">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                disabled={qty >= product.stock || !inStock}
                className="px-3 py-2.5 text-foreground/70 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Increase"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => {
                add(product.id, qty, product.stock);
                setAdded(true);
                setTimeout(() => setAdded(false), 1800);
              }}
              disabled={!inStock}
              className="flex-1 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 sm:flex-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {added ? "Added to cart" : inStock ? "Add to cart" : "Out of stock"}
            </button>
          </div>

          <div className="mt-10 space-y-3 border-t border-border pt-6 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> Free shipping on orders over $50
            </p>
            <p className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" /> 30-day easy returns
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Secure checkout
            </p>
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold tracking-tight">Inventory history</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card p-3 text-sm">
          {history.length === 0 ? (
            <p className="text-muted-foreground">No recent stock changes</p>
          ) : (
            <table className="w-full table-auto text-left text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="px-2 py-2">When</th>
                  <th className="px-2 py-2">Old</th>
                  <th className="px-2 py-2">New</th>
                  <th className="px-2 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr
                    key={h.id ?? `${h.createdAt}-${h.newStock}`}
                    className="border-t border-border"
                  >
                    <td className="px-2 py-2">
                      {h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}
                    </td>
                    <td className="px-2 py-2">{h.oldStock}</td>
                    <td className="px-2 py-2">{h.newStock}</td>
                    <td className="px-2 py-2 text-muted-foreground">{h.note ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl font-bold tracking-tight">You may also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {imageOpen && (
        <div
          onClick={() => setImageOpen(false)}
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6"
        >
          <div className="max-h-[90vh] max-w-[90vw] overflow-auto rounded-lg bg-white p-4">
            <img
              src={product.image}
              alt={product.name}
              className="max-h-[80vh] w-auto object-contain"
            />
            <div className="mt-4">
              <h3 className="font-semibold">{product.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{product.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
