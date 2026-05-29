import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { handleApiRequest } from './api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
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
app.all('/api/*', async (req, res) => {
  try {
    const response = await handleApiRequest({
      method: req.method,
      url: `http://localhost:${PORT}${req.originalUrl}`,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'DELETE' ? req.body : null,
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
