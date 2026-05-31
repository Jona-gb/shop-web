// Frontend API client that calls the backend
const API_URL = import.meta.env.VITE_API_URL || "";

function buildUrl(endpoint) {
  return API_URL ? `${API_URL}${endpoint}` : endpoint;
}

async function handleResponse(response) {
  const contentType = response.headers.get("content-type");
  if (!response.ok) {
    let error;
    if (contentType?.includes("application/json")) {
      error = await response.json();
    } else {
      error = { error: `HTTP ${response.status}` };
    }
    throw error;
  }
  if (contentType?.includes("application/json")) {
    return response.json();
  }
  return response;
}

export async function apiCall(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
  });
  return handleResponse(response);
}

export async function getCategories() {
  return apiCall('/api/categories');
}

export async function getProducts(category, q, limit) {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (q) params.append('q', q);
  if (limit) params.append('limit', limit);
  return apiCall(`/api/products?${params}`);
}

export async function getHomePageProducts() {
  return apiCall('/api/products/home');
}

export async function getProductsByIds(ids) {
  const params = new URLSearchParams();
  ids.forEach((id) => params.append('id', id));
  return apiCall(`/api/products/ids?${params}`);
}

export async function getProductById(id) {
  return apiCall(`/api/products/${id}`);
}

export async function getRelatedProducts(category, excludeId, limit) {
  const params = new URLSearchParams({ category, limit: String(limit) });
  if (excludeId) params.append('excludeId', excludeId);
  return apiCall(`/api/products/related?${params}`);
}

export async function getCartItems(cartId) {
  return apiCall(`/api/cart`, { method: 'GET' });
}

export async function setCartItems(items) {
  return apiCall(`/api/cart`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export async function clearCartItems() {
  return apiCall(`/api/cart`, { method: 'DELETE' });
}

export async function createOrder(data) {
  return apiCall('/api/checkout', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getOrders() {
  return apiCall('/api/admin/orders');
}

export async function getCategories_Admin() {
  return apiCall('/api/categories');
}

export async function createCategory(name) {
  return apiCall('/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function updateCategory(slug, name) {
  return apiCall(`/api/admin/categories/${slug}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

export async function deleteCategory(slug) {
  return apiCall(`/api/admin/categories/${slug}`, {
    method: 'DELETE',
  });
}

export async function createProduct(product) {
  return apiCall('/api/admin/products', {
    method: 'POST',
    body: JSON.stringify(product),
  });
}

export async function updateProduct(product) {
  return apiCall(`/api/admin/products/${product.id}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  });
}

export async function deleteProduct(id) {
  return apiCall(`/api/admin/products/${id}`, {
    method: 'DELETE',
  });
}

export async function resetStore() {
  return apiCall('/api/admin/reset', {
    method: 'POST',
  });
}
