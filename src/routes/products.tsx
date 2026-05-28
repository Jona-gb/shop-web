import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useCategories, useProducts, categoryName } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";

type SearchParams = { category?: string; q?: string };

export const Route = createFileRoute("/products")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    category: typeof s.category === "string" ? s.category : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop all products — ShopEase" },
      { name: "description", content: "Browse all products across every category." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { category, q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const products = useProducts();
  const categories = useCategories();
  const [query, setQuery] = useState(q ?? "");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (category && p.category !== category) return false;
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [category, q, products]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ search: { category, q: query || undefined } });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Shop</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">
            {category ? categoryName(category, categories) : "All products"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} products</p>
        </div>

        <form onSubmit={submitSearch} className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </form>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <FilterPill label="All" active={!category} to={{ q }} />
        {categories.map((c) => (
          <FilterPill
            key={c.slug}
            label={c.name}
            active={category === c.slug}
            to={{ category: c.slug, q }}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-24 text-center">
          <p className="font-display text-xl font-semibold">No products found</p>
          <p className="mt-2 text-sm text-muted-foreground">Try a different search or category.</p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

function FilterPill({ label, active, to }: { label: string; active: boolean; to: SearchParams }) {
  return (
    <Link
      to="/products"
      search={to}
      className={
        "rounded-full border px-4 py-1.5 text-xs font-medium transition " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground/80 hover:border-primary hover:text-primary")
      }
    >
      {label}
    </Link>
  );
}
