#!/usr/bin/env node

import cors from 'cors';
import express from 'express';
import { Readable } from 'node:stream';

const apiKey = process.env.ANTHROPIC_API_KEY;
const port = Number.parseInt(process.env.PORT || '3334', 10);
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '*';
const allowedOrigins = allowedOriginsEnv === '*'
  ? ['*']
  : allowedOriginsEnv.split(',').map((origin) => origin.trim()).filter(Boolean);

if (!apiKey) {
  console.error('[mcp-drop/proxy] Missing ANTHROPIC_API_KEY. Set it in your environment before starting the proxy.');
  process.exit(1);
}

const app = express();

const corsOptions = {
  origin(origin, callback) {
    if (allowedOrigins.includes('*') || !origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by ALLOWED_ORIGINS.'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', proxy: true });
});

app.post('/v1/messages', async (req, res) => {
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(req.body || {})
    });

    res.status(upstream.status);

    const contentType = upstream.headers.get('content-type');
    const cacheControl = upstream.headers.get('cache-control');
    const connection = upstream.headers.get('connection');
    const transferEncoding = upstream.headers.get('transfer-encoding');

    if (contentType) res.setHeader('Content-Type', contentType);
    if (cacheControl) res.setHeader('Cache-Control', cacheControl);
    if (connection) res.setHeader('Connection', connection);
    if (transferEncoding) res.setHeader('Transfer-Encoding', transferEncoding);

    if (req.body?.stream === true && upstream.body) {
      Readable.fromWeb(upstream.body).pipe(res);
      return;
    }

    const text = await upstream.text();
    res.send(text);
  } catch (error) {
    res.status(502).json({
      error: 'Proxy request failed',
      message: error?.message || 'Unknown proxy error'
    });
  }
});

app.listen(port, () => {
  const originsLabel = allowedOrigins.includes('*') ? '*' : allowedOrigins.join(', ');
  console.log(`[mcp-drop/proxy] Listening on http://localhost:${port}`);
  console.log(`[mcp-drop/proxy] Allowed origins: ${originsLabel}`);
});
