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
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  total: number;
  createdAt: string;
};

export const orderStatuses = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export type OrderDetailItem = {
  productId: string;
  qty: number;
  lineTotal: number;
  name?: string;
  category?: string;
  price?: number;
  image?: string;
};

export type OrderDetails = OrderRecord & {
  items: OrderDetailItem[];
};






export function newId(prefix = "p") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function categoryName(slug: string, categories?: Category[]): string {
  if (categories) {
    const category = categories.find((c) => c.slug === slug);
    if (category) return category.name;
  }
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
}

function fetchApi<T>(path: string): Promise<T> {
  if (import.meta.env.SSR) { throw new Error("API fetch is only available in the browser"); }

  return fetch(path, { cache: "no-store" }).then((res) => {
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
    const [products, categories, rawOrders] = await Promise.all([
      getProducts(),
      getCategories(),
      getOrders(),
    ]);
    const orders = rawOrders as unknown as OrderRecord[];
    return { products, categories, orders };
  }

  return fetchApi<AdminDashboardData>("/api/admin/dashboard");
}

export async function fetchProduct(id: string): Promise<Product | null> {
  if (import.meta.env.SSR) {
    const { getProductById } = await import("@/lib/db");
    return (await getProductById(id)) ?? null;
  }

  return fetch(`/api/products/${encodeURIComponent(id)}`, { cache: "no-store" }).then(async (res) => {
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
    const rawOrders = await getOrders();
    return rawOrders as unknown as OrderRecord[];
  }

  return fetchApi<OrderRecord[]>("/api/admin/orders");
}

export async function fetchOrderDetails(id: number): Promise<OrderDetails> {
  if (import.meta.env.SSR) {
    const { getOrderDetails } = await import("@/lib/db");
    const order = await getOrderDetails(id);
    if (!order) throw new Error("Order not found");
    return order as OrderDetails;
  }

  return fetchApi<OrderDetails>(`/api/admin/orders/${encodeURIComponent(String(id))}`);
}

export function fetchUpdateOrderStatus(id: number, status: OrderStatus): Promise<OrderDetails> {
  return apiRequest<OrderDetails>(`/api/admin/orders/${encodeURIComponent(String(id))}/status`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
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
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    placeholderData: [] as Product[],
    enabled: true,
  });
}

export function useApiProductsByIds(ids: string[]) {
  return useQuery({
    queryKey: ["products-by-ids", ...ids],
    queryFn: () => fetchProductsByIds(ids),
    staleTime: 1000 * 15,
    enabled: ids.length > 0,
  });
}

export function useApiHomeProducts() {
  return useQuery({
    queryKey: ["home-page-data"],
    queryFn: fetchHomeProducts,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
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

export function useApiProduct(id: string, initialProduct?: Product) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id),
    initialData: initialProduct,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 15,
    enabled: Boolean(id),
  });
}
