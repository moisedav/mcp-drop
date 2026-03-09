# @mcp-drop/proxy

Proxy server for `@mcp-drop/core` that keeps your Anthropic API key out of the browser.

## Why use it

Without a proxy, the browser talks directly to Anthropic and needs an API key client-side. `@mcp-drop/proxy` keeps that key on the server and forwards requests safely.

## Install

```bash
npm install @mcp-drop/proxy
```

## Environment variables

```bash
ANTHROPIC_API_KEY=your_key_here
PORT=3334
ALLOWED_ORIGINS=http://localhost:5173,https://your-app.com
```

- `ANTHROPIC_API_KEY`: required
- `PORT`: optional, defaults to `3334`
- `ALLOWED_ORIGINS`: optional, defaults to `*`

## Run locally

```bash
ANTHROPIC_API_KEY=your_key_here npm start --workspace=packages/proxy
```

Health check:

```bash
curl http://localhost:3334/health
```

## Use with @mcp-drop/core

Point the web component at your proxy with the `api-proxy` attribute:

```html
<script src="https://unpkg.com/@mcp-drop/core"></script>

<mcp-drop
  api-proxy="http://localhost:3334"
  mcp-servers='[{"name":"bridge","url":"http://localhost:3333"}]'
></mcp-drop>
```

When `api-proxy` is set, `@mcp-drop/core` sends message requests to `{api-proxy}/v1/messages` instead of Anthropic directly.

## Deploy

### Vercel

- Create a Node deployment from this package.
- Set `ANTHROPIC_API_KEY` and `ALLOWED_ORIGINS` in project env vars.
- Expose `server.js` as the runtime entrypoint.

### Railway

- Deploy the `packages/proxy` folder as a Node service.
- Set `ANTHROPIC_API_KEY`, `PORT`, and `ALLOWED_ORIGINS`.
- Railway will provide the public URL for your `api-proxy` attribute.

### Cloudflare Workers

Cloudflare Workers do not run Express directly. Reuse the same forwarding logic from `server.js` in a Worker `fetch()` handler:

- read `ANTHROPIC_API_KEY` from Worker secrets
- validate `Origin` against your allowlist
- forward `POST /v1/messages` to `https://api.anthropic.com/v1/messages`
- stream SSE back to the browser when `stream: true`

## Endpoints

- `GET /health` → `{ "status": "ok", "proxy": true }`
- `POST /v1/messages` → forwards message requests to Anthropic, including streaming

## License

MIT
