# @mcp-drop/bridge

> Local bridge server that connects `@mcp-drop/core` to MCP servers.

`@mcp-drop/bridge` is a small HTTP proxy that can:

- spawn local MCP servers over `stdio`
- connect to remote MCP servers over `SSE`
- expose all connected tools through a browser-friendly HTTP API

This is the component that allows `@mcp-drop/core` to use MCP tools from the browser.

## Installation

### Run directly with npx

```bash
npx @mcp-drop/bridge
```

### Install globally

```bash
npm install -g @mcp-drop/bridge
```

Then run:

```bash
mcp-drop-bridge
```

### Install in a project

```bash
npm install @mcp-drop/bridge
```

Run it locally:

```bash
npx mcp-drop-bridge
```

## Quick Start

Start the bridge:

```bash
npx @mcp-drop/bridge
```

Then point `@mcp-drop/core` at it:

```html
<mcp-drop
  mcp-servers='[{"name":"bridge","url":"http://localhost:3333"}]'
></mcp-drop>
```

## CLI Usage

```bash
npx @mcp-drop/bridge [--server name,command,arg1,arg2] [--sse name,url]
```

You can repeat `--server` and `--sse` multiple times.

### Options

| Flag | Format | Description |
|---|---|---|
| `--server` | `name,command,arg1,arg2,...` | Connects a local MCP server over stdio by spawning a process. |
| `--sse` | `name,url` | Connects a remote MCP server exposed over SSE. |

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3333` | Port used by the HTTP bridge server. |

## Usage Examples

### Start with no MCP servers

```bash
npx @mcp-drop/bridge
```

### Connect a local filesystem server

```bash
npx @mcp-drop/bridge \
  --server "filesystem,npx,-y,@modelcontextprotocol/server-filesystem,/Users/you/workspace"
```

### Connect a remote SSE server

```bash
npx @mcp-drop/bridge \
  --sse "myserver,https://your-mcp-server.example/sse"
```

### Connect multiple servers at startup

```bash
npx @mcp-drop/bridge \
  --server "filesystem,npx,-y,@modelcontextprotocol/server-filesystem,/Users/you/workspace" \
  --server "github,npx,-y,@modelcontextprotocol/server-github" \
  --sse "figma,https://your-mcp-server.example/sse"
```

### Run on a custom port

```bash
PORT=4444 npx @mcp-drop/bridge
```

### Connect a custom MCP server you wrote

```bash
npx @mcp-drop/bridge \
  --server "hello,node,/absolute/path/to/hello-server.js"
```

## How Tool Names Work

The bridge namespaces tool names by server.

If the connected server is named `filesystem` and it exposes a tool named `read_file`, the bridge returns it as:

```text
filesystem__read_file
```

This lets multiple MCP servers expose similarly named tools without collisions.

## HTTP API

The bridge exposes an HTTP API used by `@mcp-drop/core`.

### `GET /health`

Returns bridge status and connected server names.

Example response:

```json
{
  "status": "ok",
  "servers": ["filesystem", "github"],
  "version": "0.1.0"
}
```

### `GET /servers`

Returns the list of connected server names.

Example response:

```json
{
  "servers": ["filesystem", "github"]
}
```

### `POST /tools/list`

Returns all tools from all connected servers in JSON-RPC format.

Example request:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

Example response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "filesystem__read_file",
        "description": "[filesystem] Read a file",
        "inputSchema": {
          "type": "object"
        }
      }
    ]
  }
}
```

### `POST /tools/call`

Calls a tool on a connected server.

Example request:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "filesystem__read_file",
    "arguments": {
      "path": "/tmp/example.txt"
    }
  }
}
```

The `name` field must use the `serverName__toolName` format.

### `POST /servers/connect`

Connects a new MCP server at runtime.

For stdio:

```json
{
  "name": "filesystem",
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/you/workspace"]
}
```

For SSE:

```json
{
  "name": "remote",
  "type": "sse",
  "url": "https://your-mcp-server.example/sse"
}
```

Success response:

```json
{
  "success": true,
  "tools": []
}
```

## Integration with `@mcp-drop/core`

Point the chat component to the bridge URL:

```html
<mcp-drop
  mcp-servers='[{"name":"bridge","url":"http://localhost:3333"}]'
  persist-key
></mcp-drop>
```

If you run the bridge on a different port, use that port in the `url`.

## Development

From the monorepo root:

```bash
npm run bridge
```

Or directly in the package:

```bash
npm run start --workspace=packages/bridge
```

## Notes

- The bridge handles MCP connectivity; it does not proxy Anthropic API requests.
- Browser clients talk to the bridge over HTTP with CORS enabled.
- Connected servers are kept in memory and disconnected on process shutdown.
- `Ctrl+C` triggers a graceful shutdown and closes connected MCP clients.

## License

MIT
