import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

export type Product = {
  id: string;
  name: string;
  category: string; // category slug
  price: number;
  stock: number;
  image: string;
  description: string;
  isNew?: boolean;
  isFeatured?: boolean;
};

export type Category = {
  slug: string;
  name: string;
};

export type OrderRecord = {
  id: number;
  orderNumber: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  payment: string;
  subtotal: number;
  shipping: number;
  total: number;
  createdAt: string;
};

export const seedCategories: Category[] = [
  { slug: "electronics", name: "Electronics" },
  { slug: "fashion", name: "Fashion" },
  { slug: "home", name: "Home & Living" },
  { slug: "beauty", name: "Beauty" },
  { slug: "sports", name: "Sports & Outdoors" },
  { slug: "books", name: "Books" },
];

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

export const seedProducts: Product[] = [
  { id: "p1", name: "Wireless Headphones", category: "electronics", price: 129, stock: 12, image: img("photo-1505740420928-5e560c06d30e"), description: "Over-ear Bluetooth headphones with active noise cancellation and 30-hour battery life.", isFeatured: true, isNew: true },
  { id: "p2", name: "Smart Watch Series 5", category: "electronics", price: 249, stock: 8, image: img("photo-1546868871-7041f2a55e12"), description: "Fitness tracking, heart-rate monitoring, and notifications on a crisp AMOLED display.", isFeatured: true },
  { id: "p3", name: "Classic Cotton Tee", category: "fashion", price: 28, stock: 24, image: img("photo-1521572163474-6864f9cf17ab"), description: "Soft 100% organic cotton t-shirt with a relaxed everyday fit.", isNew: true },
  { id: "p4", name: "Canvas Sneakers", category: "fashion", price: 65, stock: 14, image: img("photo-1542291026-7eec264c27ff"), description: "Lightweight low-top sneakers with cushioned insole and rubber sole.", isFeatured: true },
  { id: "p5", name: "Ceramic Mug Set", category: "home", price: 32, stock: 20, image: img("photo-1514228742587-6b1558fcca3d"), description: "Set of four handcrafted stoneware mugs, microwave and dishwasher safe." },
  { id: "p6", name: "Linen Throw Pillow", category: "home", price: 45, stock: 10, image: img("photo-1592078615290-033ee584e267"), description: "Stonewashed linen pillow cover with hidden zip. Insert included.", isNew: true },
  { id: "p7", name: "Hydrating Face Serum", category: "beauty", price: 38, stock: 16, image: img("photo-1620916566398-39f1143ab7be"), description: "Lightweight hyaluronic acid serum for a plump, dewy glow.", isFeatured: true },
  { id: "p8", name: "Yoga Mat Pro", category: "sports", price: 58, stock: 7, image: img("photo-1599447421416-3414500d18a5"), description: "6mm non-slip TPE mat with carrying strap. Perfect for yoga, pilates and stretching." },
  { id: "p9", name: "Stainless Water Bottle", category: "sports", price: 24, stock: 30, image: img("photo-1602143407151-7111542de6e8"), description: "Double-walled insulated bottle keeps drinks cold for 24h, hot for 12h." },
  { id: "p10", name: "The Modern Reader", category: "books", price: 18, stock: 18, image: img("photo-1544947950-fa07a98d237f"), description: "A curated anthology of contemporary short fiction.", isNew: true },
  { id: "p11", name: "Minimalist Backpack", category: "fashion", price: 89, stock: 11, image: img("photo-1553062407-98eeb64c6a62"), description: "Water-resistant 20L backpack with padded laptop sleeve.", isFeatured: true },
  { id: "p12", name: "Aroma Diffuser", category: "home", price: 54, stock: 13, image: img("photo-1602928298849-325cec8771c0"), description: "Ultrasonic essential oil diffuser with ambient LED lighting." },
];

export function categoryName(slug: string, list?: Category[]): string {
  const cats = list ?? seedCategories;
  return cats.find((c) => c.slug === slug)?.name ?? slug;
}

export function newId(prefix = "p") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function fetchApi<T>(path: string): Promise<T> {
  if (import.meta.env.SSR) { throw new Error("API fetch is only available in the browser"); }

  return fetch(path).then((res) => {
    if (!res.ok) {
      throw new Error(`API request failed: ${res.status}`);
    }
    return res.json() as Promise<T>;
  });
}

export async function fetchCategories(): Promise<Category[]> {
  if (import.meta.env.SSR) {
    const { getCategories } = await import("@/lib/db");
    return getCategories();
  }
  return fetchApi<Category[]>('/api/categories');
}

export type HomePageData = {
  featured: Product[];
  newArrivals: Product[];
  categoryStats: Array<{ slug: string; name: string; count: number }>;
};

export type AdminDashboardData = {
  products: Product[];
  categories: Category[];
  orders: OrderRecord[];
};

export async function fetchProducts(category?: string, q?: string, limit?: number): Promise<Product[]> {
  if (import.meta.env.SSR) {
    const { getProducts } = await import("@/lib/db");
    return getProducts(category, q, limit);
  }

  const url = new URL('/api/products', window.location.href);
  if (category) url.searchParams.set('category', category);
  if (q) url.searchParams.set('q', q);
  if (limit) url.searchParams.set('limit', String(limit));
  return fetchApi<Product[]>(url.toString());
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  if (import.meta.env.SSR) {
    const { getProductsByIds } = await import("@/lib/db");
    return getProductsByIds(ids);
  }

  const url = new URL('/api/products/ids', window.location.href);
  ids.forEach((id) => url.searchParams.append('id', id));
  return fetchApi<Product[]>(url.toString());
}

export async function fetchHomeProducts(): Promise<HomePageData> {
  if (import.meta.env.SSR) {
    const { getHomePageProducts } = await import("@/lib/db");
    return getHomePageProducts();
  }
  return fetchApi<HomePageData>("/api/products/home");
}

export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  if (import.meta.env.SSR) {
    const { getProducts, getCategories, getOrders } = await import("@/lib/db");
    const [products, categories, orders] = await Promise.all([
      getProducts(),
      getCategories(),
      getOrders(),
    ]);
    return { products, categories, orders };
  }

  return fetchApi<AdminDashboardData>("/api/admin/dashboard");
}

export async function fetchProduct(id: string): Promise<Product | null> {
  if (import.meta.env.SSR) {
    const { getProductById } = await import("@/lib/db");
    return (await getProductById(id)) ?? null;
  }

  return fetch(`/api/products/${encodeURIComponent(id)}`).then(async (res) => {
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Unable to load product ${id}`);
    return (await res.json()) as Product;
  });
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (import.meta.env.SSR) { throw new Error("API request is only available in the browser"); }

  const res = await fetch(path, init);
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    if (isJson) {
      try {
        const body = JSON.parse(text) as { error?: string };
        throw new Error((body.error ?? text) || `API request failed: ${res.status}`);
      } catch {
        throw new Error(text || `API request failed: ${res.status}`);
      }
    }
    throw new Error(text || `API request failed: ${res.status}`);
  }

  return isJson ? (JSON.parse(text) as T) : (text as unknown as T);
}

export function fetchCreateCategory(name: string): Promise<Category> {
  return apiRequest<Category>("/api/admin/categories", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function fetchUpdateCategory(slug: string, name: string): Promise<Category> {
  return apiRequest<Category>(`/api/admin/categories/${encodeURIComponent(slug)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function fetchDeleteCategory(slug: string): Promise<{ success: true }> {
  return apiRequest<{ success: true }>(`/api/admin/categories/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
}

export function fetchCreateProduct(product: Product): Promise<Product> {
  return apiRequest<Product>("/api/admin/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(product),
  });
}

export function fetchUploadProductImage(file: File): Promise<{ url: string }> {
  const body = new FormData();
  body.append("image", file);
  return apiRequest<{ url: string }>("/api/admin/product-images", {
    method: "POST",
    body,
  });
}

export async function fetchRelatedProducts(category: string, excludeId: string, limit = 4): Promise<Product[]> {
  if (import.meta.env.SSR) {
    const { getRelatedProducts } = await import("@/lib/db");
    return getRelatedProducts(category, excludeId, limit);
  }

  const url = new URL("/api/products/related", window.location.href);
  url.searchParams.set("category", category);
  url.searchParams.set("excludeId", excludeId);
  url.searchParams.set("limit", String(limit));
  return fetchApi<Product[]>(url.toString());
}

export async function fetchOrders(): Promise<OrderRecord[]> {
  if (import.meta.env.SSR) {
    const { getOrders } = await import("@/lib/db");
    return getOrders();
  }

  return fetchApi<OrderRecord[]>("/api/admin/orders");
}

export function fetchUpdateProduct(product: Product): Promise<Product> {
  return apiRequest<Product>(`/api/admin/products/${encodeURIComponent(product.id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(product),
  });
}

export function fetchDeleteProduct(id: string): Promise<{ success: true }> {
  return apiRequest<{ success: true }>(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function fetchResetStore(): Promise<{ success: true }> {
  return apiRequest<{ success: true }>("/api/admin/reset", {
    method: "POST",
  });
}

export function useApiOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    staleTime: 1000 * 60 * 2,
    placeholderData: [] as OrderRecord[],
    enabled: true,
  });
}

export function useApiAdminDashboard() {
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: fetchAdminDashboard,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
    enabled: true,
  });
}

export function useApiCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    placeholderData: [] as Category[],
    enabled: true,
  });
}

export function useApiProducts(category?: string, q?: string, limit?: number) {
  return useQuery({
    queryKey: ["products", category ?? "", q ?? "", limit ?? 0],
    queryFn: () => fetchProducts(category, q, limit),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    placeholderData: [] as Product[],
    enabled: true,
  });
}

export function useApiProductsByIds(ids: string[]) {
  return useQuery({
    queryKey: ["products-by-ids", ...ids],
    queryFn: () => fetchProductsByIds(ids),
    staleTime: 1000 * 60 * 2,
    enabled: ids.length > 0,
  });
}

export function useApiHomeProducts() {
  return useQuery({
    queryKey: ["home-page-data"],
    queryFn: fetchHomeProducts,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    enabled: true,
  });
}

export function useApiRelatedProducts(category: string, excludeId: string, limit = 4) {
  return useQuery({
    queryKey: ["related-products", category, excludeId, limit],
    queryFn: () => fetchRelatedProducts(category, excludeId, limit),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(category && excludeId),
  });
}

export function useApiProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id),
    staleTime: 1000 * 60 * 2,
    enabled: Boolean(id),
  });
}
