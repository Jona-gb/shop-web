import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Dumbbell,
  Gem,
  Headphones,
  Home,
  Laptop,
  LucideIcon,
  Package,
  Shirt,
  Sparkles,
  Smartphone,
  Speaker,
  Tablet,
  Tv,
  Watch,
  Zap,
} from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { useApiHomeProducts, type Product } from "@/lib/products";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuickShop - Shop everyday products" },
      { name: "description", content: "Browse categories, featured products, and new arrivals." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: homeData = { featured: [], newArrivals: [], categoryStats: [] } } = useApiHomeProducts();
  const products = uniqueProducts([...homeData.featured, ...homeData.newArrivals]).slice(0, 8);
  const heroProduct = products[0];
  const categories = homeData.categoryStats.slice(0, 6);

  return (
    <div className="bg-background text-foreground">
      <section className="border-b border-border bg-[#f8fafc]">
        <div className="shop-container grid gap-8 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-16">
          <div>
            <p className="section-kicker">QuickShop</p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
              Simple shopping for everyday products.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              Browse categories, check what is in stock, and open quick view from any product card.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/products"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-blue-600"
              >
                Shop products
                <ArrowRight className="h-4 w-4" />
              </Link>
              {categories[0] && (
                <Link
                  to="/products"
                  search={{ category: categories[0].slug }}
                  className="inline-flex h-12 items-center rounded-full border border-border bg-white px-6 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
                >
                  Browse categories
                </Link>
              )}
            </div>
          </div>

          <Link
            to={heroProduct ? "/products/$id" : "/products"}
            params={heroProduct ? { id: heroProduct.id } : undefined}
            className="group relative grid min-h-[340px] place-items-center overflow-hidden rounded-[28px] border border-border bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
          >
            {heroProduct ? (
              <>
                <img
                  src={heroProduct.image}
                  alt={heroProduct.name}
                  className="h-full max-h-[320px] w-full object-contain transition duration-500 group-hover:scale-105"
                />
                <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-slate-950 px-4 py-3 text-white">
                  <p className="truncate text-sm font-semibold">{heroProduct.name}</p>
                  <p className="mt-1 text-xs text-white/70">
                    {heroProduct.stock > 0 ? `${heroProduct.stock} in stock` : "Out of stock"}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center">
                <Package className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold">Products will appear here</p>
              </div>
            )}
          </Link>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="shop-container py-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="section-kicker">Categories</p>
              <h2 className="section-heading mt-2">Shop by category</h2>
            </div>
            <Link to="/products" className="hidden items-center gap-2 text-sm font-semibold text-primary sm:inline-flex">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => {
              const Icon = getCategoryIcon(category.slug, category.name);
              return (
                <Link
                  key={category.slug}
                  to="/products"
                  search={{ category: category.slug }}
                  className="group rounded-2xl border border-border bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 truncate text-sm font-semibold">{category.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{category.count} products</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="border-y border-border bg-white py-12">
        <div className="shop-container">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="section-kicker">Shop products</p>
              <h2 className="section-heading mt-2">Featured products</h2>
            </div>
            <Link to="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Shop all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-background px-5 py-12 text-center">
              <p className="font-display text-xl font-semibold">No products yet</p>
              <p className="mt-2 text-sm text-muted-foreground">Add products from the admin dashboard.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function uniqueProducts(products: Product[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

function getCategoryIcon(slug: string, name: string): LucideIcon {
  const label = `${slug} ${name}`.toLowerCase();

  if (label.includes("tv")) return Tv;
  if (label.includes("speaker")) return Speaker;
  if (label.includes("tablet")) return Tablet;
  if (label.includes("airpod") || label.includes("headphone") || label.includes("audio")) return Headphones;
  if (label.includes("watch")) return Watch;
  if (label.includes("phone") || label.includes("mobile")) return Smartphone;
  if (label.includes("laptop") || label.includes("computer")) return Laptop;
  if (label.includes("bluetooth") || label.includes("electronics") || label.includes("gadget")) return Zap;
  if (label.includes("fashion") || label.includes("shirt") || label.includes("clothing")) return Shirt;
  if (label.includes("home") || label.includes("living")) return Home;
  if (label.includes("beauty") || label.includes("skin")) return Sparkles;
  if (label.includes("sport") || label.includes("fitness")) return Dumbbell;
  if (label.includes("book")) return BookOpen;
  if (label.includes("jewel") || label.includes("accessor")) return Gem;

  return Package;
}
