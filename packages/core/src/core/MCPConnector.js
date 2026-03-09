const STREAMABLE_HTTP = 'streamable-http';
const SSE = 'sse';
const BRIDGE = 'bridge';
const REMOTE = 'remote';
const JSON_RPC_VERSION = '2.0';
const DEFAULT_TIMEOUT_MS = 8000;
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const LARGE_RESULT_CACHE_THRESHOLD = 500;
let defaultInstance = null;

function stableStringify(value) {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }
  if (typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function serializeResult(result) {
  if (typeof result === 'string') return result;

  try {
    return JSON.stringify(result);
  } catch {
    return '';
  }
}

function normalizeToolCallResult(result) {
  if (!result || typeof result !== 'object') {
    return result;
  }

  if (Array.isArray(result.content)) {
    const textBlocks = result.content
      .filter((block) => block?.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text);

    if (textBlocks.length > 0) {
      return textBlocks.join('\n\n');
    }
  }

  if (typeof result.structuredContent === 'string') {
    return result.structuredContent;
  }

  return result;
}

class MCPConnector {

  constructor() {
    this._tools = [];
    this._statuses = {};
    this._connections = {};
    this._resultCache = new Map();
  }

  static createSession() {
    return new MCPConnector();
  }

  static get defaultInstance() {
    if (!defaultInstance) {
      defaultInstance = new MCPConnector();
    }
    return defaultInstance;
  }

  static async connect(servers = []) {
    return this.defaultInstance.connect(servers);
  }

  static disconnectAll() {
    this.defaultInstance.disconnectAll();
  }

  static get tools() {
    return this.defaultInstance.tools;
  }

  static get statuses() {
    return this.defaultInstance.statuses;
  }

  async connect(servers = []) {
    this.disconnectAll();
    this._tools = [];
    this._statuses = {};
    this._connections = {};
    this._resultCache.clear();

    const normalizedServers = Array.isArray(servers) ? servers : [];
    const seenNames = new Set();

    for (let index = 0; index < normalizedServers.length; index += 1) {
      const rawServer = normalizedServers[index];
      const statusKey = this._getStatusKey(rawServer, index);

      try {
        const server = this._normalizeServerConfig(rawServer, seenNames);
        const connection = await this._connectServer(server);
        this._connections[server.name] = connection;

        this._statuses[server.name] = {
          connected: true,
          error: null,
          toolCount: connection.tools.length,
          type: server.type || connection.transport,
          transport: connection.transport,
          url: server.url
        };

        connection.tools.forEach((tool) => {
          this._tools.push({
            name: tool.name,
            description: tool.description,
            input_schema: tool.inputSchema,
            execute: async (input = {}) => {
              if (connection.transport === STREAMABLE_HTTP) {
                return this._callToolWithCache(connection, tool.name, input, () =>
                  this._callStreamableTool(connection, tool.name, input)
                );
              }
              if (connection.transport === SSE) {
                return this._callToolWithCache(connection, tool.name, input, () =>
                  this._callSseTool(connection, tool.name, input)
                );
              }
              return this._callToolWithCache(connection, tool.name, input, () =>
                this._callBridgeTool(connection, tool.name, input)
              );
            }
          });
        });

        console.info(`[mcp-drop] Connected to ${server.name} via ${connection.transport}`);
      } catch (err) {
        this._statuses[statusKey] = {
          connected: false,
          error: err?.message || 'Connection failed',
          toolCount: 0,
          type: rawServer?.type || 'unknown',
          transport: null,
          url: rawServer?.url || null
        };
        console.warn(`[mcp-drop] Failed to connect to ${statusKey}: ${err?.message || 'Connection failed'}`);
      }
    }

    return [...this._tools];
  }

  disconnectAll() {
    Object.values(this._connections || {}).forEach((connection) => {
      connection.abortController?.abort();
      this._rejectPending(connection, new Error('Connection reset'));
    });
    this._connections = {};
    this._resultCache.clear();
  }

  get tools() {
    return [...this._tools];
  }

  get statuses() {
    return { ...this._statuses };
  }

  async _connectServer(server) {
    const attempts = this._getAttemptOrder(server).map((transport) => ({
      transport,
      fn: () => this._connectWithTransport(server, transport)
    }));
    const errors = [];

    for (const attempt of attempts) {
      try {
        return await attempt.fn();
      } catch (err) {
        errors.push(`${attempt.transport}: ${err?.message || 'Connection failed'}`);
      }
    }

    throw new Error(errors.join(' | '));
  }

  _getAttemptOrder(server) {
    switch (server.type) {
      case BRIDGE:
        return [BRIDGE];
      case STREAMABLE_HTTP:
        return [STREAMABLE_HTTP, SSE];
      case SSE:
        return [SSE, STREAMABLE_HTTP];
      case REMOTE:
        return [STREAMABLE_HTTP, SSE];
      default:
        return [STREAMABLE_HTTP, SSE, BRIDGE];
    }
  }

  async _connectWithTransport(server, transport) {
    if (transport === STREAMABLE_HTTP) return this._connectStreamableHttp(server);
    if (transport === SSE) return this._connectSse(server);
    return this._connectBridge(server);
  }

  async _connectStreamableHttp(server) {
    const connection = this._createConnection(server, STREAMABLE_HTTP);
    const response = await this._sendStreamableRequest(connection, {
      jsonrpc: JSON_RPC_VERSION,
      id: 1,
      method: 'tools/list',
      params: {}
    });
    const tools = response?.result?.tools;

    if (!Array.isArray(tools)) {
      throw new Error('Invalid tools/list response');
    }

    connection.tools = tools;
    connection.nextId = 2;
    return connection;
  }

  async _connectSse(server) {
    const connection = this._createConnection(server, SSE);
    connection.pending = new Map();
    connection.nextId = 2;
    connection.abortController = new AbortController();
    connection.ready = this._createDeferred();

    this._startSseListener(connection);

    try {
      await this._withTimeout(connection.ready.promise, DEFAULT_TIMEOUT_MS, 'SSE endpoint');
      const response = await this._sendSseRequest(connection, {
        jsonrpc: JSON_RPC_VERSION,
        id: 1,
        method: 'tools/list',
        params: {}
      });
      const tools = response?.result?.tools;

      if (!Array.isArray(tools)) {
        throw new Error('Invalid SSE tools/list response');
      }

      connection.tools = tools;
      return connection;
    } catch (err) {
      connection.abortController.abort();
      this._rejectPending(connection, err);
      throw err;
    }
  }

  async _connectBridge(server) {
    const connection = this._createConnection(server, BRIDGE);
    const data = await this._postJson(`${server.url}/tools/list`, connection, {
      jsonrpc: JSON_RPC_VERSION,
      id: 1,
      method: 'tools/list',
      params: {}
    });
    const tools = data?.result?.tools;

    if (!Array.isArray(tools)) {
      throw new Error('Invalid bridge tools/list response');
    }

    connection.tools = tools;
    connection.nextId = 2;
    return connection;
  }

  async _callStreamableTool(connection, name, input) {
    const response = await this._sendStreamableRequest(connection, {
      jsonrpc: JSON_RPC_VERSION,
      id: connection.nextId++,
      method: 'tools/call',
      params: { name, arguments: input }
    });
    return normalizeToolCallResult(response?.result);
  }

  async _callSseTool(connection, name, input) {
    const response = await this._sendSseRequest(connection, {
      jsonrpc: JSON_RPC_VERSION,
      id: connection.nextId++,
      method: 'tools/call',
      params: { name, arguments: input }
    });
    return normalizeToolCallResult(response?.result);
  }

  async _callBridgeTool(connection, name, input) {
    const data = await this._postJson(`${connection.url}/tools/call`, connection, {
      jsonrpc: JSON_RPC_VERSION,
      id: connection.nextId++,
      method: 'tools/call',
      params: { name, arguments: input }
    });
    return normalizeToolCallResult(data?.result);
  }

  async _callToolWithCache(connection, name, input, execute) {
    const cacheKey = `${connection.name}:${name}:${stableStringify(input || {})}`;
    const cached = this._resultCache.get(cacheKey);

    if (cached) {
      return cached.result;
    }

    const result = await execute();
    const serialized = serializeResult(result);

    if (serialized.length > LARGE_RESULT_CACHE_THRESHOLD) {
      this._resultCache.set(cacheKey, {
        result,
        size: serialized.length
      });
    }

    return result;
  }

  async _sendStreamableRequest(connection, payload) {
    const res = await fetch(connection.url, {
      method: 'POST',
      headers: this._getHeaders(connection, {
        accept: 'application/json, text/event-stream',
        includeJsonContentType: true
      }),
      body: JSON.stringify(payload)
    });

    this._captureSessionId(connection, res);

    if (!res.ok) {
      throw await this._extractResponseError(res);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      return this._withTimeout(
        this._waitForSseFetchResponse(res, payload.id),
        DEFAULT_TIMEOUT_MS,
        `Streamable HTTP response ${payload.id}`
      );
    }

    const data = await this._safeJson(res);
    if (data?.error) throw new Error(data.error.message || 'JSON-RPC error');
    return data;
  }

  async _sendSseRequest(connection, payload) {
    if (!connection.messageEndpoint) {
      throw new Error('SSE message endpoint not available');
    }

    const pending = this._createPendingRequest(connection, payload.id);

    try {
      const res = await fetch(connection.messageEndpoint, {
        method: 'POST',
        headers: this._getHeaders(connection, {
          accept: 'application/json, text/event-stream',
          includeJsonContentType: true
        }),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await this._extractResponseError(res);
        this._settlePendingRequest(connection, payload.id, { error: err });
        throw err;
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await this._safeJson(res);
        if (data?.error) {
          const err = new Error(data.error.message || 'JSON-RPC error');
          this._settlePendingRequest(connection, payload.id, { error: err });
          throw err;
        }
        this._settlePendingRequest(connection, payload.id, { result: data });
      } else if (contentType.includes('text/event-stream')) {
        try {
          const data = await this._waitForSseFetchResponse(res, payload.id);
          this._settlePendingRequest(connection, payload.id, { result: data });
        } catch (err) {
          this._settlePendingRequest(connection, payload.id, { error: err });
          throw err;
        }
      } else {
        const err = new Error(`Unsupported SSE response content type: ${contentType || 'unknown'}`);
        this._settlePendingRequest(connection, payload.id, { error: err });
        throw err;
      }

      return await this._withTimeout(pending.promise, DEFAULT_TIMEOUT_MS, `SSE response ${payload.id}`);
    } catch (err) {
      if (connection.pending?.has(String(payload.id))) {
        this._settlePendingRequest(connection, payload.id, { error: err });
      }
      throw err;
    }
  }

  async _startSseListener(connection) {
    try {
      const res = await fetch(connection.url, {
        method: 'GET',
        headers: this._getHeaders(connection, {
          accept: 'text/event-stream'
        }),
        signal: connection.abortController.signal
      });

      if (!res.ok) {
        throw await this._extractResponseError(res);
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
        throw new Error(`Expected text/event-stream, got ${contentType || 'unknown content type'}`);
      }

      await this._consumeSseStream(res, async (event) => {
        if (event.id) connection.lastEventId = event.id;

        if (event.event === 'endpoint') {
          connection.messageEndpoint = this._resolveEndpointUrl(connection.url, event.data);
          connection.ready.resolve(connection.messageEndpoint);
          return;
        }

        if (event.event !== 'message') return;

        const messages = this._parseJsonRpcMessages(event.data);
        messages.forEach((message) => this._handleSseMessage(connection, message));
      });

      if (!connection.ready.settled) {
        connection.ready.reject(new Error('SSE stream closed before endpoint event'));
      } else if (!connection.abortController.signal.aborted) {
        this._rejectPending(connection, new Error('SSE stream closed'));
      }
    } catch (err) {
      if (connection.abortController?.signal.aborted) return;
      if (!connection.ready.settled) {
        connection.ready.reject(err);
      }
      this._rejectPending(connection, err);
    }
  }

  _handleSseMessage(connection, message) {
    if (!message || message.id === undefined || message.id === null) return;

    if (message.error) {
      this._settlePendingRequest(connection, message.id, {
        error: new Error(message.error.message || 'JSON-RPC error')
      });
      return;
    }

    this._settlePendingRequest(connection, message.id, { result: message });
  }

  async _waitForSseFetchResponse(response, requestId) {
    return new Promise(async (resolve, reject) => {
      let settled = false;

      try {
        await this._consumeSseStream(response, async (event) => {
          const messages = this._parseJsonRpcMessages(event.data);
          for (const message of messages) {
            if (message?.id === requestId || String(message?.id) === String(requestId)) {
              settled = true;
              if (message.error) {
                reject(new Error(message.error.message || 'JSON-RPC error'));
              } else {
                resolve(message);
              }
              break;
            }
          }
        });

        if (!settled) {
          reject(new Error(`SSE stream ended before response ${requestId}`));
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  async _consumeSseStream(response, onEvent) {
    if (!response.body) {
      throw new Error('Response body is not readable');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let eventName = '';
    let eventId = '';
    let dataLines = [];

    const processLine = async (line) => {
      if (line === '') {
        await dispatch();
        return;
      }
      if (line.startsWith(':')) return;

      const separator = line.indexOf(':');
      const field = separator === -1 ? line : line.slice(0, separator);
      let fieldValue = separator === -1 ? '' : line.slice(separator + 1);
      if (fieldValue.startsWith(' ')) fieldValue = fieldValue.slice(1);

      if (field === 'event') eventName = fieldValue;
      if (field === 'data') dataLines.push(fieldValue);
      if (field === 'id') eventId = fieldValue;
    };

    const dispatch = async () => {
      if (!eventName && !eventId && dataLines.length === 0) return;
      const event = {
        event: eventName || 'message',
        id: eventId || null,
        data: dataLines.join('\n')
      };
      eventName = '';
      eventId = '';
      dataLines = [];
      await onEvent(event);
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';

        for (const line of lines) {
          await processLine(line);
        }

        if (done) {
          if (buffer.length > 0) {
            await processLine(buffer);
          }
          await dispatch();
          break;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async _postJson(url, connection, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: this._getHeaders(connection, {
        accept: 'application/json',
        includeJsonContentType: true
      }),
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw await this._extractResponseError(res);
    }

    const data = await this._safeJson(res);
    if (data?.error) throw new Error(data.error.message || 'JSON-RPC error');
    return data;
  }

  _createConnection(server, transport) {
    return {
      name: server.name,
      url: server.url,
      headers: server.headers,
      authorization: server.authorization,
      authToken: server.authToken,
      token: server.token,
      apiKey: server.apiKey,
      transport,
      tools: [],
      nextId: 1,
      sessionId: null
    };
  }

  _createDeferred() {
    const deferred = {
      settled: false,
      promise: null,
      resolve: null,
      reject: null
    };

    deferred.promise = new Promise((resolve, reject) => {
      deferred.resolve = (value) => {
        if (deferred.settled) return;
        deferred.settled = true;
        resolve(value);
      };
      deferred.reject = (error) => {
        if (deferred.settled) return;
        deferred.settled = true;
        reject(error);
      };
    });

    return deferred;
  }

  _createPendingRequest(connection, requestId) {
    const deferred = this._createDeferred();
    connection.pending.set(String(requestId), deferred);
    return deferred;
  }

  _settlePendingRequest(connection, requestId, { result, error }) {
    const key = String(requestId);
    const pending = connection.pending.get(key);
    if (!pending) return;

    connection.pending.delete(key);
    if (error) pending.reject(error);
    else pending.resolve(result);
  }

  _rejectPending(connection, error) {
    if (!connection.pending) return;
    for (const pending of connection.pending.values()) {
      pending.reject(error);
    }
    connection.pending.clear();
  }

  _captureSessionId(connection, response) {
    const sessionId = response.headers.get('Mcp-Session-Id');
    if (sessionId) {
      connection.sessionId = sessionId;
    }
  }

  _resolveEndpointUrl(baseUrl, rawData) {
    let endpoint = rawData.trim();
    try {
      const parsed = JSON.parse(endpoint);
      if (typeof parsed === 'string') endpoint = parsed;
    } catch {}
    const resolvedUrl = new URL(endpoint, baseUrl);
    if (!ALLOWED_PROTOCOLS.has(resolvedUrl.protocol)) {
      throw new Error(`Unsupported MCP endpoint protocol: ${resolvedUrl.protocol}`);
    }
    return resolvedUrl.toString();
  }

  _parseJsonRpcMessages(rawData) {
    if (!rawData) return [];

    try {
      const parsed = JSON.parse(rawData);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }

  async _extractResponseError(response) {
    const data = await this._safeJson(response);
    const err = new Error(data?.error?.message || `HTTP ${response.status}`);
    err.status = response.status;
    return err;
  }

  async _safeJson(response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  _normalizeServerConfig(server, seenNames) {
    if (!server || typeof server !== 'object') {
      throw new Error('Server config must be an object');
    }

    const name = String(server.name || '').trim();
    if (!name) {
      throw new Error('Server name is required');
    }
    if (seenNames.has(name)) {
      throw new Error(`Duplicate server name "${name}"`);
    }

    const rawUrl = String(server.url || '').trim();
    if (!rawUrl) {
      throw new Error(`Server "${name}" is missing a URL`);
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      throw new Error(`Server "${name}" has an invalid URL`);
    }

    if (!ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
      throw new Error(`Server "${name}" must use http:// or https://`);
    }

    const normalizedType = typeof server.type === 'string' && server.type.trim()
      ? server.type.trim()
      : BRIDGE;

    const normalizedServer = {
      ...server,
      name,
      url: parsedUrl.toString(),
      type: normalizedType
    };

    seenNames.add(name);
    return normalizedServer;
  }

  _getStatusKey(server, index) {
    const name = typeof server?.name === 'string' ? server.name.trim() : '';
    return name || `server-${index + 1}`;
  }

  _getHeaders(connection, { accept, includeJsonContentType = false } = {}) {
    const headers = {};
    if (accept) headers.Accept = accept;
    if (includeJsonContentType) headers['Content-Type'] = 'application/json';

    if (connection?.headers && typeof connection.headers === 'object') {
      Object.assign(headers, connection.headers);
    }

    if (!headers.Authorization) {
      const authValue = connection?.authorization || connection?.authToken || connection?.token || connection?.apiKey;
      if (authValue) {
        headers.Authorization = authValue.startsWith('Bearer ') || authValue.startsWith('Basic ')
          ? authValue
          : `Bearer ${authValue}`;
      }
    }

    if (connection?.sessionId) {
      headers['Mcp-Session-Id'] = connection.sessionId;
    }

    return headers;
  }

  async _withTimeout(promise, timeoutMs, label) {
    let timeoutId;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
        })
      ]);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export default MCPConnector;
