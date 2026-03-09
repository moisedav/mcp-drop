# @mcp-drop/core

> Embeddable MCP-powered chat UI for the browser.

`@mcp-drop/core` exposes a custom element, `<mcp-drop>`, that renders a Claude-powered chat interface and can call MCP tools through one or more bridge URLs or remote MCP endpoints.

## Installation

### npm

```bash
npm install @mcp-drop/core
```

### CDN

```html
<script src="https://unpkg.com/@mcp-drop/core"></script>
```

## Quick Start

### Bundler usage

```js
import "@mcp-drop/core";
```

```html
<mcp-drop
  mcp-servers='[{"name":"bridge","url":"http://localhost:3333"}]'
  persist-key
></mcp-drop>
```

### Plain HTML usage

```html
<script src="https://unpkg.com/@mcp-drop/core"></script>

<mcp-drop
  mode="fullpage"
  title="mcp-drop"
  mcp-servers='[{"name":"bridge","url":"http://localhost:3333"}]'
  persist-key
  history
></mcp-drop>
```

## How It Works

1. The user types into `<mcp-drop>`.
2. The component sends messages directly from the browser to the Anthropic Messages API.
3. The component fetches tool definitions from the configured MCP URLs.
4. If Claude requests a tool, the component calls that tool through the active MCP transport.
5. The final assistant response is rendered in the chat UI.

## Requirements

- An Anthropic API key entered by the user in the UI.
- A running MCP endpoint, such as a bridge at `http://localhost:3333` or a remote HTTP/SSE MCP server.
- MCP URLs passed through the `mcp-servers` attribute as JSON.

## Usage Examples

### Floating widget

```html
<mcp-drop
  title="Assistant"
  mode="widget"
  mcp-servers='[{"name":"bridge","url":"http://localhost:3333"}]'
  persist-key
></mcp-drop>
```

### Full-page chat with history

```html
<mcp-drop
  mode="fullpage"
  title="Workspace Assistant"
  placeholder="Ask about files, design docs, or tools..."
  system-prompt="You are a helpful AI assistant with access to external tools via MCP (Model Context Protocol). Use the available tools when needed to help the user accomplish their tasks. Be concise and efficient."
  mcp-servers='[{"name":"bridge","url":"http://localhost:3333"}]'
  history
  persist-key
></mcp-drop>
```

### Multiple MCP endpoints

`mcp-servers` accepts an array of MCP endpoints. Each entry must contain `name` and `url`.

```html
<mcp-drop
  mcp-servers='[
    {"name":"local","url":"http://localhost:3333"},
    {"name":"remote","url":"http://localhost:4444"}
  ]'
></mcp-drop>
```

## Component API

### Custom element

The package registers this tag globally:

```html
<mcp-drop></mcp-drop>
```

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `mode` | `widget` \| `fullpage` | `widget` | Renders a floating chat widget or a full-page layout. |
| `title` | string | `mcp-drop` | Title shown in the header. |
| `placeholder` | string | `Type a message...` | Placeholder for the input box. |
| `system-prompt` | string | `You are a helpful AI assistant with access to external tools via MCP (Model Context Protocol). Use the available tools when needed to help the user accomplish their tasks. Be concise and efficient.` | System prompt sent to Claude. |
| `mcp-servers` | JSON string | none | Array of MCP endpoints in the form `[{"name":"bridge","url":"http://localhost:3333"}]`. |
| `persist-key` | boolean attribute | `false` | If present, stores the Anthropic API key in `localStorage`. |
| `history` | boolean attribute | `false` | If present, enables conversation persistence and the conversation sidebar in full-page mode. |

### `mcp-servers` format

`@mcp-drop/core` does not connect directly to stdio MCP servers. It connects to HTTP bridge endpoints that expose `/tools/list` and `/tools/call`, or to remote MCP endpoints that support Streamable HTTP or SSE.

```html
<mcp-drop
  mcp-servers='[
    {"name":"bridge","url":"http://localhost:3333"}
  ]'
></mcp-drop>
```

## Storage Behavior

When enabled, the component uses browser storage:

| Key | Used for |
|---|---|
| `mcp_chat_key` | Saved Anthropic API key when `persist-key` is present |
| `mcp_chat_conversations` | Saved conversation history when `history` is present |

## Exported JavaScript APIs

The package also exports helper modules for custom integrations.

```js
import {
  APIKeyManager,
  AnthropicClient,
  MCPConnector,
  ToolEngine
} from "@mcp-drop/core";
```

### `APIKeyManager`

Stores, reads, and clears the Anthropic API key.

```js
APIKeyManager.set("sk-ant-...", true);
const key = APIKeyManager.get();
APIKeyManager.clear();
```

### `AnthropicClient`

Sends chat messages to Anthropic and supports tool-calling loops.

```js
const reply = await AnthropicClient.sendWithTools({
  messages: [{ role: "user", content: "List my project files" }],
  tools: [],
  systemPrompt: "You are a helpful AI assistant with access to external tools via MCP (Model Context Protocol). Use the available tools when needed to help the user accomplish their tasks. Be concise and efficient."
});
```

Current implementation details:

- Model: `claude-sonnet-4-20250514`
- Max output tokens: `1024`
- Requests are made directly from the browser

### `MCPConnector`

Fetches available tools from configured bridge endpoints and returns executable tool objects.

```js
const tools = await MCPConnector.connect([
  { name: "bridge", url: "http://localhost:3333" }
]);
```

### `ToolEngine`

Simple in-memory tool registry for registering and executing tool objects.

```js
ToolEngine.register(tools);
const result = await ToolEngine.execute("bridge__read_file", { path: "/tmp/a.txt" });
```

## Development

From the monorepo root:

```bash
npm run dev --workspace=packages/core
```

Build the package:

```bash
npm run build --workspace=packages/core
```

Preview the built demo:

```bash
npm run preview --workspace=packages/core
```

## Notes

- The Anthropic API key is entered by the user inside the component UI.
- Tool execution requires at least one reachable bridge endpoint.
- `history` is most useful with `mode="fullpage"`, where the saved conversations are visible in the sidebar.

## License

MIT
