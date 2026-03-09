import express from 'express';
import cors from 'cors';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

class ProxyServer {
  constructor(bridge, port = 3333) {
    this._bridge = bridge;
    this._port = port;
    this._app = express();
    this._setupMiddleware();
    this._setupRoutes();
  }

  _setupMiddleware() {
    this._app.use(cors());
    this._app.use(express.json({ limit: '1mb' }));
  }

  _setupRoutes() {
    // Health check
    this._app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        servers: this._bridge.getConnectedServers(),
        version: '0.1.0'
      });
    });

    // List all tools from all servers
    this._app.post('/tools/list', async (req, res) => {
      try {
        const servers = this._bridge.getConnectedServers();
        const allTools = [];

        for (const serverName of servers) {
          const tools = await this._bridge.listTools(serverName);
          tools.forEach(tool => {
            allTools.push({
              name: `${serverName}__${tool.name}`,
              description: `[${serverName}] ${tool.description}`,
              inputSchema: tool.inputSchema
            });
          });
        }

        res.json({
          jsonrpc: '2.0',
          id: this._getRequestId(req),
          result: { tools: allTools }
        });
      } catch (err) {
        this._sendJsonRpcError(res, this._getRequestId(req), 500, -32000, err?.message || 'Failed to list tools');
      }
    });

    // Call a tool
    this._app.post('/tools/call', async (req, res) => {
      try {
        const requestId = this._getRequestId(req);
        const { name, arguments: args } = req.body.params || {};
        if (typeof name !== 'string' || !name.includes('__')) {
          this._sendJsonRpcError(res, requestId, 400, -32602, 'Tool name must be in the format "server__tool"');
          return;
        }

        // Parse server name from tool name (format: serverName__toolName)
        const separatorIndex = name.indexOf('__');
        const serverName = name.substring(0, separatorIndex);
        const toolName = name.substring(separatorIndex + 2);
        if (!serverName || !toolName) {
          this._sendJsonRpcError(res, requestId, 400, -32602, 'Tool name must include both server and tool segments');
          return;
        }

        const result = await this._bridge.callTool(serverName, toolName, args || {});

        res.json({
          jsonrpc: '2.0',
          id: requestId,
          result
        });
      } catch (err) {
        this._sendJsonRpcError(res, this._getRequestId(req), 500, -32000, err?.message || 'Failed to call tool');
      }
    });

    // Connect a new server at runtime
    this._app.post('/servers/connect', async (req, res) => {
      try {
        const { name, type, url, command, args } = req.body || {};
        const normalizedName = this._normalizeName(name);

        let tools;
        if (type === 'sse' || url) {
          const normalizedUrl = this._normalizeHttpUrl(url);
          tools = await this._bridge.connectSSE(normalizedName, normalizedUrl);
        } else if (type === 'stdio' || command) {
          const normalizedCommand = String(command || '').trim();
          if (!normalizedCommand) {
            throw new Error('Provide a command for stdio servers');
          }
          tools = await this._bridge.connectStdio(normalizedName, normalizedCommand, Array.isArray(args) ? args : []);
        } else {
          throw new Error('Provide either "url" (SSE) or "command" (stdio)');
        }

        res.json({ success: true, tools });
      } catch (err) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to connect server' });
      }
    });

    // List connected servers
    this._app.get('/servers', (req, res) => {
      res.json({ servers: this._bridge.getConnectedServers() });
    });
  }

  start() {
    this._app.listen(this._port, () => {
      console.info(`\n[mcp-drop-bridge] Running on http://localhost:${this._port}`);
      console.info(`[mcp-drop-bridge] Connected servers: ${this._bridge.getConnectedServers().join(', ') || 'none'}`);
      console.info(`[mcp-drop-bridge] Add to @mcp-drop/core:`);
      console.info(`[mcp-drop-bridge]   mcp-servers='[{"name":"bridge","url":"http://localhost:${this._port}}]'\n`);
    });
  }

  _getRequestId(req) {
    return req?.body?.id ?? 1;
  }

  _sendJsonRpcError(res, id, status, code, message) {
    res.status(status).json({
      jsonrpc: '2.0',
      id,
      error: { code, message }
    });
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
}

export default ProxyServer;
