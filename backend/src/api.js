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
  getOrderByOrderNumber,
} from './db.js';

// Checkout controller
function createOrderNumber() {
  return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function getShippingCost(subtotal) {
  if (subtotal < 50) return 9.99;
  if (subtotal < 100) return 4.99;
  return 0;
}

function getOrderTotal(subtotal) {
  const shipping = getShippingCost(subtotal);
  return subtotal + shipping;
}

const checkoutSchema = {
  name: { required: true, type: 'string' },
  email: { required: true, type: 'string' },
  phone: { required: true, type: 'string' },
  address: { required: true, type: 'string' },
  payment: { required: true, type: 'string' },
  items: { required: true, type: 'array' },
};

// Utility functions
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

function badRequest(payload, headers = {}) {
  return json(payload, 400, headers);
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  for (const cookie of cookieHeader.split(';')) {
    const index = cookie.indexOf('=');
    if (index < 0) continue;
    const key = cookie.slice(0, index).trim();
    const value = cookie.slice(index + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function createCartId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getCartIdFromRequest(request) {
  const cookies = parseCookies(request.headers.get('cookie'));
  const existing = cookies['cart_id'];
  if (existing) {
    return { cartId: existing };
  }

  const cartId = createCartId();
  return {
    cartId,
    setCookie: `cart_id=${encodeURIComponent(cartId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
  };
}

async function parseRequestBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// Main API handler
export async function handleApiRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');

  if (path === '/api/categories' && request.method === 'GET') {
    return json(await getCategories());
  }

  if (path === '/api/products' && request.method === 'GET') {
    const limitValue = url.searchParams.get('limit');
    return json(
      await getProducts(
        url.searchParams.get('category') ?? undefined,
        url.searchParams.get('q') ?? undefined,
        limitValue ? Number(limitValue) : undefined,
      ),
    );
  }

  if (path === '/api/admin/dashboard' && request.method === 'GET') {
    const [products, categories, orders] = await Promise.all([
      getProducts(),
      getCategories(),
      getOrders(),
    ]);
    return json({ products, categories, orders }, 200, { 'cache-control': 'no-store' });
  }

  if (path === '/api/products/home' && request.method === 'GET') {
    return json(await getHomePageProducts());
  }

  if (path === '/api/products/ids' && request.method === 'GET') {
    const ids = url.searchParams.getAll('id');
    return json(await getProductsByIds(ids));
  }

  if (path === '/api/products/related' && request.method === 'GET') {
    const category = url.searchParams.get('category');
    const excludeId = url.searchParams.get('excludeId') ?? undefined;
    const limit = Number(url.searchParams.get('limit') ?? 4);
    if (!category) {
      return badRequest({ error: 'Category is required.' });
    }
    return json(await getRelatedProducts(category, excludeId, limit));
  }

  if (path.startsWith('/api/products/') && request.method === 'GET') {
    const id = path.replace('/api/products/', '');
    const product = await getProductById(id);
    if (!product) return json({ error: 'Product not found' }, 404);
    return json(product);
  }

  if (path === '/api/admin/categories' && request.method === 'POST') {
    const body = await parseRequestBody(request);
    if (!body || typeof body.name !== 'string') {
      return badRequest({ error: 'Category name is required.' });
    }
    const category = await createCategory(body.name);
    return json(category, 201);
  }

  if (path.startsWith('/api/admin/categories/') && request.method === 'PUT') {
    const slug = path.replace('/api/admin/categories/', '');
    const body = await parseRequestBody(request);
    if (!body || typeof body.name !== 'string') {
      return badRequest({ error: 'Category name is required.' });
    }
    const category = await updateCategory(slug, body.name);
    return json(category);
  }

  if (path.startsWith('/api/admin/categories/') && request.method === 'DELETE') {
    const slug = path.replace('/api/admin/categories/', '');
    await deleteCategory(slug);
    return json({ success: true });
  }

  if (path === '/api/admin/products' && request.method === 'POST') {
    const body = await parseRequestBody(request);
    if (!body || typeof body.id !== 'string') {
      return badRequest({ error: 'Product data is required.' });
    }
    const product = await createProduct(body);
    return json(product, 201);
  }

  if (path.startsWith('/api/admin/products/') && request.method === 'PUT') {
    const id = path.replace('/api/admin/products/', '');
    const body = await parseRequestBody(request);
    if (!body || typeof body.id !== 'string') {
      return badRequest({ error: 'Product data is required.' });
    }
    const product = await updateProduct({ ...body, id });
    return json(product);
  }

  if (path.startsWith('/api/admin/products/') && request.method === 'DELETE') {
    const id = path.replace('/api/admin/products/', '');
    await deleteProduct(id);
    return json({ success: true });
  }

  if (path === '/api/admin/reset' && request.method === 'POST') {
    await resetStore();
    return json({ success: true });
  }

  if (path === '/api/admin/orders' && request.method === 'GET') {
    return json(await getOrders());
  }

  if (path === '/api/cart' && request.method === 'GET') {
    const { cartId, setCookie } = getCartIdFromRequest(request);
    const cartItems = await getCartItems(cartId);
    return json(
      { items: cartItems.map(({ productId, qty }) => ({ productId, qty })) },
      200,
      setCookie ? { 'set-cookie': setCookie } : {},
    );
  }

  if (path === '/api/cart' && request.method === 'POST') {
    const { cartId, setCookie } = getCartIdFromRequest(request);
    const body = await parseRequestBody(request);
    if (!body || !Array.isArray(body.items)) {
      return badRequest(
        { error: 'Cart items are required.' },
        setCookie ? { 'set-cookie': setCookie } : undefined,
      );
    }

    const items = body.items.map((item) => {
      if (
        typeof item !== 'object' ||
        item === null ||
        typeof item.productId !== 'string' ||
        typeof item.qty !== 'number'
      ) {
        throw new Error('Invalid cart item data.');
      }
      return {
        cartId,
        productId: String(item.productId),
        qty: Number(item.qty),
      };
    });

    await setCartItems(cartId, items);
    return json({ success: true }, 200, setCookie ? { 'set-cookie': setCookie } : {});
  }

  if (path === '/api/cart' && request.method === 'DELETE') {
    const { cartId, setCookie } = getCartIdFromRequest(request);
    await clearCartItems(cartId);
    return json({ success: true }, 200, setCookie ? { 'set-cookie': setCookie } : {});
  }

  if (path === '/api/checkout' && request.method === 'POST') {
    const { cartId, setCookie } = getCartIdFromRequest(request);
    const body = await parseRequestBody(request);
    if (!body) {
      return badRequest(
        { error: 'Invalid JSON body' },
        setCookie ? { 'set-cookie': setCookie } : undefined,
      );
    }

    const errors = {};
    for (const [field, rule] of Object.entries(checkoutSchema)) {
      if (rule.required && !body[field]) {
        errors[field] = `${field} is required`;
      }
    }

    if (Object.keys(errors).length > 0) {
      return badRequest({ errors }, setCookie ? { 'set-cookie': setCookie } : undefined);
    }

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return badRequest(
        { errors: { items: 'Cart items are required.' } },
        setCookie ? { 'set-cookie': setCookie } : undefined,
      );
    }

    const validatedItems = items.map((item) => {
      if (
        typeof item !== 'object' ||
        item === null ||
        typeof item.productId !== 'string' ||
        typeof item.qty !== 'number'
      ) {
        throw new Error('Invalid cart item data.');
      }
      return {
        productId: String(item.productId),
        qty: Number(item.qty),
      };
    });

    const products = await getProductsByIds(validatedItems.map((item) => item.productId));
    const productMap = new Map(products.map((product) => [product.id, product]));

    const orderItems = validatedItems.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      return {
        productId: item.productId,
        qty: item.qty,
        lineTotal: product.price * item.qty,
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const shipping = getShippingCost(subtotal);
    const total = getOrderTotal(subtotal);
    const orderNumber = createOrderNumber();

    await createOrder({
      orderNumber,
      name: body.name,
      phone: body.phone,
      email: body.email,
      address: body.address,
      payment: body.payment,
      subtotal,
      shipping,
      total,
      items: orderItems,
    });

    if (cartId) {
      await clearCartItems(cartId);
    }

    return json(
      { orderNumber, total, subtotal, shipping },
      200,
      setCookie ? { 'set-cookie': setCookie } : {},
    );
  }

  return json({ error: 'API route not found' }, 404);
}
