import { type Category, type Product } from "@/lib/products";

// Product query helpers for the UI layer and any backend filtering logic.
export function getFeaturedProducts(products: Product[], limit = 8) {
  return products.filter((p) => p.isFeatured).slice(0, limit);
}

export function getNewArrivals(products: Product[], limit = 8) {
  return products.filter((p) => p.isNew).slice(0, limit);
}

// Build category statistics used by the home page or dashboard.
export function getCategoryStats(categories: Category[], products: Product[]) {
  return categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    count: products.filter((product) => product.category === category.slug).length,
  }));
}

// Apply category and search filters to the product list.
export function filterProducts(products: Product[], category?: string, q?: string) {
  return products.filter((product) => {
    if (category && product.category !== category) return false;
    if (q && !product.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
}

// Find related products for a given product detail view.
export function getRelatedProducts(products: Product[], category: string, excludedId: string, limit = 4) {
  return products.filter((product) => product.category === category && product.id !== excludedId).slice(0, limit);
}
