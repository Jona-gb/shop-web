import { createPool, type Pool, type RowDataPacket } from "mysql2/promise";
import { seedCategories, seedProducts, type Category, type Product, slugify } from "@/lib/products";

type ProductRow = Omit<Product, "isNew" | "isFeatured"> & {
  isNew: number;
  isFeatured: number;
};

export type CartItemRow = {
  cartId: string;
  productId: string;
  qty: number;
};

const DATABASE_URL = process.env.DATABASE_URL ?? "mysql://root@127.0.0.1:3306/shopdb";

function parseDatabaseUrl(urlString: string) {
  const url = new URL(urlString);
  return {
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname?.slice(1) || "shopdb",
  };
}

async function createDatabasePool(): Promise<Pool> {
  const config = parseDatabaseUrl(DATABASE_URL);
  const adminPool = createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0,
  });

  try {
    await adminPool.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``);
  } finally {
    await adminPool.end();
  }

  return createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

const poolPromise = createDatabasePool();

async function initSchema(pool: Pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS categories (
      slug VARCHAR(191) PRIMARY KEY,
      name TEXT NOT NULL
    )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(191) PRIMARY KEY,
      name TEXT NOT NULL,
      category VARCHAR(191) NOT NULL,
      price DOUBLE NOT NULL,
      image TEXT NOT NULL,
      description TEXT NOT NULL,
      isNew TINYINT(1) NOT NULL,
      isFeatured TINYINT(1) NOT NULL,
      FOREIGN KEY (category) REFERENCES categories(slug)
    )`);

  const [categoryIndexRows] = await pool.query<RowDataPacket[]>(
    "SHOW INDEX FROM products WHERE Key_name = 'idx_products_category'",
  );
  if (((categoryIndexRows as RowDataPacket[])?.length ?? 0) === 0) {
    await pool.query("CREATE INDEX idx_products_category ON products(category)");
  }

  const [fulltextIndexRows] = await pool.query<RowDataPacket[]>(
    "SHOW INDEX FROM products WHERE Key_name = 'idx_products_fulltext'",
  );
  if (((fulltextIndexRows as RowDataPacket[])?.length ?? 0) === 0) {
    await pool.query("CREATE FULLTEXT INDEX idx_products_fulltext ON products(name, description)");
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS cart_items (
      cartId VARCHAR(191) NOT NULL,
      productId VARCHAR(191) NOT NULL,
      qty INT NOT NULL,
      PRIMARY KEY (cartId, productId),
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS orders (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      orderNumber VARCHAR(191) UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT NOT NULL,
      payment VARCHAR(50) NOT NULL,
      subtotal DOUBLE NOT NULL,
      shipping DOUBLE NOT NULL,
      total DOUBLE NOT NULL,
      createdAt DATETIME NOT NULL
    )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS order_items (
      orderId BIGINT NOT NULL,
      productId VARCHAR(191) NOT NULL,
      qty INT NOT NULL,
      lineTotal DOUBLE NOT NULL,
      PRIMARY KEY(orderId, productId),
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    )`);

  const [categoryRows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM categories");
  const categoryCount = Number(categoryRows[0]?.count ?? 0);
  if (categoryCount === 0) {
    await pool.query(
      `INSERT INTO categories (slug, name) VALUES ${seedCategories
        .map(() => "(?, ?)")
        .join(", ")}`,
      seedCategories.flatMap((category) => [category.slug, category.name]),
    );
  }

  const [productRows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM products");
  const productCount = Number(productRows[0]?.count ?? 0);
  if (productCount === 0) {
    await pool.query(
      `INSERT INTO products (id, name, category, price, image, description, isNew, isFeatured)
       VALUES ${seedProducts.map(() => "(?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}`,
      seedProducts.flatMap((product) => [
        product.id,
        product.name,
        product.category,
        product.price,
        product.image,
        product.description,
        product.isNew ? 1 : 0,
        product.isFeatured ? 1 : 0,
      ]),
    );
  }
}

let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  const pool = await poolPromise;
  await initSchema(pool);
  initialized = true;
}

export async function getCategories(): Promise<Category[]> {
  await ensureInitialized();
  const pool = await poolPromise;
  const [rows] = await pool.query<RowDataPacket[]>("SELECT slug, name FROM categories ORDER BY name");
  return rows as Category[];
}

export async function createCategory(name: string): Promise<Category> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required.");
  const slug = slugify(trimmed);
  if (!slug) throw new Error("Category name is invalid.");

  await ensureInitialized();
  const pool = await poolPromise;
  const [existing] = await pool.query<RowDataPacket[]>("SELECT slug FROM categories WHERE slug = ?", [slug]);
  if ((existing as RowDataPacket[]).length > 0) {
    throw new Error("Category already exists.");
  }

  await pool.query("INSERT INTO categories (slug, name) VALUES (?, ?)", [slug, trimmed]);
  return { slug, name: trimmed };
}

export async function updateCategory(slug: string, name: string): Promise<Category> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required.");

  await ensureInitialized();
  const pool = await poolPromise;
  const [result] = await pool.query<import("mysql2").OkPacket>("UPDATE categories SET name = ? WHERE slug = ?", [trimmed, slug]);
  if (result.affectedRows === 0) {
    throw new Error("Category not found.");
  }
  return { slug, name: trimmed };
}

export async function deleteCategory(slug: string): Promise<void> {
  await ensureInitialized();
  const pool = await poolPromise;
  try {
    const [result] = await pool.query<import("mysql2").OkPacket>("DELETE FROM categories WHERE slug = ?", [slug]);
    if (result.affectedRows === 0) {
      throw new Error("Category not found.");
    }
  } catch (error) {
    if (error instanceof Error && (error as any).code === "ER_ROW_IS_REFERENCED_2") {
      throw new Error("Category is still in use by one or more products.");
    }
    throw error;
  }
}

export async function getCartItems(cartId: string): Promise<CartItemRow[]> {
  await ensureInitialized();
  const pool = await poolPromise;
  const [rows] = await pool.query<RowDataPacket[]>("SELECT cartId, productId, qty FROM cart_items WHERE cartId = ?", [cartId]);
  return rows as CartItemRow[];
}

export async function setCartItems(cartId: string, items: CartItemRow[]): Promise<void> {
  await ensureInitialized();
  const pool = await poolPromise;
  await pool.query("DELETE FROM cart_items WHERE cartId = ?", [cartId]);
  if (items.length === 0) return;

  const values = items.flatMap((item) => [cartId, item.productId, item.qty]);
  await pool.query(
    `INSERT INTO cart_items (cartId, productId, qty) VALUES ${items.map(() => "(?, ?, ?)").join(", ")}`,
    values,
  );
}

export async function clearCartItems(cartId: string): Promise<void> {
  await ensureInitialized();
  const pool = await poolPromise;
  await pool.query("DELETE FROM cart_items WHERE cartId = ?", [cartId]);
}

export async function getProducts(category?: string, q?: string, limit?: number): Promise<Product[]> {
  await ensureInitialized();
  const pool = await poolPromise;

  const conditions: string[] = [];
  const params: Array<unknown> = [];

  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }

  if (q?.trim()) {
    const search = q.trim();
    const fulltextQuery = search
      .split(/\s+/)
      .map((term) => term.replace(/[^\w]+/g, ""))
      .filter(Boolean)
      .map((term) => `+${term}*`)
      .join(" ");

    if (fulltextQuery) {
      conditions.push("MATCH(name, description) AGAINST(? IN BOOLEAN MODE)");
      params.push(fulltextQuery);
    } else {
      conditions.push("(LOWER(name) LIKE ? OR LOWER(description) LIKE ?)");
      const searchTerm = `%${search.toLowerCase()}%`;
      params.push(searchTerm, searchTerm);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const query = `SELECT * FROM products ${whereClause} ORDER BY name${limit ? " LIMIT ?" : ""}`;
  if (limit) {
    params.push(limit);
  }
  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  const productRows = rows as ProductRow[];

  return productRows.map((product) => ({
    ...product,
    isNew: Boolean(product.isNew),
    isFeatured: Boolean(product.isFeatured),
  }));
}

export async function getProductById(id: string): Promise<Product | undefined> {
  await ensureInitialized();
  const pool = await poolPromise;
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM products WHERE id = ?",
    [id],
  );
  const product = (rows as ProductRow[])[0];
  if (!product) return undefined;
  return {
    ...product,
    isNew: Boolean(product.isNew),
    isFeatured: Boolean(product.isFeatured),
  };
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  await ensureInitialized();
  const pool = await poolPromise;
  const placeholders = ids.map(() => "?").join(", ");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM products WHERE id IN (${placeholders})`,
    ids,
  );
  return (rows as ProductRow[]).map((product) => ({
    ...product,
    isNew: Boolean(product.isNew),
    isFeatured: Boolean(product.isFeatured),
  }));
}

export async function getHomePageProducts(): Promise<{
  featured: Product[];
  newArrivals: Product[];
  categoryStats: Array<{ slug: string; name: string; count: number }>;
}> {
  await ensureInitialized();
  const pool = await poolPromise;

  const [featuredRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM products WHERE isFeatured = 1 ORDER BY name LIMIT 8",
  );
  const featured = (featuredRows as ProductRow[]).map((product) => ({
    ...product,
    isNew: Boolean(product.isNew),
    isFeatured: Boolean(product.isFeatured),
  }));

  const [newRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM products WHERE isNew = 1 ORDER BY name LIMIT 8",
  );
  const newArrivals = (newRows as ProductRow[]).map((product) => ({
    ...product,
    isNew: Boolean(product.isNew),
    isFeatured: Boolean(product.isFeatured),
  }));

  const [categoryStatsRows] = await pool.query<RowDataPacket[]>(
    `SELECT category AS slug, COUNT(*) AS count FROM products GROUP BY category`,
  );
  const categoryStats = (categoryStatsRows as Array<{ slug: string; count: number }>).map((row) => ({
    slug: row.slug,
    name: row.slug,
    count: row.count,
  }));

  const [categoryNames] = await pool.query<RowDataPacket[]>(
    `SELECT slug, name FROM categories`,
  );
  const categoryMap = new Map((categoryNames as Array<{ slug: string; name: string }>).map((c) => [c.slug, c.name]));

  return {
    featured,
    newArrivals,
    categoryStats: categoryStats.map((stat) => ({
      slug: stat.slug,
      name: categoryMap.get(stat.slug) ?? stat.slug,
      count: stat.count,
    })),
  };
}

export async function getRelatedProducts(category: string, excludeId: string | undefined, limit = 4): Promise<Product[]> {
  await ensureInitialized();
  const pool = await poolPromise;
  const params: Array<unknown> = [category];
  const whereClause = ["category = ?"];
  if (excludeId) {
    whereClause.push("id != ?");
    params.push(excludeId);
  }
  params.push(limit);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM products WHERE ${whereClause.join(" AND ")} ORDER BY name LIMIT ?`,
    params,
  );
  return (rows as ProductRow[]).map((product) => ({
    ...product,
    isNew: Boolean(product.isNew),
    isFeatured: Boolean(product.isFeatured),
  }));
}

export async function createProduct(product: Product): Promise<Product> {
  await ensureInitialized();
  const pool = await poolPromise;
  await pool.query(
    `INSERT INTO products (id, name, category, price, image, description, isNew, isFeatured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      product.id,
      product.name,
      product.category,
      product.price,
      product.image,
      product.description,
      product.isNew ? 1 : 0,
      product.isFeatured ? 1 : 0,
    ],
  );
  return product;
}

export async function updateProduct(product: Product): Promise<Product> {
  await ensureInitialized();
  const pool = await poolPromise;
  const [result] = await pool.query<import("mysql2").OkPacket>(
    `UPDATE products SET name = ?, category = ?, price = ?, image = ?, description = ?, isNew = ?, isFeatured = ?
     WHERE id = ?`,
    [
      product.name,
      product.category,
      product.price,
      product.image,
      product.description,
      product.isNew ? 1 : 0,
      product.isFeatured ? 1 : 0,
      product.id,
    ],
  );
  if (result.affectedRows === 0) {
    throw new Error("Product not found.");
  }
  return product;
}

export async function deleteProduct(id: string): Promise<void> {
  await ensureInitialized();
  const pool = await poolPromise;
  const [result] = await pool.query<import("mysql2").OkPacket>("DELETE FROM products WHERE id = ?", [id]);
  if (result.affectedRows === 0) {
    throw new Error("Product not found.");
  }
}

export async function resetStore(): Promise<void> {
  await ensureInitialized();
  const pool = await poolPromise;
  await pool.query("DELETE FROM order_items");
  await pool.query("DELETE FROM orders");
  await pool.query("DELETE FROM cart_items");
  await pool.query("DELETE FROM products");
  await pool.query("DELETE FROM categories");

  if (seedCategories.length > 0) {
    await pool.query(
      `INSERT INTO categories (slug, name) VALUES ${seedCategories.map(() => "(?, ?)").join(", ")}`,
      seedCategories.flatMap((category) => [category.slug, category.name]),
    );
  }

  if (seedProducts.length > 0) {
    await pool.query(
      `INSERT INTO products (id, name, category, price, image, description, isNew, isFeatured)
       VALUES ${seedProducts.map(() => "(?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}`,
      seedProducts.flatMap((product) => [
        product.id,
        product.name,
        product.category,
        product.price,
        product.image,
        product.description,
        product.isNew ? 1 : 0,
        product.isFeatured ? 1 : 0,
      ]),
    );
  }
}

export type OrderItemRow = {
  productId: string;
  qty: number;
  lineTotal: number;
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

export async function createOrder(order: {
  orderNumber: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  payment: string;
  subtotal: number;
  shipping: number;
  total: number;
  items: OrderItemRow[];
}) {
  await ensureInitialized();
  const pool = await poolPromise;

  const [result] = await pool.query<import("mysql2").OkPacket>(
    `INSERT INTO orders (orderNumber, name, phone, email, address, payment, subtotal, shipping, total, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      order.orderNumber,
      order.name,
      order.phone,
      order.email,
      order.address,
      order.payment,
      order.subtotal,
      order.shipping,
      order.total,
      new Date().toISOString().slice(0, 19).replace("T", " "),
    ],
  );

  const orderId = result.insertId;
  const values = order.items.flatMap((item) => [orderId, item.productId, item.qty, item.lineTotal]);
  await pool.query(
    `INSERT INTO order_items (orderId, productId, qty, lineTotal)
     VALUES ${order.items.map(() => "(?, ?, ?, ?)").join(", ")}`,
    values,
  );

  return order.orderNumber;
}

export async function getOrderByOrderNumber(orderNumber: string): Promise<OrderRecord | undefined> {
  await ensureInitialized();
  const pool = await poolPromise;
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM orders WHERE orderNumber = ?", [orderNumber]);
  return rows[0] as OrderRecord | undefined;
}

export async function getOrders(): Promise<OrderRecord[]> {
  await ensureInitialized();
  const pool = await poolPromise;
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM orders ORDER BY createdAt DESC");
  return rows as OrderRecord[];
}
