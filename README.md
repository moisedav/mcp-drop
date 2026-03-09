# mcp-drop

> Connect Claude to anything. Drop it anywhere.

**🚀 [Try the live demo →](https://moisedav.github.io/mcp-drop)**

![License](https://img.shields.io/badge/license-MIT-blue)
[![npm](https://img.shields.io/npm/v/@mcp-drop/core?color=e8622a)](https://www.npmjs.com/package/@mcp-drop/core)
[![demo](https://img.shields.io/badge/demo-live-green)](https://moisedav.github.io/mcp-drop)
[![GitHub stars](https://img.shields.io/github/stars/moisedav/mcp-drop?style=social)](https://github.com/moisedav/mcp-drop)

## Preview

![mcp-drop demo](./docs/preview.png)

## What is mcp-drop?

**mcp-drop** is an open-source toolkit that lets you embed a fully functional AI chat interface — powered by Claude and MCP — into any web application with a single HTML tag.

Connect Claude to browser-first tools like GitHub, Notion, Slack, Figma, Google Drive, and your own internal apps.

No Claude Desktop. No Cursor. Just your app.

```html
<script src="@mcp-drop/core"></script>

<mcp-drop
  mcp-servers='[{"name":"bridge","url":"http://localhost:3333"}]'
  persist-key
></mcp-drop>
```

## How it works

```
[User types in chat]
        ↓
[@mcp-drop/core — Chat UI]
        ↓
[Anthropic API — Claude]
        ↓
[@mcp-drop/bridge — Local bridge]
        ↓
[Any MCP Server — GitHub, Notion, Slack, Figma, DB, etc.]
        ↓
[Your app gets modified]
```

## Packages

| Package | Description |
|---|---|
| [`@mcp-drop/core`](./packages/core) | Embeddable Web Component chat UI |
| [`@mcp-drop/bridge`](./packages/bridge) | Local bridge server for MCP connections |
| [`@mcp-drop/proxy`](./packages/proxy) | Lightweight Anthropic proxy that keeps the API key off the client |

## Prerequisites

- **Anthropic API key** — Get one at [console.anthropic.com](https://console.anthropic.com) if you are calling Anthropic directly from the browser
- **Node.js 18+** — Required to run `@mcp-drop/bridge` locally

## Quick Start

**1 — Start the bridge**

```bash
npx @mcp-drop/bridge
```

**2 — Add to your app**

```html
<script src="https://unpkg.com/@mcp-drop/core"></script>

<mcp-drop
  mode="fullpage"
  mcp-servers='[{"name":"bridge","url":"http://localhost:3333"}]'
  persist-key
></mcp-drop>
```

**3 — Enter your Anthropic API key in the chat and start typing**

## Modes

```html
<!-- Widget — floating button in corner -->
<mcp-drop mode="widget"></mcp-drop>

<!-- Full page — like claude.ai -->
<mcp-drop mode="fullpage" history></mcp-drop>
```

## Connect MCP servers

`@mcp-drop/core` can connect to a local `@mcp-drop/bridge` instance or to remote MCP endpoints over HTTP/SSE. Use the bridge when you need browser access to local stdio-based tools.

### 1. Local MCP server via stdio (with bridge)

Use this for local tools such as filesystem, git, databases, or any MCP server that runs as a CLI process.

```bash
npx @mcp-drop/bridge \
  --server "filesystem,npx,-y,@modelcontextprotocol/server-filesystem,/your/folder"
```

### 2. Remote MCP server via HTTP/SSE

Use this when your MCP server is already running somewhere and exposes an HTTP or SSE MCP endpoint.

```bash
npx @mcp-drop/bridge \
  --sse "myserver,https://your-mcp-server.example/sse"
```

### 3. Custom MCP server written by you

You can build your own server with the official MCP TypeScript SDK and let the bridge spawn it for you.

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "hello-server",
  version: "1.0.0"
});

server.registerTool(
  "hello",
  {
    description: "Return a greeting",
    inputSchema: {
      name: z.string()
    }
  },
  async ({ name }) => ({
    content: [{ type: "text", text: `Hello, ${name}!` }]
  })
);

await server.connect(new StdioServerTransport());
```

Run it through the bridge:

```bash
npx @mcp-drop/bridge \
  --server "hello,node,/absolute/path/to/hello-server.js"
```

## Popular MCP Servers

Examples below show common MCP servers users connect to with `mcp-drop`. Popular browser-native workflows include GitHub, Notion, Slack, Figma, Google Drive-style document tools, and your own hosted MCP apps.

### Filesystem

```bash
npx @mcp-drop/bridge \
  --server "filesystem,npx,-y,@modelcontextprotocol/server-filesystem,/Users/you/workspace"
```

### GitHub

```bash
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token \
npx @mcp-drop/bridge \
  --server "github,npx,-y,@modelcontextprotocol/server-github"
```

### PostgreSQL

```bash
POSTGRES_CONNECTION_STRING=postgres://user:password@localhost:5432/app \
npx @mcp-drop/bridge \
  --server "postgres,npx,-y,@modelcontextprotocol/server-postgres"
```

### Notion

```bash
NOTION_TOKEN=ntn_your_token \
npx @mcp-drop/bridge \
  --server "notion,npx,-y,@modelcontextprotocol/server-notion"
```

### Figma

```bash
FIGMA_API_KEY=figd_your_token \
npx @mcp-drop/bridge \
  --sse "figma,https://mcp.figma.com/sse"
```

### Slack

```bash
SLACK_BOT_TOKEN=xoxb-your-token \
SLACK_TEAM_ID=T01234567 \
npx @mcp-drop/bridge \
  --server "slack,npx,-y,@modelcontextprotocol/server-slack"
```

### Any custom MCP server

You can connect any MCP server that speaks stdio, Streamable HTTP, or SSE. For example, run your own local server through the bridge:

```bash
npx @mcp-drop/bridge \
  --server "custom,node,/absolute/path/to/your-server.js"
```

## Options

| Attribute | Type | Default | Description |
|---|---|---|---|
| `mode` | `widget` \| `fullpage` | `widget` | Display mode |
| `title` | string | `mcp-drop` | Chat title |
| `system-prompt` | string | — | Custom system prompt |
| `api-proxy` | URL string | — | Optional proxy base URL for forwarding Anthropic requests server-side. |
| `mcp-servers` | JSON string | — | MCP servers to connect |
| `placeholder` | string | `Type a message...` | Input placeholder |
| `persist-key` | boolean | `false` | Save API key in localStorage |
| `history` | boolean | `false` | Enable conversation history |

## License

MIT © mcp-drop

Built by [@moise](https://x.com/moisegdesign)
