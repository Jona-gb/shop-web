import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { handleApiRequest } from './api.js';
import { createUser, authenticateUser } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:8080'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

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
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`\n  Backend server running at http://localhost:${PORT}/`);
  console.log(`  API endpoints: http://localhost:${PORT}/api/*\n`);
});
