import { createHash } from "crypto";
import { createPool, type Pool, type RowDataPacket } from "mysql2/promise";
import { seedCategories, seedProducts, type Category, type Product, slugify } from "@/lib/products";

type Role = "customer" | "admin";

export type UserRow = {
  email: string;
  name: string;
  role: Role;
  password: string;
};

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
      stock INT NOT NULL DEFAULT 0,
      image TEXT NOT NULL,
      description TEXT NOT NULL,
      isNew TINYINT(1) NOT NULL,
      isFeatured TINYINT(1) NOT NULL,
      FOREIGN KEY (category) REFERENCES categories(slug)
    )`);

  try {
    await pool.query('ALTER TABLE products ADD COLUMN stock INT NOT NULL DEFAULT 0');
  } catch (err) {
    if (
      !(
        err &&
        (err.code === 'ER_DUP_FIELDNAME' || (typeof err.message === 'string' && err.message.includes('Duplicate column')))
      )
    ) {
      throw err;
    }
    // ignore duplicate column errors for older MySQL versions
  }

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
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      subtotal DOUBLE NOT NULL,
      shipping DOUBLE NOT NULL,
      total DOUBLE NOT NULL,
      createdAt DATETIME NOT NULL
    )`);

  try {
    await pool.query("ALTER TABLE orders ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending'");
  } catch (err) {
    if (
      !(
        err &&
        (err.code === 'ER_DUP_FIELDNAME' || (typeof err.message === 'string' && err.message.includes('Duplicate column')))
      )
    ) {
      throw err;
    }
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS order_items (
      orderId BIGINT NOT NULL,
      productId VARCHAR(191) NOT NULL,
      qty INT NOT NULL,
      lineTotal DOUBLE NOT NULL,
      PRIMARY KEY(orderId, productId),
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS users (
      email VARCHAR(191) PRIMARY KEY,
      name TEXT NOT NULL,
      role VARCHAR(50) NOT NULL,
      password VARCHAR(191) NOT NULL
    )`);

  const [userRows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM users");
  const userCount = Number(userRows[0]?.count ?? 0);
  if (userCount === 0) {
    const hashedPassword = hashPassword("admin123");
    await pool.query(
      `INSERT INTO users (email, name, role, password) VALUES (?, ?, ?, ?)`,
      ["admin@shopease.com", "Store Admin", "admin", hashedPassword],
    );
  }

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
      `INSERT INTO products (id, name, category, price, stock, image, description, isNew, isFeatured)
       VALUES ${seedProducts.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}`,
      seedProducts.flatMap((product) => [
        product.id,
        product.name,
        product.category,
        product.price,
        product.stock,
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

  // Combine all queries into one with UNION to reduce round trips
  const [allRows] = await pool.query<RowDataPacket[]>(
    `(
      SELECT p.*, 'featured' AS type FROM products p WHERE p.isFeatured = 1 ORDER BY p.name LIMIT 8
    )
    UNION ALL
    (
      SELECT p.*, 'new' AS type FROM products p WHERE p.isNew = 1 ORDER BY p.name LIMIT 8
    )`,
  );

  const featured: Product[] = [];
  const newArrivals: Product[] = [];

  (allRows as (ProductRow & { type: string })[]).forEach((product) => {
    const converted = {
      ...product,
      isNew: Boolean(product.isNew),
      isFeatured: Boolean(product.isFeatured),
    };
    if (product.type === 'featured') featured.push(converted);
    if (product.type === 'new') newArrivals.push(converted);
  });

  // Get categories with counts in one query
  const [categoryStatsRows] = await pool.query<RowDataPacket[]>(
    `SELECT c.slug, c.name, COUNT(p.id) AS count 
     FROM categories c 
     LEFT JOIN products p ON c.slug = p.category 
     GROUP BY c.slug, c.name`,
  );
  const categoryStats = (categoryStatsRows as Array<{ slug: string; name: string; count: number }>);

  return {
    featured,
    newArrivals,
    categoryStats,
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
    `INSERT INTO products (id, name, category, price, stock, image, description, isNew, isFeatured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      product.id,
      product.name,
      product.category,
      product.price,
      product.stock,
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
    `UPDATE products SET name = ?, category = ?, price = ?, stock = ?, image = ?, description = ?, isNew = ?, isFeatured = ?
     WHERE id = ?`,
    [
      product.name,
      product.category,
      product.price,
      product.stock,
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

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getUserByEmail(email: string): Promise<UserRow | undefined> {
  await ensureInitialized();
  const pool = await poolPromise;
  const normalizedEmail = normalizeEmail(email);
  const [rows] = await pool.query<RowDataPacket[]>("SELECT email, name, role, password FROM users WHERE email = ?", [normalizedEmail]);
  return (rows as UserRow[])[0];
}

export async function getUsers(): Promise<Array<{ email: string; name: string; role: Role }>> {
  await ensureInitialized();
  const pool = await poolPromise;
  const [rows] = await pool.query<RowDataPacket[]>("SELECT email, name, role FROM users ORDER BY email");
  return rows as Array<{ email: string; name: string; role: Role }>;
}

export async function createUser(name: string, email: string, password: string): Promise<{ email: string; name: string; role: Role }> {
  const normalizedEmail = normalizeEmail(email);
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Name is required.");
  if (!normalizedEmail || !normalizedEmail.includes("@")) throw new Error("Valid email is required.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");

  await ensureInitialized();
  const pool = await poolPromise;
  const [existing] = await pool.query<RowDataPacket[]>("SELECT email FROM users WHERE email = ?", [normalizedEmail]);
  if ((existing as RowDataPacket[]).length > 0) {
    throw new Error("An account with this email already exists");
  }

  const hashedPassword = hashPassword(password);
  await pool.query("INSERT INTO users (email, name, role, password) VALUES (?, ?, ?, ?)", [normalizedEmail, trimmedName, "customer", hashedPassword]);
  return { email: normalizedEmail, name: trimmedName, role: "customer" };
}

export async function updateUserRole(email: string, role: Role): Promise<{ email: string; name: string; role: Role }> {
  const normalizedEmail = normalizeEmail(email);
  await ensureInitialized();
  const pool = await poolPromise;
  const [result] = await pool.query<import("mysql2").OkPacket>("UPDATE users SET role = ? WHERE email = ?", [role, normalizedEmail]);
  if (result.affectedRows === 0) {
    throw new Error("User not found.");
  }
  const user = await getUserByEmail(normalizedEmail);
  if (!user) throw new Error("User not found.");
  return { email: user.email, name: user.name, role: user.role };
}

export async function deleteUserByEmail(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  await ensureInitialized();
  const pool = await poolPromise;
  const [result] = await pool.query<import("mysql2").OkPacket>("DELETE FROM users WHERE email = ?", [normalizedEmail]);
  if (result.affectedRows === 0) {
    throw new Error("User not found.");
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
      `INSERT INTO products (id, name, category, price, stock, image, description, isNew, isFeatured)
       VALUES ${seedProducts.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}`,
      seedProducts.flatMap((product) => [
        product.id,
        product.name,
        product.category,
        product.price,
        product.stock,
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
  status: string;
  subtotal: number;
  shipping: number;
  total: number;
  createdAt: string;
};

export type OrderDetailItem = {
  productId: string;
  qty: number;
  lineTotal: number;
  name?: string;
  category?: string;
  price?: number;
  image?: string;
};

export type OrderDetailsRecord = OrderRecord & {
  items: OrderDetailItem[];
};

export async function createOrder(order: {
  orderNumber: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  payment: string;
  status?: string;
  subtotal: number;
  shipping: number;
  total: number;
  items: OrderItemRow[];
}) {
  await ensureInitialized();
  const pool = await poolPromise;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const item of order.items) {
      if (!Number.isInteger(item.qty) || item.qty <= 0) {
        throw new Error("Item quantity must be a positive integer.");
      }

      const [stockResult] = await connection.query<import("mysql2").OkPacket>(
        "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
        [item.qty, item.productId, item.qty],
      );

      if (stockResult.affectedRows === 0) {
        const [rows] = await connection.query<RowDataPacket[]>(
          "SELECT name, stock FROM products WHERE id = ?",
          [item.productId],
        );
        const product = rows[0] as { name?: string; stock?: number } | undefined;
        const name = product?.name ?? item.productId;
        const available = product?.stock ?? 0;
        throw new Error(`${name} has only ${available} in stock.`);
      }
    }

    const [result] = await connection.query<import("mysql2").OkPacket>(
      `INSERT INTO orders (orderNumber, name, phone, email, address, payment, status, subtotal, shipping, total, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.orderNumber,
        order.name,
        order.phone,
        order.email,
        order.address,
        order.payment,
        order.status ?? "pending",
        order.subtotal,
        order.shipping,
        order.total,
        new Date().toISOString().slice(0, 19).replace("T", " "),
      ],
    );

    const orderId = result.insertId;
    const values = order.items.flatMap((item) => [orderId, item.productId, item.qty, item.lineTotal]);
    await connection.query(
      `INSERT INTO order_items (orderId, productId, qty, lineTotal)
       VALUES ${order.items.map(() => "(?, ?, ?, ?)").join(", ")}`,
      values,
    );

    await connection.commit();
    return order.orderNumber;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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

export async function getOrderDetails(id: number): Promise<OrderDetailsRecord | undefined> {
  await ensureInitialized();
  const pool = await poolPromise;
  const [orderRows] = await pool.query<RowDataPacket[]>("SELECT * FROM orders WHERE id = ?", [id]);
  const order = orderRows[0] as OrderRecord | undefined;
  if (!order) return undefined;

  const [items] = await pool.query<RowDataPacket[]>(
    `SELECT
       oi.productId,
       oi.qty,
       oi.lineTotal,
       p.name,
       p.category,
       p.price,
       p.image
     FROM order_items oi
     LEFT JOIN products p ON p.id = oi.productId
     WHERE oi.orderId = ?
     ORDER BY p.name`,
    [id],
  );

  return { ...order, items: items as OrderDetailItem[] };
}

export async function updateOrderStatus(id: number, status: string): Promise<OrderDetailsRecord> {
  await ensureInitialized();
  const pool = await poolPromise;
  const [result] = await pool.query<import("mysql2").OkPacket>("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
  if (result.affectedRows === 0) {
    throw new Error("Order not found.");
  }
  const order = await getOrderDetails(id);
  if (!order) {
    throw new Error("Order not found.");
  }
  return order;
}
