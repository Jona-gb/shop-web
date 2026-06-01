import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { handleApiRequest } from './api.js';
import { createUser, authenticateUser } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const allowedOrigins = new Set([
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;

  try {
    const url = new URL(origin);
    return (url.hostname === 'localhost' || url.hostname === '127.0.0.1') && /^\d+$/.test(url.port);
  } catch {
    return false;
  }
}

app.use(cors({
  origin(origin, callback) {
    callback(null, isAllowedOrigin(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

const productImageTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);
const maxProductImageBytes = 5 * 1024 * 1024;
const uploadDir = join(__dirname, '..', '..', 'public', 'uploads', 'products');

function readRequestBuffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxProductImageBytes + 1024 * 1024) {
        reject(new Error('Image must be 5 MB or smaller.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
// Direct auth endpoints (use Express body parsing reliably)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, name, password } = req.body ?? {};
    if (!email || !name || !password) return res.status(400).json({ error: 'Email, name, and password are required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    const user = await createUser(String(email).toLowerCase().trim(), String(name).trim(), String(password));
    return res.status(201).json(user);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Could not create account' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const user = await authenticateUser(String(email).toLowerCase().trim(), String(password));
    return res.json(user);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Could not sign in' });
  }
});

app.post('/api/admin/product-images', async (req, res) => {
  try {
    const body = await readRequestBuffer(req);
    const formRequest = new Request(`http://localhost:${PORT}${req.originalUrl}`, {
      method: 'POST',
      headers: new Headers(req.headers || {}),
      body,
    });
    const form = await formRequest.formData();
    const image = form.get('image');

    if (!(image instanceof File)) {
      return res.status(400).json({ error: 'Image file is required.' });
    }
    if (!productImageTypes.has(image.type)) {
      return res.status(400).json({ error: 'Image must be a JPG, PNG, WebP, or GIF file.' });
    }
    if (image.size > maxProductImageBytes) {
      return res.status(400).json({ error: 'Image must be 5 MB or smaller.' });
    }

    await mkdir(uploadDir, { recursive: true });
    const filename = `${randomUUID()}${productImageTypes.get(image.type)}`;
    await writeFile(join(uploadDir, filename), Buffer.from(await image.arrayBuffer()));
    return res.status(201).json({ url: `/uploads/products/${filename}` });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Could not upload image' });
  }
});

app.all('/api/*', async (req, res) => {
  try {
    console.log('Proxying API request', req.method, req.originalUrl, 'headers:', req.headers, 'body:', req.body);
    const response = await handleApiRequest({
      method: req.method,
      url: `http://localhost:${PORT}${req.originalUrl}`,
      headers: new Headers(req.headers || {}),
      body: req.method !== 'GET' && req.method !== 'DELETE' ? { json: async () => req.body } : null,
    });

    // Set response headers
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        res.setHeader(key, value);
      } else {
        res.setHeader(key, value);
      }
    });

    res.status(response.status);
    const text = await response.text();
    if (text) {
      try {
        res.json(JSON.parse(text));
      } catch {
        res.send(text);
      }
    } else {
      res.end();
    }
  } catch (error) {
    console.error('API error:', error);
    if (
      error instanceof Error &&
      (error.message.includes('in stock') ||
        error.message.includes('out of stock') ||
        error.message.includes('positive integer'))
    ) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`\n  Backend server running at http://localhost:${PORT}/`);
  console.log(`  API endpoints: http://localhost:${PORT}/api/*\n`);
});
