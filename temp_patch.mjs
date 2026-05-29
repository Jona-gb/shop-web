import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const replacements = [
  {
    path: 'src/lib/api.ts',
    old: `import {
  getCategories,
  getProducts,
  getProductById,
  createOrder,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  resetStore,
  getOrders,
  getCartItems,
  setCartItems,
  clearCartItems,
} from "@/lib/db";\n`,
    new: `import {
  getCategories,
  getProducts,
  getProductById,
  getProductsByIds,
  getHomePageProducts,
  createOrder,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  resetStore,
  getOrders,
  getCartItems,
  setCartItems,
  clearCartItems,
} from "@/lib/db";\n`,
  },
  {
    path: 'src/lib/api.ts',
    old: `  if (path === "/api/products" && request.method === "GET") {
    return json(await getProducts(url.searchParams.get("category") ?? undefined, url.searchParams.get("q") ?? undefined));
  }

  if (path === "/api/products/related" && request.method === "GET") {
`,
    new: `  if (path === "/api/products" && request.method === "GET") {
    const limitValue = url.searchParams.get("limit");
    return json(await getProducts(
      url.searchParams.get("category") ?? undefined,
      url.searchParams.get("q") ?? undefined,
      limitValue ? Number(limitValue) : undefined,
    ));
  }

  if (path === "/api/products/home" && request.method === "GET") {
    return json(await getHomePageProducts());
  }

  if (path === "/api/products/ids" && request.method === "GET") {
    const ids = url.searchParams.getAll("id");
    return json(await getProductsByIds(ids));
  }

  if (path === "/api/products/related" && request.method === "GET") {
`,
  },
  {
    path: 'src/routes/index.tsx',
    old: `import { CategoryCarousel, Category } from "@/components/CategoryCarousel";
import { FeaturedSection, PromotionalBanner } from "@/components/FeaturedSection";
import { HeroSection } from "@/components/HeroSection";
import { ProductCard } from "@/components/ProductCard";
import { TrendingProducts } from "@/components/TrendingProducts";
import { useApiCategories, useApiProducts } from "@/lib/products";
import { getCategoryStats, getFeaturedProducts, getNewArrivals } from "@/lib/controllers/productController";
`,
    new: `import { CategoryCarousel, Category } from "@/components/CategoryCarousel";
import { FeaturedSection, PromotionalBanner } from "@/components/FeaturedSection";
import { HeroSection } from "@/components/HeroSection";
import { ProductCard } from "@/components/ProductCard";
import { TrendingProducts } from "@/components/TrendingProducts";
import { useApiHomeProducts } from "@/lib/products";
`,
  },
  {
    path: 'src/routes/index.tsx',
    old: `function HomePage() {
  const { data: products = [] } = useApiProducts();
  const { data: categories = [] } = useApiCategories();
  const featured = getFeaturedProducts(products);
  const newArrivals = getNewArrivals(products);
  const categoryItems: Category[] = getCategoryStats(categories, products).map((category) => ({
    slug: category.slug,
    name: category.name,
    icon: getCategoryIcon(category.slug, category.name),
    count: category.count,
  }));
`,
    new: `function HomePage() {
  const { data: homeData = { featured: [], newArrivals: [], categoryStats: [] } } = useApiHomeProducts();
  const featured = homeData.featured;
  const newArrivals = homeData.newArrivals;
  const categoryItems: Category[] = homeData.categoryStats.map((category) => ({
    slug: category.slug,
    name: category.name,
    icon: getCategoryIcon(category.slug, category.name),
    count: category.count,
  }));
`,
  },
  {
    path: 'src/lib/cart.tsx',
    old: `import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useApiProducts } from "./products";
import {
  type CartDetail,
  type CartItem,
  buildDetailedCart,
  calculateCartCount,
  calculateCartSubtotal,

} from "./controllers/cartController";
`,
    new: `import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useApiProductsByIds } from "./products";
import {
  type CartDetail,
  type CartItem,
  buildDetailedCart,
  calculateCartCount,
  calculateCartSubtotal,

} from "./controllers/cartController";
`,
  },
  {
    path: 'src/lib/cart.tsx',
    old: `export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { data: products = [] } = useApiProducts();

  useEffect(() => {
`,
    new: `export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const productIds = items.map((item) => item.productId);
  const { data: products = [] } = useApiProductsByIds(productIds);

  useEffect(() => {
`,
  },
];

for (const entry of replacements) {
  const filePath = resolve(entry.path);
  let text = readFileSync(filePath, 'utf8');
  if (!text.includes(entry.old)) {
    throw new Error(`Old text not found in ${entry.path}: ${entry.old}`);
  }
  text = text.replace(entry.old, entry.new);
  writeFileSync(filePath, text, 'utf8');
}
console.log('patched');
