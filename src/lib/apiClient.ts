// Frontend API client that calls the backend
const API_URL = import.meta.env.VITE_API_URL || "";

function buildUrl(endpoint: string): string {
  return API_URL ? `${API_URL}${endpoint}` : endpoint;
}

async function handleResponse(response: Response): Promise<any> {
  const contentType = response.headers.get("content-type");
  if (!response.ok) {
    let error;
    if (contentType?.includes("application/json")) {
      error = await response.json();
    } else {
      error = { error: `HTTP ${response.status}` };
    }
    const message =
      error?.error ??
      error?.message ??
      (error?.errors && typeof error.errors === "object"
        ? Object.values(error.errors).flat().join(" ")
        : null) ??
      `HTTP ${response.status}`;
    throw new Error(message);
  }
  if (contentType?.includes("application/json")) {
    return response.json();
  }
  return response;
}

export async function apiCall(endpoint: string, options: Record<string, any> = {}): Promise<any> {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
  });
  return handleResponse(response);
}

export async function getCategories() {
  return apiCall("/api/categories");
}

export async function getProducts(category?: string | null, q?: string | null, limit?: number): Promise<any> {
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  if (q) params.append("q", q);
  if (limit) params.append("limit", String(limit));
  return apiCall(`/api/products?${params}`);
}

export async function getHomePageProducts() {
  return apiCall("/api/products/home");
}

export async function getProductsByIds(ids: string[]): Promise<any> {
  const params = new URLSearchParams();
  ids.forEach((id) => params.append("id", id));
  return apiCall(`/api/products/ids?${params}`);
}

export async function getProductById(id: string): Promise<any> {
  return apiCall(`/api/products/${id}`);
}

export async function getProductInventoryHistory(id: string, limit: number = 20): Promise<any> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  return apiCall(`/api/products/${id}/history?${params}`);
}

export async function getRelatedProducts(category: string, excludeId?: string | null, limit?: number): Promise<any> {
  const params = new URLSearchParams({ category, limit: String(limit ?? 4) });
  if (excludeId) params.append("excludeId", excludeId);
  return apiCall(`/api/products/related?${params}`);
}

export async function getCartItems(cartId: string): Promise<any> {
  return apiCall(`/api/cart`, { method: "GET" });
}

export async function setCartItems(items: any[]): Promise<any> {
  return apiCall(`/api/cart`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function clearCartItems() {
  return apiCall(`/api/cart`, { method: "DELETE" });
}

export async function createOrder(data: any): Promise<any> {
  return apiCall("/api/checkout", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getOrders() {
  return apiCall("/api/admin/orders");
}

export async function getOrderDetails(id: number): Promise<any> {
  return apiCall(`/api/admin/orders/${id}`);
}

export async function updateOrderStatus(id: number, status: string): Promise<any> {
  return apiCall(`/api/admin/orders/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export async function getCategories_Admin() {
  return apiCall("/api/categories");
}

export async function createCategory(name: string): Promise<any> {
  return apiCall("/api/admin/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function updateCategory(slug: string, name: string): Promise<any> {
  return apiCall(`/api/admin/categories/${slug}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export async function deleteCategory(slug: string): Promise<any> {
  return apiCall(`/api/admin/categories/${slug}`, {
    method: "DELETE",
  });
}

export async function createProduct(product: any): Promise<any> {
  return apiCall("/api/admin/products", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export async function updateProduct(product: any): Promise<any> {
  return apiCall(`/api/admin/products/${product.id}`, {
    method: "PUT",
    body: JSON.stringify(product),
  });
}

export async function deleteProduct(id: string): Promise<any> {
  return apiCall(`/api/admin/products/${id}`, {
    method: "DELETE",
  });
}

export async function resetStore() {
  return apiCall("/api/admin/reset", {
    method: "POST",
  });
}
