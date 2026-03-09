import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

class MCPBridge {
  constructor() {
    this._clients = new Map();
  }

  async connectStdio(name, command, args = []) {
    let client;
    try {
      const serverName = this._normalizeName(name);
      const normalizedCommand = String(command || '').trim();
      if (!normalizedCommand) {
        throw new Error('Command is required for stdio servers');
      }

      const transport = new StdioClientTransport({ command: normalizedCommand, args });
      client = new Client(
        { name: 'mcp-drop-bridge', version: '0.1.0' },
        { capabilities: {} }
      );
      await client.connect(transport);
      const { tools } = await client.listTools();
      await this._replaceClient(serverName, client);
      console.info(`[mcp-drop-bridge] Connected to "${serverName}" (${tools.length} tools)`);
      return tools;
    } catch (err) {
      try {
        await client?.close();
      } catch {}
      console.error(`[mcp-drop-bridge] Failed to connect to "${name}": ${err?.message || 'Unknown error'}`);
      throw err;
    }
  }

  async connectSSE(name, url) {
    let client;
    try {
      const serverName = this._normalizeName(name);
      const normalizedUrl = this._normalizeHttpUrl(url);
      const transport = new SSEClientTransport(new URL(normalizedUrl));
      client = new Client(
        { name: 'mcp-drop-bridge', version: '0.1.0' },
        { capabilities: {} }
      );
      await client.connect(transport);
      const { tools } = await client.listTools();
      await this._replaceClient(serverName, client);
      console.info(`[mcp-drop-bridge] Connected to "${serverName}" via SSE (${tools.length} tools)`);
      return tools;
    } catch (err) {
      try {
        await client?.close();
      } catch {}
      console.error(`[mcp-drop-bridge] Failed to connect to "${name}": ${err?.message || 'Unknown error'}`);
      throw err;
    }
  }

  async listTools(name) {
    const client = this._clients.get(name);
    if (!client) throw new Error(`Server "${name}" not connected`);
    try {
      const { tools } = await client.listTools();
      return tools;
    } catch (err) {
      throw new Error(`Failed to list tools from "${name}": ${err?.message || 'Unknown error'}`);
    }
  }

  async callTool(serverName, toolName, args) {
    const client = this._clients.get(serverName);
    if (!client) throw new Error(`Server "${serverName}" not connected`);
    try {
      return await client.callTool({ name: toolName, arguments: args });
    } catch (err) {
      throw new Error(`Tool "${toolName}" on "${serverName}" failed: ${err?.message || 'Unknown error'}`);
    }
  }

  getConnectedServers() {
    return Array.from(this._clients.keys());
  }

  async disconnectAll() {
    for (const [name, client] of this._clients) {
      try {
        await client.close();
        console.info(`[mcp-drop-bridge] Disconnected from "${name}"`);
      } catch {}
    }
    this._clients.clear();
  }

  _normalizeName(name) {
    const normalizedName = String(name || '').trim();
    if (!normalizedName) {
      throw new Error('Server name is required');
    }
    return normalizedName;
  }

  _normalizeHttpUrl(url) {
    let parsedUrl;
    try {
      parsedUrl = new URL(String(url || '').trim());
    } catch {
      throw new Error('A valid http:// or https:// URL is required');
    }

    if (!ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
      throw new Error(`Unsupported URL protocol: ${parsedUrl.protocol}`);
    }

    return parsedUrl.toString();
  }

  async _replaceClient(name, client) {
    const existingClient = this._clients.get(name);
    if (existingClient) {
      try {
        await existingClient.close();
      } catch {}
    }

    this._clients.set(name, client);
  }
}

export default MCPBridge;
