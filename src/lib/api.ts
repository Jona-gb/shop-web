import {
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
  getRelatedProducts,
  createUser,
  getUserByEmail,
  hashPassword,
} from "@/lib/db";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import {
  checkoutSchema,
  createOrderNumber,
  getOrderTotal,
  getShippingCost,
  parseCheckoutErrors,
} from "@/lib/controllers/checkoutController";

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=600",
      ...headers,
    },
  });
}

function badRequest(payload: unknown, headers?: Record<string, string>) {
  return json(payload, 400, headers);
}

const maxProductImageBytes = 5 * 1024 * 1024;
const productImageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

function sanitizeImageExt(name: string, type: string) {
  const mapped = productImageTypes.get(type);
  if (mapped) return mapped;
  const ext = extname(name).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : "";
}

async function saveProductImage(file: File) {
  if (!productImageTypes.has(file.type)) {
    throw new Error("Image must be a JPG, PNG, WebP, or GIF file.");
  }
  if (file.size > maxProductImageBytes) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const ext = sanitizeImageExt(file.name, file.type);
  const filename = `${crypto.randomUUID()}${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads", "products");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));
  return `/uploads/products/${filename}`;
}

function parseCookies(cookieHeader: string | null) {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const cookie of cookieHeader.split(";")) {
    const index = cookie.indexOf("=");
    if (index < 0) continue;
    const key = cookie.slice(0, index).trim();
    const value = cookie.slice(index + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function createCartId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getCartIdFromRequest(request: Request) {
  const cookies = parseCookies(request.headers.get("cookie"));
  const existing = cookies["cart_id"];
  if (existing) {
    return { cartId: existing };
  }

  const cartId = createCartId();
  return {
    cartId,
    setCookie: `cart_id=${encodeURIComponent(cartId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
  };
}

async function parseRequestBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  const startTime = performance.now();

  try {
    if (path === "/api/admin/product-images" && request.method === "POST") {
      const form = await request.formData();
      const image = form.get("image");
      if (!(image instanceof File)) {
        return badRequest({ error: "Image file is required." }, { "cache-control": "no-store" });
      }

      const url = await saveProductImage(image);
      return json({ url }, 201, { "cache-control": "no-store" });
    }

    if (path === "/api/auth/signup" && request.method === "POST") {
      const body = await parseRequestBody(request);
      if (!body || typeof body.email !== "string" || typeof body.name !== "string" || typeof body.password !== "string") {
        return badRequest({ error: "Email, name, and password are required." }, { "cache-control": "no-store" });
      }

      const user = await createUser(body.name.trim(), body.email.trim(), body.password);
      return json(user, 201, { "cache-control": "no-store" });
    }

    if (path === "/api/auth/login" && request.method === "POST") {
      const body = await parseRequestBody(request);
      if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
        return badRequest({ error: "Email and password are required." }, { "cache-control": "no-store" });
      }

      const user = await getUserByEmail(body.email);
      if (!user || user.password !== hashPassword(body.password)) {
        return badRequest({ error: "Invalid email or password" }, { "cache-control": "no-store" });
      }

      return json({ email: user.email, name: user.name, role: user.role }, 200, { "cache-control": "no-store" });
    }

    if (path === "/api/categories" && request.method === "GET") {
      return json(await getCategories());
    }

    if (path === "/api/products" && request.method === "GET") {
      const limitValue = url.searchParams.get("limit");
      return json(await getProducts(
        url.searchParams.get("category") ?? undefined,
        url.searchParams.get("q") ?? undefined,
        limitValue ? Number(limitValue) : undefined,
      ));
    }

  if (path === "/api/admin/dashboard" && request.method === "GET") {
    const [products, categories, orders] = await Promise.all([
      getProducts(),
      getCategories(),
      getOrders(),
    ]);
    return json({ products, categories, orders }, 200, { "cache-control": "no-store" });
  }

  if (path === "/api/products/home" && request.method === "GET") {
    return json(await getHomePageProducts());
  }

  if (path === "/api/products/ids" && request.method === "GET") {
    const ids = url.searchParams.getAll("id");
    return json(await getProductsByIds(ids));
  }

  if (path === "/api/products/related" && request.method === "GET") {
    const category = url.searchParams.get("category");
    const excludeId = url.searchParams.get("excludeId") ?? undefined;
    const limit = Number(url.searchParams.get("limit") ?? 4);
    if (!category) {
      return badRequest({ error: "Category is required." });
    }
    return json(await getRelatedProducts(category, excludeId, limit));
  }

  if (path.startsWith("/api/products/") && request.method === "GET") {
    const id = path.replace("/api/products/", "");
    const product = await getProductById(id);
    if (!product) return json({ error: "Product not found" }, 404);
    return json(product);
  }

  if (path === "/api/admin/categories" && request.method === "POST") {
    const body = await parseRequestBody(request);
    if (!body || typeof body.name !== "string") {
      return badRequest({ error: "Category name is required." });
    }
    const category = await createCategory(body.name);
    return json(category, 201, { "cache-control": "no-store" });
  }

  if (path.startsWith("/api/admin/categories/") && request.method === "PUT") {
    const slug = path.replace("/api/admin/categories/", "");
    const body = await parseRequestBody(request);
    if (!body || typeof body.name !== "string") {
      return badRequest({ error: "Category name is required." });
    }
    const category = await updateCategory(slug, body.name);
    return json(category, 200, { "cache-control": "no-store" });
  }

  if (path.startsWith("/api/admin/categories/") && request.method === "DELETE") {
    const slug = path.replace("/api/admin/categories/", "");
    await deleteCategory(slug);
    return json({ success: true }, 200, { "cache-control": "no-store" });
  }

  if (path === "/api/admin/products" && request.method === "POST") {
    const body = await parseRequestBody(request);
    if (!body || typeof body.id !== "string") {
      return badRequest({ error: "Product data is required." });
    }
    const product = await createProduct(body as any);
    return json(product, 201, { "cache-control": "no-store" });
  }

  if (path.startsWith("/api/admin/products/") && request.method === "PUT") {
    const id = path.replace("/api/admin/products/", "");
    const body = await parseRequestBody(request);
    if (!body || typeof body.id !== "string") {
      return badRequest({ error: "Product data is required." });
    }
    const product = await updateProduct({ ...(body as any), id });
    return json(product, 200, { "cache-control": "no-store" });
  }

  if (path.startsWith("/api/admin/products/") && request.method === "DELETE") {
    const id = path.replace("/api/admin/products/", "");
    await deleteProduct(id);
    return json({ success: true }, 200, { "cache-control": "no-store" });
  }

  if (path === "/api/admin/reset" && request.method === "POST") {
    await resetStore();
    return json({ success: true });
  }

  if (path === "/api/admin/orders" && request.method === "GET") {
    return json(await getOrders(), 200, { "cache-control": "no-store" });
  }

  if (path === "/api/cart" && request.method === "GET") {
    const { cartId, setCookie } = getCartIdFromRequest(request);
    const cartItems = await getCartItems(cartId);
    return json({ items: cartItems.map(({ productId, qty }) => ({ productId, qty })) }, 200, setCookie ? { "set-cookie": setCookie } : {});
  }

  if (path === "/api/cart" && request.method === "POST") {
    const { cartId, setCookie } = getCartIdFromRequest(request);
    const body = await parseRequestBody(request);
    if (!body || !Array.isArray(body.items)) {
      return badRequest({ error: "Cart items are required." }, setCookie ? { "set-cookie": setCookie } : undefined);
    }

    const items = body.items.map((item) => {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof (item as Record<string, unknown>).productId !== "string" ||
        typeof (item as Record<string, unknown>).qty !== "number"
      ) {
        throw new Error("Invalid cart item data.");
      }
      return {
        cartId,
        productId: String((item as Record<string, unknown>).productId),
        qty: Number((item as Record<string, unknown>).qty),
      };
    });

    await setCartItems(cartId, items);
    return json({ success: true }, 200, setCookie ? { "set-cookie": setCookie } : {});
  }

  if (path === "/api/cart" && request.method === "DELETE") {
    const { cartId, setCookie } = getCartIdFromRequest(request);
    await clearCartItems(cartId);
    return json({ success: true }, 200, setCookie ? { "set-cookie": setCookie } : {});
  }

  if (path === "/api/checkout" && request.method === "POST") {
    const { cartId, setCookie } = getCartIdFromRequest(request);
    const body = await parseRequestBody(request);
    if (!body) return badRequest({ error: "Invalid JSON body" }, setCookie ? { "set-cookie": setCookie } : undefined);

    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest({ errors: parseCheckoutErrors(parsed) }, setCookie ? { "set-cookie": setCookie } : undefined);
    }

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return badRequest({ errors: { items: "Cart items are required." } }, setCookie ? { "set-cookie": setCookie } : undefined);
    }

    const validatedItems = items.map((item) => {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof (item as Record<string, unknown>).productId !== "string" ||
        typeof (item as Record<string, unknown>).qty !== "number"
      ) {
        throw new Error("Invalid cart item data.");
      }
      return {
        productId: String((item as Record<string, unknown>).productId),
        qty: Number((item as Record<string, unknown>).qty),
      };
    });

    const orderItems = await Promise.all(validatedItems.map(async (item) => {
      const product = await getProductById(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      return {
        productId: item.productId,
        qty: item.qty,
        lineTotal: product.price * item.qty,
      };
    }));

    const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const shipping = getShippingCost(subtotal);
    const total = getOrderTotal(subtotal);
    const orderNumber = createOrderNumber();

    await createOrder({
      orderNumber,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      address: parsed.data.address,
      payment: parsed.data.payment,
      subtotal,
      shipping,
      total,
      items: orderItems,
    });

    if (cartId) {
      await clearCartItems(cartId);
    }

    return json({ orderNumber, total, subtotal, shipping }, 200, setCookie ? { "set-cookie": setCookie } : {});
  }

  return json({ error: "API route not found" }, 404);
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      if (error.message.includes("still in use")) {
        return json({ error: error.message }, 400);
      }
      if (
        error.message.includes("required") ||
        error.message.includes("Valid email") ||
        error.message.includes("Password") ||
        error.message.includes("already exists") ||
        error.message.includes("Invalid email or password") ||
        error.message.includes("Image must")
      ) {
        return json({ error: error.message }, 400, { "cache-control": "no-store" });
      }
      if (error.message.includes("not found")) {
        return json({ error: error.message }, 404);
      }
      return json({ error: error.message }, 500);
    }
    return json({ error: "Internal server error" }, 500);
  }
}
