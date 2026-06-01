import { createPool } from 'mysql2/promise';
import bcrypt from 'bcrypt';
import { createHash } from 'crypto';

const CACHE_TTL = 60_000;
const cache = new Map();

function getCachedValue(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCachedValue(key, value, ttl = CACHE_TTL) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  });
}

function clearCachedPrefix(prefix) {
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

function clearAllCache() {
  cache.clear();
}

// Seed data
export const seedCategories = [
  { slug: 'electronics', name: 'Electronics' },
  { slug: 'gadgets', name: 'Gadgets' },
  { slug: 'accessories', name: 'Accessories' },
];

export const seedProducts = [
  {
    id: '1',
    name: 'Wireless Headphones',
    category: 'electronics',
    price: 89.99,
    stock: 12,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
    description: 'Premium wireless headphones with noise cancellation',
    isNew: true,
    isFeatured: true,
  },
  {
    id: '2',
    name: 'USB-C Cable',
    category: 'accessories',
    price: 14.99,
    stock: 30,
    image: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=500&h=500&fit=crop',
    description: 'Durable USB-C charging and data cable',
    isNew: false,
    isFeatured: false,
  },
  {
    id: '3',
    name: 'Phone Stand',
    category: 'gadgets',
    price: 19.99,
    stock: 18,
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&h=500&fit=crop',
    description: 'Adjustable phone stand for any device',
    isNew: true,
    isFeatured: true,
  },
  {
    id: '4',
    name: 'Power Bank',
    category: 'gadgets',
    price: 39.99,
    stock: 14,
    image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500&h=500&fit=crop',
    description: '20000mAh portable power bank',
    isNew: false,
    isFeatured: false,
  },
  {
    id: '5',
    name: 'Screen Protector',
    category: 'accessories',
    price: 9.99,
    stock: 50,
    image: 'https://images.unsplash.com/photo-1613141065903-85a20c25910a?w=500&h=500&fit=crop',
    description: 'Tempered glass screen protector',
    isNew: false,
    isFeatured: false,
  },
  {
    id: '6',
    name: 'Wireless Mouse',
    category: 'electronics',
    price: 49.99,
    stock: 22,
    image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500&h=500&fit=crop',
    description: 'Silent wireless mouse with precision tracking',
    isNew: true,
    isFeatured: true,
  },
  {
    id: '7',
    name: 'Mechanical Keyboard',
    category: 'electronics',
    price: 129.99,
    stock: 10,
    image: 'https://images.unsplash.com/photo-1587829191301-723ee259d07e?w=500&h=500&fit=crop',
    description: 'RGB mechanical keyboard with custom switches',
    isNew: false,
    isFeatured: false,
  },
  {
    id: '8',
    name: 'Phone Case',
    category: 'accessories',
    price: 24.99,
    stock: 40,
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&h=500&fit=crop',
    description: 'Durable protective phone case',
    isNew: false,
    isFeatured: false,
  },
];

const DATABASE_URL = process.env.DATABASE_URL || 'mysql://root@127.0.0.1:3306/shopdb';

function parseDatabaseUrl(urlString) {
  const url = new URL(urlString);
  return {
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname?.slice(1) || 'shopdb',
  };
}

async function createDatabasePool() {
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

async function initSchema(pool) {
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

  const [categoryIndexRows] = await pool.query(
    "SHOW INDEX FROM products WHERE Key_name = 'idx_products_category'",
  );
  if ((categoryIndexRows?.length ?? 0) === 0) {
    await pool.query('CREATE INDEX idx_products_category ON products(category)');
  }

  const [fulltextIndexRows] = await pool.query(
    "SHOW INDEX FROM products WHERE Key_name = 'idx_products_fulltext'",
  );
  if ((fulltextIndexRows?.length ?? 0) === 0) {
    await pool.query('CREATE FULLTEXT INDEX idx_products_fulltext ON products(name, description)');
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

  // Users table for authentication
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(191) UNIQUE NOT NULL,
      name TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      role ENUM('customer','admin') NOT NULL DEFAULT 'customer',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

  await ensureUsersSchemaCompatibility(pool);

  const [categoryRows] = await pool.query('SELECT COUNT(*) AS count FROM categories');
  const categoryCount = Number(categoryRows[0]?.count ?? 0);
  if (categoryCount === 0) {
    await pool.query(
      `INSERT INTO categories (slug, name) VALUES ${seedCategories.map(() => '(?, ?)').join(', ')}`,
      seedCategories.flatMap((category) => [category.slug, category.name]),
    );
  }

  const [productRows] = await pool.query('SELECT COUNT(*) AS count FROM products');
  const productCount = Number(productRows[0]?.count ?? 0);
  if (productCount === 0) {
    await pool.query(
      `INSERT INTO products (id, name, category, price, stock, image, description, isNew, isFeatured)
       VALUES ${seedProducts.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
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

  // Seed admin user if none exist
  const [userRows] = await pool.query('SELECT COUNT(*) AS count FROM users');
  const userCount = Number(userRows[0]?.count ?? 0);
  if (userCount === 0) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = await bcrypt.hash(adminPassword, 10);
    const legacyPassword = createHash('sha256').update(adminPassword).digest('hex');
    await pool.query('INSERT INTO users (email, name, passwordHash, password, role) VALUES (?, ?, ?, ?, ?)', [
      'admin@shopease.com',
      'Store Admin',
      hash,
      legacyPassword,
      'admin',
    ]);
  }
}

async function ensureUsersSchemaCompatibility(pool) {
  const [columns] = await pool.query('SHOW COLUMNS FROM users');
  const columnNames = new Set(columns.map((column) => column.Field));

  if (!columnNames.has('passwordHash')) {
    await pool.query('ALTER TABLE users ADD COLUMN passwordHash TEXT NULL');
  }

  if (!columnNames.has('password')) {
    await pool.query('ALTER TABLE users ADD COLUMN password VARCHAR(191) NULL');
  } else {
    await pool.query('ALTER TABLE users MODIFY password VARCHAR(191) NULL');
  }

  if (!columnNames.has('createdAt')) {
    await pool.query('ALTER TABLE users ADD COLUMN createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
  } else {
    await pool.query('ALTER TABLE users MODIFY createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
  }
}

let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  const pool = await poolPromise;
  await initSchema(pool);
  initialized = true;
}

export async function getCategories() {
  const cacheKey = 'categories';
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

  await ensureInitialized();
  const pool = await poolPromise;
  const [rows] = await pool.query('SELECT slug, name FROM categories ORDER BY name');
  setCachedValue(cacheKey, rows);
  return rows;
}

export async function createCategory(name) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Category name is required.');
  const slug = slugify(trimmed);
  if (!slug) throw new Error('Category name is invalid.');

  await ensureInitialized();
  const pool = await poolPromise;
  const [existing] = await pool.query('SELECT slug FROM categories WHERE slug = ?', [slug]);
  if (existing.length > 0) {
    throw new Error('Category already exists.');
  }

  await pool.query('INSERT INTO categories (slug, name) VALUES (?, ?)', [slug, trimmed]);
  clearAllCache();
  return { slug, name: trimmed };
}

export async function updateCategory(slug, name) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Category name is required.');

  await ensureInitialized();
  const pool = await poolPromise;
  const [result] = await pool.query('UPDATE categories SET name = ? WHERE slug = ?', [trimmed, slug]);
  if (result.affectedRows === 0) {
    throw new Error('Category not found.');
  }
  clearAllCache();
  return { slug, name: trimmed };
}

export async function deleteCategory(slug) {
  await ensureInitialized();
  const pool = await poolPromise;
  try {
    const [result] = await pool.query('DELETE FROM categories WHERE slug = ?', [slug]);
    if (result.affectedRows === 0) {
      throw new Error('Category not found.');
    }
    clearAllCache();
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      throw new Error('Category is still in use by one or more products.');
    }
    throw error;
  }
}

export async function getCartItems(cartId) {
  await ensureInitialized();
  const pool = await poolPromise;
  const [rows] = await pool.query('SELECT cartId, productId, qty FROM cart_items WHERE cartId = ?', [cartId]);
  return rows;
}

export async function createUser(email, name, password, role = 'customer') {
  const trimmedEmail = String(email).trim().toLowerCase();
  const trimmedName = String(name).trim();
  if (!trimmedEmail || !trimmedName || !password) throw new Error('Email, name and password are required.');
  await ensureInitialized();
  const pool = await poolPromise;
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [trimmedEmail]);
  if (existing.length > 0) throw new Error('An account with this email already exists');
  const passwordHash = await bcrypt.hash(password, 10);
  const legacyPassword = createHash('sha256').update(password).digest('hex');
  const [result] = await pool.query('INSERT INTO users (email, name, passwordHash, password, role) VALUES (?, ?, ?, ?, ?)', [
    trimmedEmail,
    trimmedName,
    passwordHash,
    legacyPassword,
    role,
  ]);
  return { id: String(result.insertId), email: trimmedEmail, name: trimmedName, role };
}

export async function authenticateUser(email, password) {
  const trimmedEmail = String(email).trim().toLowerCase();
  if (!trimmedEmail || !password) throw new Error('Email and password are required.');
  await ensureInitialized();
  const pool = await poolPromise;
  const [rows] = await pool.query('SELECT id, email, name, passwordHash, password, role FROM users WHERE email = ?', [trimmedEmail]);
  if (rows.length === 0) throw new Error('Invalid email or password');
  const user = rows[0];
  let ok = false;
  if (user.passwordHash) {
    ok = await bcrypt.compare(password, user.passwordHash);
  }

  if (!ok && user.password) {
    ok = createHash('sha256').update(password).digest('hex') === user.password;
    if (ok) {
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET passwordHash = ? WHERE email = ?', [passwordHash, trimmedEmail]);
    }
  }
  if (!ok) throw new Error('Invalid email or password');
  return { id: String(user.id), email: user.email, name: user.name, role: user.role };
}

export async function setCartItems(cartId, items) {
  await ensureInitialized();
  const pool = await poolPromise;
  await pool.query('DELETE FROM cart_items WHERE cartId = ?', [cartId]);
  if (items.length === 0) return;

  const values = items.flatMap((item) => [cartId, item.productId, item.qty]);
  await pool.query(
    `INSERT INTO cart_items (cartId, productId, qty) VALUES ${items.map(() => '(?, ?, ?)').join(', ')}`,
    values,
  );
}

export async function clearCartItems(cartId) {
  await ensureInitialized();
  const pool = await poolPromise;
  await pool.query('DELETE FROM cart_items WHERE cartId = ?', [cartId]);
}

export async function getProducts(category, q, limit) {
  const cacheKey = `products:${category ?? ''}:${q ?? ''}:${limit ?? ''}`;
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

  await ensureInitialized();
  const pool = await poolPromise;

  const conditions = [];
  const params = [];

  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }

  if (q?.trim()) {
    const search = q.trim();
    const fulltextQuery = search
      .split(/\s+/)
      .map((term) => term.replace(/[^\w]+/g, ''))
      .filter(Boolean)
      .map((term) => `+${term}*`)
      .join(' ');

    if (fulltextQuery) {
      conditions.push('MATCH(name, description) AGAINST(? IN BOOLEAN MODE)');
      params.push(fulltextQuery);
    } else {
      conditions.push('(LOWER(name) LIKE ? OR LOWER(description) LIKE ?)');
      const searchTerm = `%${search.toLowerCase()}%`;
      params.push(searchTerm, searchTerm);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `SELECT * FROM products ${whereClause} ORDER BY name${limit ? ' LIMIT ?' : ''}`;
  if (limit) {
    params.push(limit);
  }
  const [rows] = await pool.query(query, params);

  const products = rows.map((product) => ({
    ...product,
    isNew: Boolean(product.isNew),
    isFeatured: Boolean(product.isFeatured),
  }));

  setCachedValue(cacheKey, products);
  return products;
}

export async function getProductById(id) {
  const cacheKey = `product:${id}`;
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

  await ensureInitialized();
  const pool = await poolPromise;
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  const product = rows[0];
  if (!product) return undefined;

  const normalized = {
    ...product,
    isNew: Boolean(product.isNew),
    isFeatured: Boolean(product.isFeatured),
  };
  setCachedValue(cacheKey, normalized);
  return normalized;
}

export async function getProductsByIds(ids) {
  if (ids.length === 0) return [];

  const normalizedIds = Array.from(new Set(ids));
  const cacheKey = `productsByIds:${normalizedIds.join(',')}`;
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

  await ensureInitialized();
  const pool = await poolPromise;
  const placeholders = normalizedIds.map(() => '?').join(', ');
  const [rows] = await pool.query(`SELECT * FROM products WHERE id IN (${placeholders})`, normalizedIds);
  const products = rows.map((product) => ({
    ...product,
    isNew: Boolean(product.isNew),
    isFeatured: Boolean(product.isFeatured),
  }));
  setCachedValue(cacheKey, products);
  return products;
}

export async function getHomePageProducts() {
  const cacheKey = 'homePage';
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

  await ensureInitialized();
  const pool = await poolPromise;

  const [featuredRows, newRows, categoryStatsRows, categoryNames] = await Promise.all([
    pool.query('SELECT * FROM products WHERE isFeatured = 1 ORDER BY name LIMIT 8'),
    pool.query('SELECT * FROM products WHERE isNew = 1 ORDER BY name LIMIT 8'),
    pool.query('SELECT category AS slug, COUNT(*) AS count FROM products GROUP BY category'),
    pool.query('SELECT slug, name FROM categories'),
  ]);

  const featured = featuredRows[0].map((product) => ({
    ...product,
    isNew: Boolean(product.isNew),
    isFeatured: Boolean(product.isFeatured),
  }));

  const newArrivals = newRows[0].map((product) => ({
    ...product,
    isNew: Boolean(product.isNew),
    isFeatured: Boolean(product.isFeatured),
  }));

  const categoryStats = categoryStatsRows[0].map((row) => ({
    slug: row.slug,
    name: row.slug,
    count: row.count,
  }));

  const categoryMap = new Map(categoryNames[0].map((c) => [c.slug, c.name]));

  const result = {
    featured,
    newArrivals,
    categoryStats: categoryStats.map((stat) => ({
      slug: stat.slug,
      name: categoryMap.get(stat.slug) ?? stat.slug,
      count: stat.count,
    })),
  };

  setCachedValue(cacheKey, result);
  return result;
}

export async function getRelatedProducts(category, excludeId, limit = 4) {
  const cacheKey = `related:${category}:${excludeId ?? ''}:${limit}`;
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

  await ensureInitialized();
  const pool = await poolPromise;
  const params = [category];
  const whereClause = ['category = ?'];
  if (excludeId) {
    whereClause.push('id != ?');
    params.push(excludeId);
  }
  params.push(limit);

  const [rows] = await pool.query(
    `SELECT * FROM products WHERE ${whereClause.join(' AND ')} ORDER BY name LIMIT ?`,
    params,
  );
  const results = rows.map((product) => ({
    ...product,
    isNew: Boolean(product.isNew),
    isFeatured: Boolean(product.isFeatured),
  }));
  setCachedValue(cacheKey, results);
  return results;
}

export async function createProduct(product) {
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
  clearAllCache();
  return product;
}

export async function updateProduct(product) {
  await ensureInitialized();
  const pool = await poolPromise;
  const [result] = await pool.query(
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
    throw new Error('Product not found.');
  }
  clearAllCache();
  return product;
}

export async function deleteProduct(id) {
  await ensureInitialized();
  const pool = await poolPromise;
  const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
  if (result.affectedRows === 0) {
    throw new Error('Product not found.');
  }
  clearAllCache();
}

export async function resetStore() {
  await ensureInitialized();
  const pool = await poolPromise;
  await pool.query('DELETE FROM order_items');
  await pool.query('DELETE FROM orders');
  await pool.query('DELETE FROM cart_items');
  await pool.query('DELETE FROM products');
  await pool.query('DELETE FROM categories');

  if (seedCategories.length > 0) {
    await pool.query(
      `INSERT INTO categories (slug, name) VALUES ${seedCategories.map(() => '(?, ?)').join(', ')}`,
      seedCategories.flatMap((category) => [category.slug, category.name]),
    );
  }

  if (seedProducts.length > 0) {
    await pool.query(
      `INSERT INTO products (id, name, category, price, stock, image, description, isNew, isFeatured)
       VALUES ${seedProducts.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
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
  clearAllCache();
}

export async function createOrder(order) {
  await ensureInitialized();
  const pool = await poolPromise;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const item of order.items) {
      if (!Number.isInteger(item.qty) || item.qty <= 0) {
        throw new Error('Item quantity must be a positive integer.');
      }

      const [stockResult] = await connection.query(
        'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
        [item.qty, item.productId, item.qty],
      );

      if (stockResult.affectedRows === 0) {
        const [rows] = await connection.query('SELECT name, stock FROM products WHERE id = ?', [item.productId]);
        const product = rows[0];
        const name = product?.name ?? item.productId;
        const available = product?.stock ?? 0;
        throw new Error(`${name} has only ${available} in stock.`);
      }
    }

    const [result] = await connection.query(
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
        new Date().toISOString().slice(0, 19).replace('T', ' '),
      ],
    );

    const orderId = result.insertId;
    const values = order.items.flatMap((item) => [orderId, item.productId, item.qty, item.lineTotal]);
    await connection.query(
      `INSERT INTO order_items (orderId, productId, qty, lineTotal)
       VALUES ${order.items.map(() => '(?, ?, ?, ?)').join(', ')}`,
      values,
    );

    await connection.commit();
    clearAllCache();
    return order.orderNumber;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getOrderByOrderNumber(orderNumber) {
  await ensureInitialized();
  const pool = await poolPromise;
  const [rows] = await pool.query('SELECT * FROM orders WHERE orderNumber = ?', [orderNumber]);
  return rows[0];
}

export async function getOrders() {
  await ensureInitialized();
  const pool = await poolPromise;
  const [rows] = await pool.query('SELECT * FROM orders ORDER BY createdAt DESC');
  return rows;
}

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
