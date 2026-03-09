const z = {
  _key: null,
  _emitChange() {
    try {
      window.dispatchEvent(new CustomEvent("mcp-drop:keychange"));
    } catch {
    }
  },
  set(r, t = !1) {
    const e = typeof r == "string" ? r.trim() : "";
    if (this._key = e || null, t && e)
      try {
        localStorage.setItem("mcp_chat_key", e);
      } catch {
      }
    this._emitChange();
  },
  get(r = {}) {
    const { includeStorage: t = !0 } = typeof r == "boolean" ? { includeStorage: r } : r;
    if (this._key) return this._key;
    if (!t) return null;
    try {
      const e = localStorage.getItem("mcp_chat_key");
      return e ? e.trim() : null;
    } catch {
      return null;
    }
  },
  clear() {
    this._key = null;
    try {
      localStorage.removeItem("mcp_chat_key");
    } catch {
    }
    this._emitChange();
  }
}, q = "Be concise. When tools return large data (XML, JSON, HTML), extract only what is needed for the user's request. Never repeat large data blocks back to the user. If you need specific details, call the tool again with more specific parameters. When the user asks you to modify code, content, or design, inspect only the minimum necessary context and then act. Do not narrate your internal search process to the user. If you already have enough context to make the change, make it directly. For edit requests, prefer one focused inspection and then perform the edit immediately.", b = `You are a helpful AI assistant with access to external tools via MCP (Model Context Protocol). Use the available tools when needed to help the user accomplish their tasks. Be concise and efficient.

${q}`, bt = "https://api.anthropic.com/v1/messages", xt = "claude-sonnet-4-20250514", wt = 4096, ht = 3e3, O = 2e4, G = 8, Z = 24, Q = 24e3, Ct = 8, St = 15, At = 2;
function kt(r) {
  return new Promise((t) => setTimeout(t, r));
}
function k(r) {
  return r == null ? JSON.stringify(r) : Array.isArray(r) ? `[${r.map((t) => k(t)).join(",")}]` : typeof r == "object" ? `{${Object.keys(r).sort().map((t) => `${JSON.stringify(t)}:${k(r[t])}`).join(",")}}` : JSON.stringify(r);
}
function Tt(r) {
  if (typeof r == "string") return r;
  try {
    return JSON.stringify(r, null, 2);
  } catch {
    return JSON.stringify({ error: "Tool result could not be serialized" });
  }
}
function Et(r) {
  if (r.length > O) {
    const t = r.length - O;
    return `${r.slice(0, O)}

[truncated ${t} chars - ask for specific details]`;
  }
  return r.length > ht ? `${r}

[large result: ${r.length} chars - ask for specific details if needed]` : r;
}
function F(r) {
  return r.json().catch(() => null);
}
function m(r, t) {
  const e = new Error(r);
  return t && (e.status = t), e;
}
async function Rt(r) {
  const t = await F(r), e = r.status;
  return e === 429 ? m("Too much data was sent at once. Try a more specific question.", e) : e === 401 ? m("Your API key seems invalid. Check Settings to update it.", e) : e >= 500 ? m("Anthropic servers are having issues. Try again in a moment.", e) : m(t?.error?.message || `HTTP ${e}`, e);
}
function $t(r) {
  return {
    "Content-Type": "application/json",
    "x-api-key": r,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true"
  };
}
function ut(r = b) {
  const t = typeof r == "string" && r.trim() ? r.trim() : b;
  return t.includes(q) ? t : `${t}

${q}`;
}
function tt({ messages: r, tools: t, systemPrompt: e, stream: s = !1 }) {
  return {
    model: xt,
    max_tokens: wt,
    system: ut(e),
    messages: r,
    stream: s,
    ...t.length > 0 && { tools: t }
  };
}
function It() {
  return {
    stop_reason: null,
    content: []
  };
}
function W(r) {
  if (!r || typeof r != "object") return r;
  const t = { ...r };
  return delete t._inputJsonBuffer, t;
}
function gt(r) {
  if (!r || r.type !== "tool_use") return W(r);
  const t = W(r), e = typeof r._inputJsonBuffer == "string" ? r._inputJsonBuffer : "";
  if (e)
    try {
      t.input = JSON.parse(e);
    } catch {
      t.input = { raw: e };
    }
  else (!t.input || typeof t.input != "object") && (t.input = {});
  return t;
}
function et(r = []) {
  return r.filter(Boolean).map((t) => gt(t));
}
function st(r = []) {
  return r.filter((t) => t?.type === "text").map((t) => t.text || "").join("");
}
function zt(r) {
  return r === !1 ? { allowed: !1, alwaysAllow: !1 } : r === !0 || r === void 0 || r === null ? { allowed: !0, alwaysAllow: !1 } : typeof r == "object" ? {
    allowed: r.allowed !== !1,
    alwaysAllow: !!r.alwaysAllow
  } : { allowed: !0, alwaysAllow: !1 };
}
function mt(r) {
  return Math.ceil(String(r || "").length / 4);
}
function ft(r, { includeToolResults: t = !0 } = {}) {
  return typeof r == "string" ? r : Array.isArray(r) ? r.map((e) => !e || typeof e != "object" ? "" : e.type === "text" ? e.text || "" : e.type === "tool_use" ? `Tool call: ${e.name || "unknown tool"}` : e.type === "tool_result" ? t ? typeof e.content == "string" ? e.content : k(e.content) : "Earlier tool result omitted to save tokens." : "").filter(Boolean).join(`
`) : "";
}
function Ot(r) {
  if (!r || typeof r != "object") return null;
  if (typeof r.content == "string")
    return { role: r.role, content: r.content };
  if (!Array.isArray(r.content))
    return { role: r.role, content: "" };
  const t = r.content.map((e) => !e || typeof e != "object" ? null : { ...e }).filter(Boolean);
  return t.length === 0 ? null : { role: r.role, content: t };
}
function rt(r) {
  return Array.isArray(r?.content) && r.content.some((t) => t?.type === "tool_use");
}
function L(r) {
  return Array.isArray(r?.content) && r.content.some((t) => t?.type === "tool_result");
}
function Mt(r) {
  return Array.isArray(r?.content) ? new Set(
    r.content.filter((t) => t?.type === "tool_use" && t.id).map((t) => String(t.id))
  ) : /* @__PURE__ */ new Set();
}
function Pt(r = []) {
  const t = [];
  for (const e of r) {
    const s = Ot(e);
    if (!s) continue;
    if (s.role !== "user" || !Array.isArray(s.content)) {
      t.push(s);
      continue;
    }
    if (!s.content.some((l) => l?.type === "tool_result")) {
      t.push(s);
      continue;
    }
    const o = t[t.length - 1], n = Mt(o), a = s.content.filter((l) => l?.type !== "tool_result" ? !0 : n.has(String(l.tool_use_id || "")));
    a.length !== s.content.length && console.warn("[mcp-drop] Removed orphaned tool_result blocks before sending to Anthropic."), a.length !== 0 && t.push({
      ...s,
      content: a
    });
  }
  return t;
}
function Ht(r = []) {
  const t = [];
  for (let e = 0; e < r.length; ) {
    const s = r[e];
    if (!s) {
      e += 1;
      continue;
    }
    const i = r[e + 1], o = r[e + 2];
    if (s.role === "user" && i?.role === "assistant" && rt(i) && o?.role === "user" && L(o)) {
      t.push({
        messages: [s, i, o],
        startIndex: e,
        endIndex: e + 2,
        hasToolResults: !0
      }), e += 3;
      continue;
    }
    if (s.role === "assistant" && rt(s) && i?.role === "user" && L(i)) {
      t.push({
        messages: [s, i],
        startIndex: e,
        endIndex: e + 1,
        hasToolResults: !0
      }), e += 2;
      continue;
    }
    if (s.role === "user" && i?.role === "assistant") {
      t.push({
        messages: [s, i],
        startIndex: e,
        endIndex: e + 1,
        hasToolResults: !1
      }), e += 2;
      continue;
    }
    t.push({
      messages: [s],
      startIndex: e,
      endIndex: e,
      hasToolResults: L(s)
    }), e += 1;
  }
  return t;
}
function v(r = []) {
  return r.flatMap((t) => t.messages);
}
function j(r) {
  const t = [];
  for (const s of r) {
    const i = s.role === "assistant" ? "Assistant" : "User", o = ft(s.content, { includeToolResults: !1 }).replace(/\s+/g, " ").trim();
    if (o && (t.push(`${i}: ${o.slice(0, 180)}`), t.length >= 6))
      break;
  }
  return {
    role: "assistant",
    content: `Context from earlier conversation:
${t.length > 0 ? t.join(`
`) : "Earlier context was compressed to save tokens."}`
  };
}
function Bt(r) {
  return r ? mt(ft(r.content)) : 0;
}
function w({ messages: r = [], systemPrompt: t = b }) {
  const e = r.reduce((s, i) => s + Bt(i), 0);
  return mt(ut(t)) + e;
}
function K(r = [], t = b) {
  const e = Pt(Array.isArray(r) ? r : []), s = Ht(e), i = Math.max(0, e.length - Ct), o = [], n = [];
  for (const c of s)
    c.hasToolResults && c.endIndex < i ? o.push(c) : n.push(c);
  let a = v(n), l = w({ messages: a, systemPrompt: t });
  for (; n.length > 0 && (a.length > Z || l > Q); )
    o.push(n.shift()), a = v(n), l = w({ messages: a, systemPrompt: t });
  for (o.length > 0 && (a = [
    j(v(o)),
    ...v(n)
  ], l = w({ messages: a, systemPrompt: t })); a.length > Z && n.length > 0; )
    o.push(n.shift()), a = [
      j(v(o)),
      ...v(n)
    ], l = w({ messages: a, systemPrompt: t });
  for (; l > Q && n.length > 0; )
    o.push(n.shift()), a = [
      j(v(o)),
      ...v(n)
    ], l = w({ messages: a, systemPrompt: t });
  return {
    messages: a,
    estimatedTokens: l
  };
}
async function it(r) {
  for (let t = St; t >= 1; t -= 1) {
    if (r)
      try {
        r(t);
      } catch {
      }
    await kt(1e3);
  }
  if (r)
    try {
      r(0);
    } catch {
    }
}
async function ot(r, { onRetryCountdown: t } = {}) {
  const e = z.get({ includeStorage: !0 });
  if (!e) throw m("Your API key seems invalid. Check Settings to update it.", 401);
  let s = !0;
  for (; ; )
    try {
      const i = await fetch(bt, {
        method: "POST",
        headers: $t(e),
        body: JSON.stringify(r)
      });
      if (i.status === 429 && s) {
        s = !1, await it(t);
        continue;
      }
      if (!i.ok)
        throw await Rt(i);
      return i;
    } catch (i) {
      if (i?.status === 429 && s) {
        s = !1, await it(t);
        continue;
      }
      throw i?.status ? i : m("Connection failed. Check your internet connection.");
    }
}
async function Lt(r, t) {
  if (!r.body)
    throw m("Connection failed. Check your internet connection.");
  const e = r.body.getReader(), s = new TextDecoder();
  let i = "", o = "", n = [];
  const a = async () => {
    if (!o && n.length === 0) return;
    const c = {
      event: o || "message",
      data: n.join(`
`)
    };
    o = "", n = [], await t(c);
  }, l = async (c) => {
    if (c === "") {
      await a();
      return;
    }
    if (c.startsWith(":")) return;
    const d = c.indexOf(":"), h = d === -1 ? c : c.slice(0, d);
    let u = d === -1 ? "" : c.slice(d + 1);
    u.startsWith(" ") && (u = u.slice(1)), h === "event" && (o = u), h === "data" && n.push(u);
  };
  try {
    for (; ; ) {
      const { value: c, done: d } = await e.read();
      i += s.decode(c || new Uint8Array(), { stream: !d });
      const h = i.split(/\r?\n/);
      i = h.pop() || "";
      for (const u of h)
        await l(u);
      if (d) {
        i && await l(i), await a();
        break;
      }
    }
  } finally {
    e.releaseLock();
  }
}
const nt = {
  async send({ messages: r, tools: t = [], systemPrompt: e = b, onRetryCountdown: s } = {}) {
    try {
      const i = K(r, e), o = await ot(
        tt({
          messages: i.messages,
          tools: t,
          systemPrompt: e,
          stream: !1
        }),
        { onRetryCountdown: s }
      );
      return await F(o) || {};
    } catch (i) {
      throw m(i?.message || "Anthropic request failed", i?.status);
    }
  },
  async stream({
    messages: r,
    tools: t = [],
    systemPrompt: e = b,
    onTextDelta: s,
    onRetryCountdown: i
  } = {}) {
    try {
      const o = K(r, e), n = await ot(
        tt({
          messages: o.messages,
          tools: t,
          systemPrompt: e,
          stream: !0
        }),
        { onRetryCountdown: i }
      ), a = n.headers.get("content-type") || "";
      if (a.includes("application/json")) {
        const c = await F(n) || {}, d = st(c.content);
        if (d && s)
          try {
            s(d);
          } catch {
          }
        return c;
      }
      if (!a.includes("text/event-stream"))
        throw m(`Expected text/event-stream, got ${a || "unknown content type"}`);
      const l = It();
      return await Lt(n, async (c) => {
        await this._handleStreamEvent(l, c, s);
      }), {
        stop_reason: l.stop_reason,
        content: et(l.content)
      };
    } catch (o) {
      throw m(o?.message || "Anthropic streaming request failed", o?.status);
    }
  },
  async sendWithTools({
    messages: r,
    tools: t = [],
    systemPrompt: e,
    onTextDelta: s,
    onToolCall: i,
    onToolApproval: o,
    onRetryCountdown: n
  }) {
    try {
      const a = t.map((g) => ({
        name: g.name,
        description: g.description,
        input_schema: g.input_schema
      }));
      let l = [...r], c = 0, d = "";
      const h = /* @__PURE__ */ new Map(), u = /* @__PURE__ */ new Map();
      for (; c < G; ) {
        c += 1;
        let g = "";
        const f = [], vt = K(l, e), T = await this.stream({
          messages: vt.messages,
          tools: a,
          systemPrompt: e,
          onRetryCountdown: n,
          onTextDelta: (p) => {
            p && (g += p, f.push(p));
          }
        });
        if (T.stop_reason !== "tool_use") {
          if (d += g, s && f.length > 0) {
            let p = d.slice(0, d.length - g.length);
            for (const C of f) {
              p += C;
              try {
                s({ delta: C, text: p });
              } catch {
              }
            }
          }
          return d || st(T.content);
        }
        const _t = { role: "assistant", content: T.content }, yt = (T.content || []).filter((p) => p.type === "tool_use"), E = [];
        for (const p of yt) {
          const C = `${p.name}:${k(p.input || {})}`, Y = (u.get(C) || 0) + 1;
          if (u.set(C, Y), Y > At) {
            E.push({
              type: "tool_result",
              tool_use_id: p.id,
              content: "This exact tool call was already used multiple times. Use the context you already gathered and make the requested change directly. If more data is needed, call a more specific tool with narrower parameters.",
              is_error: !0
            });
            continue;
          }
          const R = t.find((B) => B.name === p.name);
          if (!(await this._requestToolApproval(p, R, o)).allowed) {
            E.push({
              type: "tool_result",
              tool_use_id: p.id,
              content: `Tool "${p.name}" was denied by the user.`,
              is_error: !0
            });
            continue;
          }
          if (i)
            try {
              i(p.name);
            } catch {
            }
          let P = { error: `Tool "${p.name}" not found` }, H = !R;
          if (R)
            try {
              P = await R.execute(p.input || {}), H = !1;
            } catch (B) {
              P = { error: B?.message || `Tool "${p.name}" failed` }, H = !0;
            }
          const S = Tt(P), X = `${p.name}:${k(p.input || {})}`, $ = h.get(X);
          let I;
          $ && $.raw === S && $.optimizedContent ? I = $.optimizedContent : (I = Et(S), (S.length > ht || S.length > O) && h.set(X, {
            raw: S,
            optimizedContent: I
          })), E.push({
            type: "tool_result",
            tool_use_id: p.id,
            content: I,
            ...H ? { is_error: !0 } : {}
          });
        }
        l = [
          ...l,
          _t,
          { role: "user", content: E }
        ];
      }
      throw m(`Tool loop exceeded ${G} rounds`);
    } catch (a) {
      throw m(a?.message || "Anthropic tool execution failed", a?.status);
    }
  },
  estimateConversationTokens({ messages: r = [], systemPrompt: t = b } = {}) {
    return w({ messages: r, systemPrompt: t });
  },
  async _requestToolApproval(r, t, e) {
    if (!e)
      return { allowed: !0, alwaysAllow: !1 };
    const s = await e({
      name: r.name,
      description: t?.description || "",
      input: r.input || {},
      inputSchema: t?.input_schema || {}
    });
    return zt(s);
  },
  async _handleStreamEvent(r, t, e) {
    if (t.event === "ping") return;
    let s = null;
    if (t.data)
      try {
        s = JSON.parse(t.data);
      } catch {
        s = null;
      }
    if (t.event === "error")
      throw m(s?.error?.message || s?.message || "Anthropic streaming error");
    if (!(!s || typeof s != "object")) {
      if (t.event === "message_start") {
        r.stop_reason = s.message?.stop_reason || r.stop_reason;
        return;
      }
      if (t.event === "content_block_start") {
        const i = W(s.content_block || {});
        if (i.type === "text" && (i.text = typeof i.text == "string" ? i.text : "", i.text && e))
          try {
            e(i.text);
          } catch {
          }
        i.type === "tool_use" && (i.input = i.input && typeof i.input == "object" ? i.input : {}, i._inputJsonBuffer = ""), r.content[s.index] = i;
        return;
      }
      if (t.event === "content_block_delta") {
        const i = r.content[s.index] || { type: "text", text: "" }, o = s.delta || {};
        if (o.type === "text_delta" && (i.type = "text", i.text = `${i.text || ""}${o.text || ""}`, o.text && e))
          try {
            e(o.text);
          } catch {
          }
        o.type === "input_json_delta" && (i.type = "tool_use", i._inputJsonBuffer = `${i._inputJsonBuffer || ""}${o.partial_json || ""}`), r.content[s.index] = i;
        return;
      }
      if (t.event === "content_block_stop") {
        r.content[s.index] = gt(r.content[s.index]);
        return;
      }
      if (t.event === "message_delta") {
        r.stop_reason = s.delta?.stop_reason || r.stop_reason;
        return;
      }
      t.event === "message_stop" && (r.content = et(r.content));
    }
  }
}, _ = "streamable-http", y = "sse", A = "bridge", jt = "remote", x = "2.0", J = 8e3, at = /* @__PURE__ */ new Set(["http:", "https:"]), Kt = 500;
let N = null;
function V(r) {
  return r == null ? JSON.stringify(r) : Array.isArray(r) ? `[${r.map((t) => V(t)).join(",")}]` : typeof r == "object" ? `{${Object.keys(r).sort().map((t) => `${JSON.stringify(t)}:${V(r[t])}`).join(",")}}` : JSON.stringify(r);
}
function Jt(r) {
  if (typeof r == "string") return r;
  try {
    return JSON.stringify(r);
  } catch {
    return "";
  }
}
function D(r) {
  if (!r || typeof r != "object")
    return r;
  if (Array.isArray(r.content)) {
    const t = r.content.filter((e) => e?.type === "text" && typeof e.text == "string").map((e) => e.text);
    if (t.length > 0)
      return t.join(`

`);
  }
  return typeof r.structuredContent == "string" ? r.structuredContent : r;
}
class M {
  constructor() {
    this._tools = [], this._statuses = {}, this._connections = {}, this._resultCache = /* @__PURE__ */ new Map();
  }
  static createSession() {
    return new M();
  }
  static get defaultInstance() {
    return N || (N = new M()), N;
  }
  static async connect(t = []) {
    return this.defaultInstance.connect(t);
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
  async connect(t = []) {
    this.disconnectAll(), this._tools = [], this._statuses = {}, this._connections = {}, this._resultCache.clear();
    const e = Array.isArray(t) ? t : [], s = /* @__PURE__ */ new Set();
    for (let i = 0; i < e.length; i += 1) {
      const o = e[i], n = this._getStatusKey(o, i);
      try {
        const a = this._normalizeServerConfig(o, s), l = await this._connectServer(a);
        this._connections[a.name] = l, this._statuses[a.name] = {
          connected: !0,
          error: null,
          toolCount: l.tools.length,
          type: a.type || l.transport,
          transport: l.transport,
          url: a.url
        }, l.tools.forEach((c) => {
          this._tools.push({
            name: c.name,
            description: c.description,
            input_schema: c.inputSchema,
            execute: async (d = {}) => l.transport === _ ? this._callToolWithCache(
              l,
              c.name,
              d,
              () => this._callStreamableTool(l, c.name, d)
            ) : l.transport === y ? this._callToolWithCache(
              l,
              c.name,
              d,
              () => this._callSseTool(l, c.name, d)
            ) : this._callToolWithCache(
              l,
              c.name,
              d,
              () => this._callBridgeTool(l, c.name, d)
            )
          });
        }), console.info(`[mcp-drop] Connected to ${a.name} via ${l.transport}`);
      } catch (a) {
        this._statuses[n] = {
          connected: !1,
          error: a?.message || "Connection failed",
          toolCount: 0,
          type: o?.type || "unknown",
          transport: null,
          url: o?.url || null
        }, console.warn(`[mcp-drop] Failed to connect to ${n}: ${a?.message || "Connection failed"}`);
      }
    }
    return [...this._tools];
  }
  disconnectAll() {
    Object.values(this._connections || {}).forEach((t) => {
      t.abortController?.abort(), this._rejectPending(t, new Error("Connection reset"));
    }), this._connections = {}, this._resultCache.clear();
  }
  get tools() {
    return [...this._tools];
  }
  get statuses() {
    return { ...this._statuses };
  }
  async _connectServer(t) {
    const e = this._getAttemptOrder(t).map((i) => ({
      transport: i,
      fn: () => this._connectWithTransport(t, i)
    })), s = [];
    for (const i of e)
      try {
        return await i.fn();
      } catch (o) {
        s.push(`${i.transport}: ${o?.message || "Connection failed"}`);
      }
    throw new Error(s.join(" | "));
  }
  _getAttemptOrder(t) {
    switch (t.type) {
      case A:
        return [A];
      case _:
        return [_, y];
      case y:
        return [y, _];
      case jt:
        return [_, y];
      default:
        return [_, y, A];
    }
  }
  async _connectWithTransport(t, e) {
    return e === _ ? this._connectStreamableHttp(t) : e === y ? this._connectSse(t) : this._connectBridge(t);
  }
  async _connectStreamableHttp(t) {
    const e = this._createConnection(t, _), i = (await this._sendStreamableRequest(e, {
      jsonrpc: x,
      id: 1,
      method: "tools/list",
      params: {}
    }))?.result?.tools;
    if (!Array.isArray(i))
      throw new Error("Invalid tools/list response");
    return e.tools = i, e.nextId = 2, e;
  }
  async _connectSse(t) {
    const e = this._createConnection(t, y);
    e.pending = /* @__PURE__ */ new Map(), e.nextId = 2, e.abortController = new AbortController(), e.ready = this._createDeferred(), this._startSseListener(e);
    try {
      await this._withTimeout(e.ready.promise, J, "SSE endpoint");
      const i = (await this._sendSseRequest(e, {
        jsonrpc: x,
        id: 1,
        method: "tools/list",
        params: {}
      }))?.result?.tools;
      if (!Array.isArray(i))
        throw new Error("Invalid SSE tools/list response");
      return e.tools = i, e;
    } catch (s) {
      throw e.abortController.abort(), this._rejectPending(e, s), s;
    }
  }
  async _connectBridge(t) {
    const e = this._createConnection(t, A), i = (await this._postJson(`${t.url}/tools/list`, e, {
      jsonrpc: x,
      id: 1,
      method: "tools/list",
      params: {}
    }))?.result?.tools;
    if (!Array.isArray(i))
      throw new Error("Invalid bridge tools/list response");
    return e.tools = i, e.nextId = 2, e;
  }
  async _callStreamableTool(t, e, s) {
    const i = await this._sendStreamableRequest(t, {
      jsonrpc: x,
      id: t.nextId++,
      method: "tools/call",
      params: { name: e, arguments: s }
    });
    return D(i?.result);
  }
  async _callSseTool(t, e, s) {
    const i = await this._sendSseRequest(t, {
      jsonrpc: x,
      id: t.nextId++,
      method: "tools/call",
      params: { name: e, arguments: s }
    });
    return D(i?.result);
  }
  async _callBridgeTool(t, e, s) {
    const i = await this._postJson(`${t.url}/tools/call`, t, {
      jsonrpc: x,
      id: t.nextId++,
      method: "tools/call",
      params: { name: e, arguments: s }
    });
    return D(i?.result);
  }
  async _callToolWithCache(t, e, s, i) {
    const o = `${t.name}:${e}:${V(s || {})}`, n = this._resultCache.get(o);
    if (n)
      return n.result;
    const a = await i(), l = Jt(a);
    return l.length > Kt && this._resultCache.set(o, {
      result: a,
      size: l.length
    }), a;
  }
  async _sendStreamableRequest(t, e) {
    const s = await fetch(t.url, {
      method: "POST",
      headers: this._getHeaders(t, {
        accept: "application/json, text/event-stream",
        includeJsonContentType: !0
      }),
      body: JSON.stringify(e)
    });
    if (this._captureSessionId(t, s), !s.ok)
      throw await this._extractResponseError(s);
    if ((s.headers.get("content-type") || "").includes("text/event-stream"))
      return this._withTimeout(
        this._waitForSseFetchResponse(s, e.id),
        J,
        `Streamable HTTP response ${e.id}`
      );
    const o = await this._safeJson(s);
    if (o?.error) throw new Error(o.error.message || "JSON-RPC error");
    return o;
  }
  async _sendSseRequest(t, e) {
    if (!t.messageEndpoint)
      throw new Error("SSE message endpoint not available");
    const s = this._createPendingRequest(t, e.id);
    try {
      const i = await fetch(t.messageEndpoint, {
        method: "POST",
        headers: this._getHeaders(t, {
          accept: "application/json, text/event-stream",
          includeJsonContentType: !0
        }),
        body: JSON.stringify(e)
      });
      if (!i.ok) {
        const n = await this._extractResponseError(i);
        throw this._settlePendingRequest(t, e.id, { error: n }), n;
      }
      const o = i.headers.get("content-type") || "";
      if (o.includes("application/json")) {
        const n = await this._safeJson(i);
        if (n?.error) {
          const a = new Error(n.error.message || "JSON-RPC error");
          throw this._settlePendingRequest(t, e.id, { error: a }), a;
        }
        this._settlePendingRequest(t, e.id, { result: n });
      } else if (o.includes("text/event-stream"))
        try {
          const n = await this._waitForSseFetchResponse(i, e.id);
          this._settlePendingRequest(t, e.id, { result: n });
        } catch (n) {
          throw this._settlePendingRequest(t, e.id, { error: n }), n;
        }
      else {
        const n = new Error(`Unsupported SSE response content type: ${o || "unknown"}`);
        throw this._settlePendingRequest(t, e.id, { error: n }), n;
      }
      return await this._withTimeout(s.promise, J, `SSE response ${e.id}`);
    } catch (i) {
      throw t.pending?.has(String(e.id)) && this._settlePendingRequest(t, e.id, { error: i }), i;
    }
  }
  async _startSseListener(t) {
    try {
      const e = await fetch(t.url, {
        method: "GET",
        headers: this._getHeaders(t, {
          accept: "text/event-stream"
        }),
        signal: t.abortController.signal
      });
      if (!e.ok)
        throw await this._extractResponseError(e);
      const s = e.headers.get("content-type") || "";
      if (!s.includes("text/event-stream"))
        throw new Error(`Expected text/event-stream, got ${s || "unknown content type"}`);
      await this._consumeSseStream(e, async (i) => {
        if (i.id && (t.lastEventId = i.id), i.event === "endpoint") {
          t.messageEndpoint = this._resolveEndpointUrl(t.url, i.data), t.ready.resolve(t.messageEndpoint);
          return;
        }
        if (i.event !== "message") return;
        this._parseJsonRpcMessages(i.data).forEach((n) => this._handleSseMessage(t, n));
      }), t.ready.settled ? t.abortController.signal.aborted || this._rejectPending(t, new Error("SSE stream closed")) : t.ready.reject(new Error("SSE stream closed before endpoint event"));
    } catch (e) {
      if (t.abortController?.signal.aborted) return;
      t.ready.settled || t.ready.reject(e), this._rejectPending(t, e);
    }
  }
  _handleSseMessage(t, e) {
    if (!(!e || e.id === void 0 || e.id === null)) {
      if (e.error) {
        this._settlePendingRequest(t, e.id, {
          error: new Error(e.error.message || "JSON-RPC error")
        });
        return;
      }
      this._settlePendingRequest(t, e.id, { result: e });
    }
  }
  async _waitForSseFetchResponse(t, e) {
    return new Promise(async (s, i) => {
      let o = !1;
      try {
        await this._consumeSseStream(t, async (n) => {
          const a = this._parseJsonRpcMessages(n.data);
          for (const l of a)
            if (l?.id === e || String(l?.id) === String(e)) {
              o = !0, l.error ? i(new Error(l.error.message || "JSON-RPC error")) : s(l);
              break;
            }
        }), o || i(new Error(`SSE stream ended before response ${e}`));
      } catch (n) {
        i(n);
      }
    });
  }
  async _consumeSseStream(t, e) {
    if (!t.body)
      throw new Error("Response body is not readable");
    const s = t.body.getReader(), i = new TextDecoder();
    let o = "", n = "", a = "", l = [];
    const c = async (h) => {
      if (h === "") {
        await d();
        return;
      }
      if (h.startsWith(":")) return;
      const u = h.indexOf(":"), g = u === -1 ? h : h.slice(0, u);
      let f = u === -1 ? "" : h.slice(u + 1);
      f.startsWith(" ") && (f = f.slice(1)), g === "event" && (n = f), g === "data" && l.push(f), g === "id" && (a = f);
    }, d = async () => {
      if (!n && !a && l.length === 0) return;
      const h = {
        event: n || "message",
        id: a || null,
        data: l.join(`
`)
      };
      n = "", a = "", l = [], await e(h);
    };
    try {
      for (; ; ) {
        const { value: h, done: u } = await s.read();
        o += i.decode(h || new Uint8Array(), { stream: !u });
        const g = o.split(/\r?\n/);
        o = g.pop() || "";
        for (const f of g)
          await c(f);
        if (u) {
          o.length > 0 && await c(o), await d();
          break;
        }
      }
    } finally {
      s.releaseLock();
    }
  }
  async _postJson(t, e, s) {
    const i = await fetch(t, {
      method: "POST",
      headers: this._getHeaders(e, {
        accept: "application/json",
        includeJsonContentType: !0
      }),
      body: JSON.stringify(s)
    });
    if (!i.ok)
      throw await this._extractResponseError(i);
    const o = await this._safeJson(i);
    if (o?.error) throw new Error(o.error.message || "JSON-RPC error");
    return o;
  }
  _createConnection(t, e) {
    return {
      name: t.name,
      url: t.url,
      headers: t.headers,
      authorization: t.authorization,
      authToken: t.authToken,
      token: t.token,
      apiKey: t.apiKey,
      transport: e,
      tools: [],
      nextId: 1,
      sessionId: null
    };
  }
  _createDeferred() {
    const t = {
      settled: !1,
      promise: null,
      resolve: null,
      reject: null
    };
    return t.promise = new Promise((e, s) => {
      t.resolve = (i) => {
        t.settled || (t.settled = !0, e(i));
      }, t.reject = (i) => {
        t.settled || (t.settled = !0, s(i));
      };
    }), t;
  }
  _createPendingRequest(t, e) {
    const s = this._createDeferred();
    return t.pending.set(String(e), s), s;
  }
  _settlePendingRequest(t, e, { result: s, error: i }) {
    const o = String(e), n = t.pending.get(o);
    n && (t.pending.delete(o), i ? n.reject(i) : n.resolve(s));
  }
  _rejectPending(t, e) {
    if (t.pending) {
      for (const s of t.pending.values())
        s.reject(e);
      t.pending.clear();
    }
  }
  _captureSessionId(t, e) {
    const s = e.headers.get("Mcp-Session-Id");
    s && (t.sessionId = s);
  }
  _resolveEndpointUrl(t, e) {
    let s = e.trim();
    try {
      const o = JSON.parse(s);
      typeof o == "string" && (s = o);
    } catch {
    }
    const i = new URL(s, t);
    if (!at.has(i.protocol))
      throw new Error(`Unsupported MCP endpoint protocol: ${i.protocol}`);
    return i.toString();
  }
  _parseJsonRpcMessages(t) {
    if (!t) return [];
    try {
      const e = JSON.parse(t);
      return Array.isArray(e) ? e : [e];
    } catch {
      return [];
    }
  }
  async _extractResponseError(t) {
    const e = await this._safeJson(t), s = new Error(e?.error?.message || `HTTP ${t.status}`);
    return s.status = t.status, s;
  }
  async _safeJson(t) {
    try {
      return await t.json();
    } catch {
      return null;
    }
  }
  _normalizeServerConfig(t, e) {
    if (!t || typeof t != "object")
      throw new Error("Server config must be an object");
    const s = String(t.name || "").trim();
    if (!s)
      throw new Error("Server name is required");
    if (e.has(s))
      throw new Error(`Duplicate server name "${s}"`);
    const i = String(t.url || "").trim();
    if (!i)
      throw new Error(`Server "${s}" is missing a URL`);
    let o;
    try {
      o = new URL(i);
    } catch {
      throw new Error(`Server "${s}" has an invalid URL`);
    }
    if (!at.has(o.protocol))
      throw new Error(`Server "${s}" must use http:// or https://`);
    const n = typeof t.type == "string" && t.type.trim() ? t.type.trim() : A, a = {
      ...t,
      name: s,
      url: o.toString(),
      type: n
    };
    return e.add(s), a;
  }
  _getStatusKey(t, e) {
    return (typeof t?.name == "string" ? t.name.trim() : "") || `server-${e + 1}`;
  }
  _getHeaders(t, { accept: e, includeJsonContentType: s = !1 } = {}) {
    const i = {};
    if (e && (i.Accept = e), s && (i["Content-Type"] = "application/json"), t?.headers && typeof t.headers == "object" && Object.assign(i, t.headers), !i.Authorization) {
      const o = t?.authorization || t?.authToken || t?.token || t?.apiKey;
      o && (i.Authorization = o.startsWith("Bearer ") || o.startsWith("Basic ") ? o : `Bearer ${o}`);
    }
    return t?.sessionId && (i["Mcp-Session-Id"] = t.sessionId), i;
  }
  async _withTimeout(t, e, s) {
    let i;
    try {
      return await Promise.race([
        t,
        new Promise((o, n) => {
          i = setTimeout(() => n(new Error(`${s} timed out after ${e}ms`)), e);
        })
      ]);
    } finally {
      clearTimeout(i);
    }
  }
}
const Nt = "0.1.0", Dt = "https://github.com/moisedav/mcp-drop", Ut = `You are a helpful AI assistant with access to external tools via MCP (Model Context Protocol). Use the available tools when needed to help the user accomplish their tasks. Be concise and efficient.

Be concise. When tools return large data (XML, JSON, HTML), extract only what is needed for the user's request. Never repeat large data blocks back to the user. If you need specific details, call the tool again with more specific parameters. When the user asks you to modify code, content, or design, inspect only the minimum necessary context and then act. Do not narrate your internal search process to the user. If you already have enough context to make the change, make it directly. For edit requests, prefer one focused inspection and then perform the edit immediately.`, lt = "mcp-drop_tool_approvals", U = 2400, ct = `
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" stroke-width="1.5"/>
    <path d="M13.7655 2.152C13.3985 2 12.9325 2 12.0005 2C11.0685 2 10.6025 2 10.2355 2.152C9.99263 2.25251 9.772 2.3999 9.58617 2.58572C9.40035 2.77155 9.25296 2.99218 9.15245 3.235C9.06045 3.458 9.02345 3.719 9.00945 4.098C9.00294 4.37193 8.92705 4.63973 8.78889 4.87635C8.65073 5.11298 8.45481 5.31069 8.21945 5.451C7.98026 5.58477 7.71104 5.65567 7.43698 5.65707C7.16293 5.65847 6.893 5.59032 6.65245 5.459C6.31645 5.281 6.07345 5.183 5.83245 5.151C5.30677 5.08187 4.77515 5.22431 4.35445 5.547C4.04045 5.79 3.80645 6.193 3.34045 7C2.87445 7.807 2.64045 8.21 2.58945 8.605C2.55509 8.86545 2.57237 9.13012 2.64032 9.38389C2.70826 9.63767 2.82554 9.87556 2.98545 10.084C3.13345 10.276 3.34045 10.437 3.66145 10.639C4.13445 10.936 4.43845 11.442 4.43845 12C4.43845 12.558 4.13445 13.064 3.66145 13.36C3.34045 13.563 3.13245 13.724 2.98545 13.916C2.82554 14.1244 2.70826 14.3623 2.64032 14.6161C2.57237 14.8699 2.55509 15.1345 2.58945 15.395C2.64145 15.789 2.87445 16.193 3.33945 17C3.80645 17.807 4.03945 18.21 4.35445 18.453C4.56289 18.6129 4.80078 18.7302 5.05456 18.7981C5.30833 18.8661 5.573 18.8834 5.83345 18.849C6.07345 18.817 6.31645 18.719 6.65245 18.541C6.893 18.4097 7.16293 18.3415 7.43698 18.3429C7.71104 18.3443 7.98026 18.4152 8.21945 18.549C8.70245 18.829 8.98945 19.344 9.00945 19.902C9.02345 20.282 9.05945 20.542 9.15245 20.765C9.25296 21.0078 9.40035 21.2284 9.58617 21.4143C9.772 21.6001 9.99263 21.7475 10.2355 21.848C10.6025 22 11.0685 22 12.0005 22C12.9325 22 13.3985 22 13.7655 21.848C14.0083 21.7475 14.2289 21.6001 14.4147 21.4143C14.6006 21.2284 14.7479 21.0078 14.8484 20.765C14.9404 20.542 14.9775 20.282 14.9915 19.902C15.0115 19.344 15.2985 18.828 15.7815 18.549C16.0206 18.4152 16.2899 18.3443 16.5639 18.3429C16.838 18.3415 17.1079 18.4097 17.3484 18.541C17.6844 18.719 17.9274 18.817 18.1674 18.849C18.4279 18.8834 18.6926 18.8661 18.9463 18.7981C19.2001 18.7302 19.438 18.6129 19.6465 18.453C19.9615 18.211 20.1944 17.807 20.6604 17C21.1264 16.193 21.3604 15.79 21.4114 15.395C21.4458 15.1345 21.4285 14.8699 21.3606 14.6161C21.2926 14.3623 21.1754 14.1244 21.0154 13.916C20.8674 13.724 20.6605 13.563 20.3395 13.361C20.1054 13.2184 19.9113 13.0187 19.7754 12.7807C19.6395 12.5427 19.5663 12.2741 19.5625 12C19.5625 11.442 19.8665 10.936 20.3395 10.64C20.6605 10.437 20.8684 10.276 21.0154 10.084C21.1754 9.87556 21.2926 9.63767 21.3606 9.38389C21.4285 9.13012 21.4458 8.86545 21.4114 8.605C21.3594 8.211 21.1264 7.807 20.6614 7C20.1944 6.193 19.9615 5.79 19.6465 5.547C19.438 5.38709 19.2001 5.26981 18.9463 5.20187C18.6926 5.13392 18.4279 5.11664 18.1674 5.151C17.9274 5.183 17.6845 5.281 17.3475 5.459C17.107 5.59014 16.8373 5.6582 16.5634 5.6568C16.2896 5.6554 16.0205 5.58459 15.7815 5.451C15.5461 5.31069 15.3502 5.11298 15.212 4.87635C15.0738 4.63973 14.998 4.37193 14.9915 4.098C14.9775 3.718 14.9414 3.458 14.8484 3.235C14.7479 2.99218 14.6006 2.77155 14.4147 2.58572C14.2289 2.3999 14.0083 2.25251 13.7655 2.152Z" stroke="currentColor" stroke-width="1.5"/>
  </svg>
`, dt = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

  :host {
    --mcp-drop-bg: #080809;
    --mcp-drop-surface: #111113;
    --mcp-drop-surface-2: #1a1a1f;
    --mcp-drop-border: rgba(255,255,255,0.06);
    --mcp-drop-accent: #e8622a;
    --mcp-drop-accent-glow: rgba(232,98,42,0.15);
    --mcp-drop-text: #f0f0f0;
    --mcp-drop-text-muted: #666670;
    --mcp-drop-text-subtle: #3a3a42;
    --mcp-drop-radius: 8px;
    --mcp-drop-success: #22c55e;
    --mcp-drop-error: #ef4444;
    --mcp-drop-border-strong: rgba(255,255,255,0.08);
    --mcp-drop-border-active: rgba(255,255,255,0.15);
    --mcp-drop-accent-border: rgba(232,98,42,0.2);
    --mcp-drop-surface-soft: rgba(255,255,255,0.04);
    --mcp-drop-surface-soft-2: rgba(255,255,255,0.07);
    --mcp-drop-text-soft: #e0e0e0;
    --mcp-drop-text-faint: rgba(255,255,255,0.4);
    --mcp-drop-text-ghost: rgba(255,255,255,0.2);
    --mcp-drop-backdrop: rgba(8,8,9,0.58);
    --mcp-drop-transition: 0s linear;
    --mcp-drop-radius-sm: 8px;
    --mcp-drop-radius-md: 8px;
    --mcp-drop-radius-lg: 8px;
    --mcp-drop-radius-xl: 8px;
    --mcp-drop-radius-pill: 24px;
    display: block;
    font-family: 'Geist', system-ui, sans-serif;
    font-size: 13.5px;
    line-height: 1.6;
    color: var(--mcp-drop-text);
    background: var(--mcp-drop-bg);
  }
  :host([mode="fullpage"]) {
    height: 100%;
    min-height: 100vh;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  button, input, select, textarea { font: inherit; line-height: inherit; }
  code {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    color: var(--mcp-drop-text-soft);
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: var(--mcp-drop-radius); }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse {
    0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
  }
  @keyframes statusPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.18); }
    50% { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
  }
`, qt = `
  .fab {
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    width: 48px; height: 48px; border-radius: var(--mcp-drop-radius-pill);
    background: var(--mcp-drop-accent);
    border: none; cursor: pointer;
    box-shadow: 0 4px 24px rgba(232,98,42,0.35);
    display: flex; align-items: center; justify-content: center;
    color: #fff;
    transition: transform var(--mcp-drop-transition), box-shadow var(--mcp-drop-transition), opacity var(--mcp-drop-transition);
  }
  .fab:hover {
    transform: scale(1.05);
  }

  .widget-panel {
    position: fixed; bottom: 88px; right: 24px; z-index: 9998;
    width: 380px; height: 560px; border-radius: var(--mcp-drop-radius-xl);
    background: var(--mcp-drop-surface);
    border: 1px solid var(--mcp-drop-border);
    box-shadow: 0 18px 40px rgba(0,0,0,0.32);
    display: flex; flex-direction: column; overflow: hidden;
    transform: scale(0.9) translateY(20px);
    opacity: 0; pointer-events: none;
    transition: transform var(--mcp-drop-transition), opacity var(--mcp-drop-transition);
    transform-origin: bottom right;
  }
  .widget-panel.open {
    transform: scale(1) translateY(0);
    opacity: 1; pointer-events: auto;
  }

  @media (max-width: 640px) {
    .fab {
      right: 16px;
      bottom: 16px;
    }

    .widget-panel {
      left: 12px;
      right: 12px;
      bottom: 76px;
      width: auto;
      height: min(72vh, 560px);
      transform-origin: bottom center;
    }
  }
`, Ft = `
  .fullpage {
    width: 100%;
    height: 100%;
    min-height: 0;
    background: var(--mcp-drop-bg);
    display: flex; overflow: hidden;
  }

  .sidebar {
    width: 240px; height: 100%;
    background: var(--mcp-drop-bg);
    border-right: 1px solid rgba(255,255,255,0.05);
    display: flex; flex-direction: column;
    min-height: 0;
    flex-shrink: 0;
    transition: width var(--mcp-drop-transition);
  }
  .sidebar.hidden { width: 0; overflow: hidden; }

  .sidebar-header {
    padding: 16px 16px 12px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .sidebar-toggle-mobile {
    display: none !important;
  }
  .sidebar-logo {
    font-size: 14px;
    font-weight: 600;
    color: var(--mcp-drop-text);
    letter-spacing: -0.03em;
  }
  .sidebar-logo span { color: var(--mcp-drop-accent); }

  .new-chat-btn {
    width: calc(100% - 32px);
    margin: 0 16px 10px;
    padding: 10px 12px;
    background: transparent;
    border: 1px solid var(--mcp-drop-border);
    cursor: pointer;
    display: flex; align-items: center; gap: 10px;
    color: var(--mcp-drop-text-faint);
    font-size: 13px;
    border-radius: var(--mcp-drop-radius-lg);
    transition: background var(--mcp-drop-transition), border-color var(--mcp-drop-transition), color var(--mcp-drop-transition);
    text-align: left;
  }
  .new-chat-btn:hover {
    background: rgba(255,255,255,0.04);
    border-color: var(--mcp-drop-border-strong);
    color: var(--mcp-drop-text);
  }
  .new-chat-btn .icon {
    color: var(--mcp-drop-accent);
    font-size: 14px;
    flex-shrink: 0;
  }

  .conversations-label {
    padding: 10px 16px 8px;
    font-size: 10px;
    color: var(--mcp-drop-text-subtle);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .conversations {
    flex: 1; overflow-y: auto; padding: 0 8px;
  }
  .conv-item {
    padding: 9px 12px;
    border-left: 2px solid transparent;
    border-radius: var(--mcp-drop-radius);
    cursor: pointer; display: flex; align-items: center;
    gap: 0;
    transition: background var(--mcp-drop-transition), color var(--mcp-drop-transition), border-color var(--mcp-drop-transition);
    animation: none;
  }
  .conv-item:hover { background: rgba(255,255,255,0.04); }
  .conv-item.active {
    background: rgba(255,255,255,0.07);
    border-left-color: var(--mcp-drop-accent);
  }
  .conv-item .conv-title {
    font-size: 13px;
    color: var(--mcp-drop-text-muted);
    white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
    flex: 1;
  }
  .conv-item.active .conv-title { color: var(--mcp-drop-text); }
  .conv-item .conv-delete {
    opacity: 0;
    background: none;
    border: none;
    color: var(--mcp-drop-text-subtle);
    cursor: pointer;
    font-size: 14px;
    padding: 2px 4px;
    border-radius: var(--mcp-drop-radius);
    transition: opacity var(--mcp-drop-transition), color var(--mcp-drop-transition);
  }
  .conv-item:hover .conv-delete { opacity: 1; }
  .conv-item .conv-delete:hover { color: var(--mcp-drop-accent); }

  .sidebar-footer {
    padding: 12px 16px;
    border-top: 1px solid rgba(255,255,255,0.05);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .key-status {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 12px;
    border-radius: var(--mcp-drop-radius-lg);
    background: var(--mcp-drop-surface);
    border: 1px solid var(--mcp-drop-border);
    cursor: pointer;
    transition: background var(--mcp-drop-transition), border-color var(--mcp-drop-transition);
  }
  .key-status:hover {
    background: var(--mcp-drop-surface-2);
    border-color: var(--mcp-drop-border-strong);
  }
  .key-dot {
    width: 6px; height: 6px; border-radius: var(--mcp-drop-radius);
    background: var(--mcp-drop-success);
    animation: none;
  }
  .key-dot.disconnected {
    background: var(--mcp-drop-error);
    animation: none;
  }
  .key-label { font-size: 12px; color: var(--mcp-drop-text-muted); flex: 1; }
  .sidebar-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-height: 16px;
  }
  .sidebar-meta-item {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: var(--mcp-drop-text-subtle);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sidebar-meta-item.retry {
    color: var(--mcp-drop-accent);
  }

  .chat-main {
    flex: 1; display: flex; flex-direction: column;
    min-height: 0;
    overflow: hidden; position: relative;
    background: var(--mcp-drop-bg);
  }
  .sidebar-overlay {
    display: none;
  }

  .chat-topbar {
    min-height: 48px;
    padding: 0 20px;
    display: flex; align-items: center; gap: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .toggle-sidebar-btn {
    background: none; border: none; cursor: pointer;
    color: rgba(255,255,255,0.3);
    padding: 4px 6px;
    border-radius: var(--mcp-drop-radius);
    transition: color var(--mcp-drop-transition);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    min-width: 30px;
    min-height: 26px;
  }
  .toggle-sidebar-btn svg {
    display: block;
    width: 18px;
    height: 18px;
  }
  .toggle-sidebar-btn:hover { color: rgba(255,255,255,0.8); }
  .chat-title {
    font-size: 13px;
    color: rgba(255,255,255,0.4);
    font-weight: 500;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tools-badge {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px;
    color: var(--mcp-drop-accent);
    background: rgba(232,98,42,0.1);
    padding: 4px 9px;
    border-radius: var(--mcp-drop-radius-pill);
    border: 1px solid rgba(232,98,42,0.2);
  }

  @media (max-width: 1024px) {
    .fullpage {
      position: relative;
    }

    .sidebar {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: min(84vw, 280px);
      z-index: 6;
      background: rgba(8,8,9,0.98);
      border-right: 1px solid rgba(255,255,255,0.06);
      box-shadow: 0 18px 48px rgba(0,0,0,0.34);
      transition: transform var(--mcp-drop-transition), opacity var(--mcp-drop-transition);
    }

    .sidebar.hidden {
      width: min(84vw, 280px);
      transform: translateX(-100%);
      opacity: 0;
      pointer-events: none;
    }

    .sidebar-toggle-mobile {
      display: inline-flex !important;
    }

    .sidebar-overlay {
      display: block;
      position: absolute;
      inset: 0;
      z-index: 5;
      background: rgba(8,8,9,0.42);
      border: none;
      outline: none;
      box-shadow: none;
      padding: 0;
      margin: 0;
      border-radius: 0;
      appearance: none;
      -webkit-appearance: none;
      opacity: 1;
      pointer-events: auto;
      cursor: default;
    }

    .mobile-sidebar-open .sidebar-overlay {
      display: block;
    }

    .mobile-sidebar-open .chat-topbar .toggle-sidebar-btn {
      display: none;
    }

    .chat-topbar {
      padding: 0 14px;
      gap: 10px;
    }

    .chat-title {
      min-width: 0;
      font-size: 12.5px;
    }

    .tools-badge {
      display: none;
    }
  }
`, pt = `
  .messages-area {
    flex: 1; overflow-y: auto;
    min-height: 0;
    padding: 24px 0 22px;
    display: flex;
    flex-direction: column;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.1) transparent;
  }

  .messages-inner {
    width: 100%;
    max-width: 760px;
    margin: 0 auto; padding: 0 24px 16px;
    display: flex; flex-direction: column; gap: 14px;
    min-height: 100%;
  }

  .empty-state {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 60px 24px; text-align: center; gap: 16px;
  }
  .empty-logo {
    font-size: 13px;
    font-weight: 600;
    color: var(--mcp-drop-text-subtle);
    letter-spacing: -0.03em;
  }
  .empty-logo span { color: var(--mcp-drop-accent); }
  .empty-greeting {
    font-size: 28px;
    font-weight: 500;
    color: rgba(255,255,255,0.15);
    letter-spacing: -0.03em;
  }
  .bubble {
    max-width: 80%;
    font-size: 13.5px;
    line-height: 1.6;
    word-break: break-word;
    white-space: pre-wrap;
    animation: none;
  }
  .bubble.user {
    align-self: flex-end;
    max-width: 75%;
    padding: 10px 16px;
    background: var(--mcp-drop-accent);
    color: #fff;
    border-radius: var(--mcp-drop-radius);
  }
  .bubble.assistant {
    align-self: flex-start;
    max-width: 80%;
    padding: 0;
    background: none;
    border: none;
    color: #e0e0e0;
  }
  .bubble.assistant.streaming { color: var(--mcp-drop-text); }

  .tool-badge {
    align-self: flex-start;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    background: rgba(232,98,42,0.08);
    border: 1px solid rgba(232,98,42,0.14);
    color: var(--mcp-drop-accent);
    padding: 6px 12px;
    border-radius: var(--mcp-drop-radius-pill);
    font-size: 11px;
    display: flex; align-items: center; gap: 6px;
    animation: none;
  }
  .tool-badge.info {
    background: rgba(255,255,255,0.04);
    border-color: rgba(255,255,255,0.08);
    color: var(--mcp-drop-text-muted);
  }
  .spin { display: inline-block; animation: none; }

  .typing {
    align-self: flex-start;
    display: flex;
    gap: 5px;
    align-items: center;
    padding: 2px 0;
  }
  .typing span {
    width: 6px; height: 6px; border-radius: var(--mcp-drop-radius);
    background: rgba(255,255,255,0.25);
    animation: none;
  }
  .typing span:nth-child(2) { animation-delay: .2s; }
  .typing span:nth-child(3) { animation-delay: .4s; }

  .error-bar {
    margin: 0 24px 12px;
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.16);
    color: #f4b2b2;
    padding: 10px 14px;
    border-radius: var(--mcp-drop-radius-md);
    font-size: 13px;
  }
  .error-bar.info {
    background: rgba(255,255,255,0.04);
    border-color: rgba(255,255,255,0.08);
    color: var(--mcp-drop-text-muted);
  }

  .input-wrap {
    padding: 24px 24px 24px;
  }
  .composer-shell {
    width: 100%;
    max-width: 980px;
    margin: 0 auto;
    position: relative;
    background: var(--mcp-drop-surface);
    border: 1px solid var(--mcp-drop-border);
    border-radius: var(--mcp-drop-radius);
    padding: 6px 8px 6px 14px;
    display: flex;
    gap: 10px;
    transition: border-color var(--mcp-drop-transition), background var(--mcp-drop-transition);
  }
  .composer-shell:focus-within {
    border-color: var(--mcp-drop-border);
  }
  .input-box {
    flex: 1;
    min-width: 0;
    min-height: 40px;
    display: flex;
    align-items: center;
    padding-right: 44px;
  }
  .input-box textarea {
    flex: 1;
    display: block;
    width: 100%;
    background: none;
    border: none;
    outline: none;
    color: var(--mcp-drop-text);
    font-size: 15px;
    line-height: 1.6;
    font-family: inherit;
    resize: none;
    max-height: 160px;
    min-height: 24px;
    overflow-y: hidden;
    scrollbar-width: none;
    padding: 8px 0 8px 2px;
  }
  .input-box textarea::placeholder { color: rgba(255,255,255,0.24); }
  .send-btn {
    position: absolute;
    right: 8px;
    bottom: 9px;
    width: 34px;
    height: 34px;
    padding: 8px;
    border-radius: var(--mcp-drop-radius);
    border: none;
    cursor: pointer;
    font-size: 18px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.34);
    opacity: 1;
    transform: scale(1);
    pointer-events: none;
    transition: color var(--mcp-drop-transition), transform var(--mcp-drop-transition), background var(--mcp-drop-transition), box-shadow var(--mcp-drop-transition);
  }
  .send-btn.active {
    background: var(--mcp-drop-accent);
    color: #fff;
    pointer-events: auto;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 10px 28px rgba(232,98,42,0.18);
  }
  .send-btn:hover {
    transform: none;
  }

  .settings-backdrop {
    position: absolute; inset: 0; z-index: 20;
    background: var(--mcp-drop-backdrop);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    opacity: 0; pointer-events: none;
    transition: opacity var(--mcp-drop-transition);
  }
  .settings-backdrop.open {
    opacity: 1; pointer-events: auto;
  }

  .settings-panel {
    position: absolute; top: 0; right: 0; bottom: 0; z-index: 21;
    width: min(380px, 100%);
    background: var(--mcp-drop-surface);
    border-left: 1px solid var(--mcp-drop-border);
    transform: translateX(105%);
    opacity: 0; pointer-events: none;
    transition: transform var(--mcp-drop-transition), opacity var(--mcp-drop-transition);
    display: flex; flex-direction: column;
  }
  .settings-panel.open {
    transform: translateX(0);
    opacity: 1; pointer-events: auto;
  }

  .settings-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 12px;
    min-height: 48px;
    padding: 14px 18px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .settings-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--mcp-drop-text);
    letter-spacing: -0.03em;
  }
  .settings-subtitle {
    margin-top: 4px;
    font-size: 12px;
    color: var(--mcp-drop-text-muted);
    line-height: 1.5;
  }

  .settings-body {
    flex: 1; overflow-y: auto;
    padding: 18px; display: flex; flex-direction: column; gap: 16px;
  }
  .settings-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .settings-section-title {
    font-size: 10px;
    color: var(--mcp-drop-text-subtle);
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }
  .settings-row {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .settings-value {
    font-size: 13px;
    color: var(--mcp-drop-text-soft);
    line-height: 1.5; word-break: break-word;
  }
  .settings-note {
    font-size: 12px;
    color: var(--mcp-drop-text-muted);
    line-height: 1.5;
  }
  .settings-error {
    padding: 10px 12px;
    border-radius: var(--mcp-drop-radius-md);
    font-size: 12px;
    color: #f4b2b2;
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.16);
  }

  .settings-buttons {
    display: flex; flex-wrap: wrap; gap: 8px;
  }
  .settings-action {
    border: none;
    cursor: pointer;
    padding: 10px 14px;
    border-radius: var(--mcp-drop-radius);
    font-size: 13px;
    font-weight: 500;
    color: #fff;
    background: var(--mcp-drop-accent);
    transition: background var(--mcp-drop-transition), border-color var(--mcp-drop-transition), color var(--mcp-drop-transition), opacity var(--mcp-drop-transition);
  }
  .settings-action:hover {
    background: #ef6f39;
  }
  .settings-action.secondary {
    color: var(--mcp-drop-text-soft);
    background: transparent;
    border: 1px solid var(--mcp-drop-border);
  }
  .settings-action.secondary:hover {
    background: rgba(255,255,255,0.04);
    color: var(--mcp-drop-text);
  }
  .settings-action:disabled {
    opacity: .5; cursor: not-allowed;
  }

  .settings-label {
    font-size: 10px;
    color: var(--mcp-drop-text-subtle);
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }
  .settings-input,
  .settings-select {
    width: 100%;
    padding: 12px 14px;
    border-radius: var(--mcp-drop-radius);
    border: 1px solid var(--mcp-drop-border);
    background: var(--mcp-drop-surface-2);
    color: var(--mcp-drop-text-soft);
    outline: none;
    font-size: 13px;
    transition: border-color var(--mcp-drop-transition), background var(--mcp-drop-transition);
  }
  .settings-input:focus,
  .settings-select:focus {
    border-color: var(--mcp-drop-border-active);
  }

  .server-list {
    display: flex; flex-direction: column; gap: 10px;
  }
  .server-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    border-radius: var(--mcp-drop-radius);
    background: var(--mcp-drop-surface-2);
    border: 1px solid rgba(255,255,255,0.06);
  }
  .server-status-dot {
    width: 6px; height: 6px; border-radius: var(--mcp-drop-radius);
    margin-top: 7px;
    flex-shrink: 0;
    background: var(--mcp-drop-success);
    animation: none;
  }
  .server-status-dot.offline {
    background: var(--mcp-drop-error);
    animation: none;
  }
  .server-meta {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; gap: 4px;
  }
  .server-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--mcp-drop-text);
  }
  .server-detail {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11.5px;
    color: var(--mcp-drop-text-muted);
    line-height: 1.45; word-break: break-word;
  }
  .server-remove {
    padding: 6px 10px;
    border-radius: var(--mcp-drop-radius);
    border: 1px solid rgba(255,255,255,0.06);
    background: transparent;
    color: var(--mcp-drop-text-muted);
    font-size: 12px;
    cursor: pointer;
    transition: background var(--mcp-drop-transition), color var(--mcp-drop-transition), border-color var(--mcp-drop-transition);
  }
  .server-remove:hover {
    background: rgba(255,255,255,0.04);
    color: var(--mcp-drop-text);
  }

  .server-form {
    display: flex; flex-direction: column; gap: 10px;
    padding-top: 4px;
  }
  .settings-link {
    color: var(--mcp-drop-accent);
    font-size: 13px;
    text-decoration: none;
  }
  .settings-link:hover { text-decoration: underline; }

  .key-form {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 40px; gap: 16px; max-width: 400px; margin: 0 auto;
    width: 100%;
  }
  .key-icon { font-size: 40px; }
  .key-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--mcp-drop-text);
    text-align: center;
    letter-spacing: -0.03em;
  }
  .key-sub {
    font-size: 13px;
    color: var(--mcp-drop-text-muted);
    text-align: center;
    line-height: 1.7;
  }
  .key-input {
    width: 100%;
    padding: 9px 16px;
    border-radius: var(--mcp-drop-radius);
    background: var(--mcp-drop-surface);
    border: 1px solid rgba(255,255,255,0.08);
    color: var(--mcp-drop-text);
    font-size: 13px;
    outline: none;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    transition: border-color var(--mcp-drop-transition);
  }
  .key-input:focus { border-color: var(--mcp-drop-border-active); }
  .key-btn {
    width: 100%;
    padding: 10px 13px;
    border-radius: var(--mcp-drop-radius);
    background: var(--mcp-drop-accent);
    border: none;
    color: #fff;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    font-family: inherit;
    transition: background var(--mcp-drop-transition);
  }
  .key-btn:hover { background: #ef6f39; }

  .panel-header {
    min-height: 48px;
    padding: 0 16px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--mcp-drop-surface);
  }
  .panel-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .status-dot {
    width: 6px; height: 6px; border-radius: var(--mcp-drop-radius);
    background: var(--mcp-drop-success);
    animation: none;
    transition: background var(--mcp-drop-transition);
  }
  .status-dot.loading {
    background: var(--mcp-drop-accent);
    animation: none;
  }
  .status-dot.disconnected {
    background: var(--mcp-drop-error);
    animation: none;
  }
  .panel-title {
    min-width: 0;
    font-size: 13px;
    font-weight: 500;
    color: rgba(255,255,255,0.42);
    letter-spacing: -0.03em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: rgba(255,255,255,0.3);
    font-size: 16px;
    padding: 4px 6px;
    border-radius: var(--mcp-drop-radius);
    transition: color var(--mcp-drop-transition), opacity var(--mcp-drop-transition);
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 30px;
    min-height: 26px;
  }
  .icon-btn svg {
    display: block;
    width: 18px;
    height: 18px;
  }
  .icon-btn:hover { color: rgba(255,255,255,0.8); }
  .header-actions {
    display: flex; align-items: center; gap: 4px;
  }
  .header-actions.push-right {
    margin-left: auto;
  }
  .metric-badge {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px;
    color: var(--mcp-drop-accent);
    background: rgba(232,98,42,0.1);
    padding: 4px 9px;
    border-radius: var(--mcp-drop-radius-pill);
    border: 1px solid rgba(232,98,42,0.2);
  }
  .key-link {
    color: var(--mcp-drop-accent);
  }
  .key-change-hint {
    font-size: 11px;
    color: var(--mcp-drop-text-subtle);
  }
  .approval-card {
    align-self: flex-start;
    width: min(100%, 560px);
    padding: 16px;
    border-radius: var(--mcp-drop-radius);
    background: var(--mcp-drop-surface-2);
    border: 1px solid rgba(255,255,255,0.06);
    display: flex;
    flex-direction: column;
    gap: 10px;
    animation: none;
  }
  .approval-header {
    font-size: 11px;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--mcp-drop-text-subtle);
  }
  .approval-title {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 13px;
    font-weight: 500;
    color: var(--mcp-drop-text);
  }
  .approval-description {
    font-size: 13.5px;
    line-height: 1.55;
    color: var(--mcp-drop-text-muted);
  }
  .approval-params-label {
    font-size: 10px;
    color: var(--mcp-drop-text-subtle);
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }
  .approval-params {
    max-height: 220px;
    overflow: auto;
    padding: 12px;
    border-radius: var(--mcp-drop-radius);
    background: var(--mcp-drop-bg);
    border: 1px solid var(--mcp-drop-border);
    color: var(--mcp-drop-text-soft);
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11.5px;
    line-height: 1.55;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .approval-checkbox {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--mcp-drop-text-soft);
  }
  .approval-checkbox input {
    accent-color: var(--mcp-drop-accent);
  }
  .approval-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  @media (max-width: 760px) {
    .messages-area {
      padding: 18px 0 24px;
    }
    .messages-inner {
      padding: 0 16px 24px;
      gap: 12px;
    }
    .bubble {
      max-width: 88%;
    }
    .input-wrap {
      padding: 24px 16px 16px;
    }
    .sidebar-meta {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
    .composer-shell {
      max-width: none;
    }
    .input-box textarea {
      font-size: 14px;
    }
    .settings-panel {
      width: 100%;
      border-left: none;
    }
  }
`;
class Wt extends HTMLElement {
  constructor() {
    super(), this.attachShadow({ mode: "open" }), this._messages = [], this._conversations = [], this._activeConvId = null, this._loading = !1, this._tools = [], this._isOpen = !1, this._error = null, this._toolActivity = null, this._streamingAssistantText = "", this._toolApprovalRequest = null, this._pendingToolApprovalResolver = null, this._retryCountdown = 0, this._sidebarVisible = !0, this._didSetMobileSidebarDefault = !1, this._settingsOpen = !1, this._settingsBusy = !1, this._showAddServerForm = !1, this._showKeyEditor = !1, this._settingsError = null, this._serverConfigs = [], this._serverStatuses = {}, this._connector = M.createSession(), this._suspendAttributeSync = !1, this._serverConfigSignature = "[]", this._serverDraft = this._getDefaultServerDraft(), this._alwaysAllowedTools = this._loadToolApprovalPreferences(), this._eventsAttached = !1, this._boundClickHandler = (t) => this._handleClick(t), this._boundInputHandler = (t) => this._handleInput(t), this._boundKeydownHandler = (t) => this._handleKeydown(t), this._boundChangeHandler = (t) => this._handleChange(t), this._boundApiKeyChangeHandler = () => this._handleApiKeyChange();
  }
  static get observedAttributes() {
    return ["title", "placeholder", "system-prompt", "mcp-servers", "persist-key", "mode", "history"];
  }
  attributeChangedCallback(t, e, s) {
    t === "mcp-servers" && e === s || e === s || !this.isConnected || this._suspendAttributeSync || this._applyAttributes();
  }
  async connectedCallback() {
    try {
      await this._applyAttributes({ forceServerRefresh: !0 });
    } catch (t) {
      this._error = t?.message || "Failed to initialize mcp-drop";
    }
    window.addEventListener("mcp-drop:keychange", this._boundApiKeyChangeHandler), this._render(), this._attachEvents();
  }
  disconnectedCallback() {
    window.removeEventListener("mcp-drop:keychange", this._boundApiKeyChangeHandler), this._connector.disconnectAll(), this._resolveToolApproval(!1, { skipRender: !0 }), this._eventsAttached && (this.shadowRoot.removeEventListener("click", this._boundClickHandler), this.shadowRoot.removeEventListener("input", this._boundInputHandler), this.shadowRoot.removeEventListener("keydown", this._boundKeydownHandler), this.shadowRoot.removeEventListener("change", this._boundChangeHandler), this._eventsAttached = !1);
  }
  async _applyAttributes({ forceServerRefresh: t = !1 } = {}) {
    const e = this._showHistory, s = this._serverConfigSignature;
    this._mode = this.getAttribute("mode") || "widget", this._title = this.getAttribute("title") || "mcp-drop", this._placeholder = this.getAttribute("placeholder") || "Type a message...", this._systemPrompt = this.getAttribute("system-prompt") || Ut, this._persistKey = this.hasAttribute("persist-key"), this._showHistory = this.hasAttribute("history"), this._isMobileViewport() && this._mode === "fullpage" && this._showHistory && !this._didSetMobileSidebarDefault && (this._sidebarVisible = !1, this._didSetMobileSidebarDefault = !0);
    const { servers: i, error: o } = this._readServerConfigsFromAttribute();
    this._serverConfigs = i, this._serverConfigSignature = this._getServerConfigSignature(i), this._settingsError = o, this._showHistory && !e && this._loadConversations(), !this._showHistory && e && (this._activeConvId = null), this._hasKey = !!this._getApiKey(), t || s !== this._serverConfigSignature ? await this._refreshServerConnections({ silent: !0 }) : (this._serverStatuses = this._connector.statuses, this._tools = this._connector.tools), this.isConnected && (this._render(), this._attachEvents());
  }
  _readServerConfigsFromAttribute() {
    const t = this.getAttribute("mcp-servers");
    if (!t)
      return { servers: [], error: null };
    try {
      const e = JSON.parse(t);
      return {
        servers: Array.isArray(e) ? e.map((s) => ({
          name: typeof s?.name == "string" ? s.name.trim() : "",
          url: typeof s?.url == "string" ? s.url.trim() : "",
          type: s?.type || "bridge"
        })) : [],
        error: null
      };
    } catch (e) {
      return {
        servers: [],
        error: e?.message || "Invalid mcp-servers attribute"
      };
    }
  }
  _getServerConfigSignature(t = this._serverConfigs) {
    return JSON.stringify(
      (Array.isArray(t) ? t : []).map(({ name: e, url: s, type: i }) => ({ name: e, url: s, type: i }))
    );
  }
  _handleApiKeyChange() {
    const t = !!this._getApiKey();
    this._hasKey = t, t || (this._showKeyEditor = !1, this._messages = [], this._clearTransientChatState()), this.isConnected && (this._render(), this._attachEvents());
  }
  // ── Storage ─────────────────────────────────────────────
  _loadConversations() {
    if (this._showHistory)
      try {
        const t = localStorage.getItem("mcp_chat_conversations"), e = t ? JSON.parse(t) : [];
        this._conversations = Array.isArray(e) ? e.filter((s) => s && typeof s == "object").map((s) => ({
          id: String(s.id || Date.now()),
          title: String(s.title || "New chat"),
          createdAt: Number(s.createdAt || Date.now()),
          messages: Array.isArray(s.messages) ? s.messages.filter(
            (i) => i && (i.role === "user" || i.role === "assistant") && typeof i.content == "string"
          ).map((i) => ({ role: i.role, content: i.content })) : []
        })) : [];
      } catch {
        this._conversations = [];
      }
  }
  _saveConversations() {
    if (this._showHistory)
      try {
        localStorage.setItem("mcp_chat_conversations", JSON.stringify(this._conversations));
      } catch {
      }
  }
  _loadToolApprovalPreferences() {
    try {
      const t = localStorage.getItem(lt), e = t ? JSON.parse(t) : [];
      return new Set(
        Array.isArray(e) ? e.filter((s) => typeof s == "string" && s.trim()).map((s) => s.trim()) : []
      );
    } catch {
      return /* @__PURE__ */ new Set();
    }
  }
  _saveToolApprovalPreferences() {
    try {
      localStorage.setItem(
        lt,
        JSON.stringify(Array.from(this._alwaysAllowedTools).sort())
      );
    } catch {
    }
  }
  _newConversation() {
    if (this._messages.length > 0) {
      const t = this._getConversationTitle(this._messages), e = this._conversations.find((s) => s.id === this._activeConvId);
      e ? (e.messages = [...this._messages], e.title = t) : this._conversations.unshift({
        id: Date.now().toString(),
        title: t,
        messages: [...this._messages],
        createdAt: Date.now()
      }), this._saveConversations();
    }
    this._messages = [], this._activeConvId = null, this._clearTransientChatState(), this._render(), this._attachEvents();
  }
  _loadConversation(t) {
    const e = this._conversations.find((s) => s.id === t);
    e && (this._clearTransientChatState(), this._messages = e.messages.map((s) => ({ role: s.role, content: s.content })), this._activeConvId = t, this._isMobileViewport() && (this._sidebarVisible = !1), this._render(), this._attachEvents(), this._scrollToBottom(!0));
  }
  _deleteConversation(t) {
    this._conversations = this._conversations.filter((e) => e.id !== t), this._activeConvId === t && (this._clearTransientChatState(), this._messages = [], this._activeConvId = null), this._saveConversations(), this._render(), this._attachEvents();
  }
  _clearTransientChatState() {
    this._streamingAssistantText = "", this._toolActivity = null, this._retryCountdown = 0, this._error = null, this._resolveToolApproval(!1, { skipRender: !0 });
  }
  // ── Render ───────────────────────────────────────────────
  _render() {
    this._mode === "fullpage" ? this._renderFullpage() : this._renderWidget();
  }
  _renderWidget() {
    const t = this._loading ? "loading" : this._hasConnectedServers() ? "" : "disconnected";
    this.shadowRoot.innerHTML = `
      <style>${dt}${qt}${pt}</style>
      <button class="fab" id="fab">
        ${this._isOpen ? "✕" : '<svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.96 9.96 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" fill="currentColor"/></svg>'}
      </button>
      <div class="widget-panel ${this._isOpen ? "open" : ""}" id="panel">
        <div class="panel-header">
          <div class="panel-header-left">
            <div class="status-dot ${t}"></div>
            <span class="panel-title">${this._escapeHtml(this._title)}</span>
            ${this._tools.length > 0 ? `<span class="metric-badge">${this._tools.length} tools</span>` : ""}
          </div>
          <div class="header-actions">
            <button class="icon-btn" id="settings-toggle" title="Settings" aria-label="Settings">${ct}</button>
            ${this._hasKey ? '<button class="icon-btn" id="reset-key" title="Reset API key">🔑</button>' : ""}
            <button class="icon-btn" id="close" title="Close">✕</button>
          </div>
        </div>
        ${this._renderChatBody()}
        ${this._renderSettingsPanel()}
      </div>
    `;
  }
  _renderFullpage() {
    const t = this._activeConvId ? this._conversations.find((s) => s.id === this._activeConvId)?.title || this._title : this._title, e = this._isMobileViewport() && this._sidebarVisible ? "mobile-sidebar-open" : "";
    this.shadowRoot.innerHTML = `
      <style>${dt}${Ft}${pt}</style>
      <div class="fullpage ${e}">
        ${this._showHistory && this._isMobileViewport() && this._sidebarVisible ? `
          <button class="sidebar-overlay" id="sidebar-overlay" aria-label="Close sidebar"></button>
        ` : ""}
        ${this._showHistory ? `
          <div class="sidebar ${this._sidebarVisible ? "" : "hidden"}" id="sidebar">
            <div class="sidebar-header">
              <span class="sidebar-logo">mcp-<span>drop</span></span>
              <button class="toggle-sidebar-btn sidebar-toggle-mobile" data-action="toggle-sidebar" aria-label="Toggle sidebar">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M10 6v12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            <button class="new-chat-btn" id="new-chat">
              <div class="icon">✦</div>
              New conversation
            </button>
            ${this._conversations.length > 0 ? `
              <div class="conversations-label">Recent</div>
              <div class="conversations">
                ${this._conversations.map((s) => `
                  <div class="conv-item ${s.id === this._activeConvId ? "active" : ""}" data-id="${this._escapeHtml(s.id)}">
                    <span class="conv-title">${this._escapeHtml(s.title)}</span>
                    <button class="conv-delete" data-delete="${this._escapeHtml(s.id)}">✕</button>
                  </div>
                `).join("")}
              </div>
            ` : ""}
            <div class="sidebar-footer">
              <div class="key-status" id="key-status">
                <div class="key-dot ${this._hasKey ? "" : "disconnected"}"></div>
                <span class="key-label">${this._hasKey ? "API key connected" : "No API key"}</span>
                ${this._hasKey ? '<span class="key-change-hint">change</span>' : ""}
              </div>
              <div class="sidebar-meta">
                <span class="sidebar-meta-item">~${this._formatTokenCount(this._getEstimatedTokenUsage())} tokens</span>
                ${this._retryCountdown > 0 ? `<span class="sidebar-meta-item retry">Retrying in ${this._retryCountdown}s</span>` : ""}
              </div>
            </div>
          </div>
        ` : ""}

        <div class="chat-main">
          <div class="chat-topbar">
            ${this._showHistory ? `
              <button class="toggle-sidebar-btn" id="toggle-sidebar">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M10 6v12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              </button>
            ` : ""}
            <span class="chat-title">${this._escapeHtml(t)}</span>
            ${this._tools.length > 0 ? `<span class="tools-badge">${this._tools.length} tools active</span>` : ""}
            <div class="header-actions ${this._tools.length > 0 ? "" : "push-right"}">
              <button class="icon-btn" id="settings-toggle" title="Settings" aria-label="Settings">${ct}</button>
              ${this._hasKey && !this._showHistory ? '<button class="icon-btn" id="reset-key" title="Reset API key">🔑</button>' : ""}
            </div>
          </div>
          ${this._renderChatBody()}
          ${this._renderSettingsPanel()}
        </div>
      </div>
    `;
  }
  _renderChatBody() {
    return this._hasKey ? `
      <div class="messages-area" id="messages-area">
        <div class="messages-inner">
          ${this._messages.length === 0 && !this._streamingAssistantText && !this._toolApprovalRequest && !this._loading ? `
            <div class="empty-state">
              <div class="empty-greeting">How can I help?</div>
            </div>
          ` : this._messages.map((e) => typeof e.content == "string" ? `
            <div class="bubble ${e.role === "user" ? "user" : "assistant"}">${this._escapeHtml(e.content)}</div>
          ` : "").join("")}
          ${this._streamingAssistantText ? `
            <div class="bubble assistant streaming" data-streaming-assistant>${this._escapeHtml(this._streamingAssistantText)}</div>
          ` : ""}
          ${this._toolApprovalRequest ? this._renderToolApprovalCard() : ""}
          ${this._retryCountdown > 0 ? `
            <div class="tool-badge info">Retrying after rate limit in ${this._retryCountdown}s</div>
          ` : ""}
          ${this._toolActivity ? `
            <div class="tool-badge"><span class="spin">⚙</span> Running: ${this._escapeHtml(this._toolActivity)}</div>
          ` : ""}
          ${this._loading && !this._toolActivity && !this._toolApprovalRequest && !this._streamingAssistantText ? `
            <div class="typing"><span></span><span></span><span></span></div>
          ` : ""}
        </div>
      </div>
      ${this._error ? `<div class="error-bar">⚠ ${this._escapeHtml(this._error)}</div>` : ""}
      <div class="input-wrap">
        <div class="composer-shell">
          <div class="input-box">
            <textarea id="input" placeholder="${this._escapeHtml(this._placeholder)}" rows="1"></textarea>
          </div>
          <button class="send-btn" id="send">↑</button>
        </div>
      </div>
    ` : `
        <div class="key-form">
          <div class="key-icon">🔑</div>
          <div class="key-title">Enter API Key</div>
          <div class="key-sub">Your Anthropic API key stays in your browser.<br/>Get one at <span class="key-link">console.anthropic.com</span></div>
          <input class="key-input" id="key-input" type="password" placeholder="sk-ant-..." />
          <button class="key-btn" id="key-btn">Connect</button>
        </div>
      `;
  }
  _renderToolApprovalCard() {
    return this._toolApprovalRequest ? `
      <div class="approval-card">
        <div class="approval-header">Tool approval required</div>
        <div class="approval-title">${this._escapeHtml(this._toolApprovalRequest.name)}</div>
        <div class="approval-description">
          ${this._escapeHtml(this._toolApprovalRequest.description || "This tool wants to run with the parameters below.")}
        </div>
        <div class="approval-params-label">Parameters</div>
        <pre class="approval-params">${this._escapeHtml(this._formatApprovalParams(this._toolApprovalRequest.input))}</pre>
        <label class="approval-checkbox">
          <input type="checkbox" id="tool-approval-always" ${this._toolApprovalRequest.alwaysAllow ? "checked" : ""} />
          Always allow this tool
        </label>
        <div class="approval-actions">
          <button class="settings-action" id="tool-approval-allow">Allow</button>
          <button class="settings-action secondary" id="tool-approval-deny">Deny</button>
        </div>
      </div>
    ` : "";
  }
  _renderSettingsPanel() {
    const t = this._getApiKey();
    return `
      <div class="settings-backdrop ${this._settingsOpen ? "open" : ""}" id="settings-backdrop"></div>
      <aside class="settings-panel ${this._settingsOpen ? "open" : ""}" id="settings-panel">
        <div class="settings-header">
          <div>
            <div class="settings-title">Settings</div>
            <div class="settings-subtitle">Manage MCP servers, API credentials, and package info.</div>
          </div>
          <button class="icon-btn" id="settings-close" title="Close settings">✕</button>
        </div>

        <div class="settings-body">
          <section class="settings-section">
            <div class="settings-section-title">MCP Servers</div>

            <div class="server-list">
              ${this._serverConfigs.length > 0 ? this._serverConfigs.map((e, s) => {
      const i = this._serverStatuses[e.name] || {}, o = [
        this._formatServerType(i.transport || e.type),
        e.url || ""
      ].filter(Boolean).join(" · ");
      return `
                  <div class="server-item">
                    <div class="server-status-dot ${i.connected ? "" : "offline"}"></div>
                    <div class="server-meta">
                      <div class="server-name">${this._escapeHtml(e.name)}</div>
                      <div class="server-detail">${i.connected ? "Connected" : "Disconnected"} · ${this._escapeHtml(o)}</div>
                      ${i.error ? `<div class="server-detail">${this._escapeHtml(i.error)}</div>` : ""}
                    </div>
                    <button class="server-remove" data-remove-server-index="${s}">Remove</button>
                  </div>
                `;
    }).join("") : `
                <div class="settings-note">No MCP servers configured yet.</div>
              `}
            </div>

            <div class="settings-buttons">
              <button class="settings-action secondary" id="add-server-toggle">${this._showAddServerForm ? "Hide form" : "Add Server"}</button>
            </div>

            ${this._showAddServerForm ? `
              <div class="server-form">
                <div class="settings-label">Server name</div>
                <input class="settings-input" id="settings-server-name" type="text" placeholder="my-server" value="${this._escapeHtml(this._serverDraft.name)}" />

                <div class="settings-label">Type</div>
                <select class="settings-select" id="settings-server-type">
                  <option value="remote" ${this._serverDraft.type === "remote" ? "selected" : ""}>Remote URL (HTTP/SSE)</option>
                  <option value="bridge" ${this._serverDraft.type === "bridge" ? "selected" : ""}>Local via Bridge</option>
                </select>

                <div class="settings-label">${this._serverDraft.type === "bridge" ? "Bridge URL" : "Server URL"}</div>
                <input class="settings-input" id="settings-server-url" type="url" placeholder="${this._escapeHtml(this._getServerDraftPlaceholder())}" value="${this._escapeHtml(this._serverDraft.url)}" />

                ${this._serverDraft.type === "bridge" ? `
                  <div class="settings-note">Use a local bridge URL such as <code>http://localhost:3333</code>.</div>
                ` : `
                  <div class="settings-note">Use a remote MCP endpoint that supports Streamable HTTP or SSE.</div>
                `}

                ${this._settingsError ? `<div class="settings-error">${this._escapeHtml(this._settingsError)}</div>` : ""}

                <div class="settings-buttons">
                  <button class="settings-action" id="settings-connect-server" ${this._settingsBusy ? "disabled" : ""}>${this._settingsBusy ? "Connecting..." : "Connect"}</button>
                  <button class="settings-action secondary" id="settings-cancel-server">Cancel</button>
                </div>
              </div>
            ` : ""}
          </section>

          <section class="settings-section">
            <div class="settings-section-title">API Key</div>
            <div class="settings-row">
              <div class="settings-value">${this._escapeHtml(this._maskApiKey(t))}</div>
              <button class="settings-action secondary" id="change-key-toggle">${this._showKeyEditor ? "Cancel" : "Change key"}</button>
            </div>

            ${this._showKeyEditor ? `
              <div class="server-form">
                <div class="settings-label">Anthropic API key</div>
                <input class="settings-input" id="settings-api-key" type="password" placeholder="sk-ant-..." />
                <div class="settings-buttons">
                  <button class="settings-action" id="settings-save-key">Save key</button>
                </div>
              </div>
            ` : ""}
          </section>

          <section class="settings-section">
            <div class="settings-section-title">About</div>
            <div class="settings-value">@mcp-drop/core v${Nt}</div>
            <div class="settings-note">Connect Claude to anything. Drop it anywhere.</div>
            <a class="settings-link" href="${Dt}" target="_blank" rel="noreferrer">GitHub</a>
          </section>
        </div>
      </aside>
    `;
  }
  // ── Events ───────────────────────────────────────────────
  _attachEvents() {
    this._eventsAttached || (this.shadowRoot.addEventListener("click", this._boundClickHandler), this.shadowRoot.addEventListener("input", this._boundInputHandler), this.shadowRoot.addEventListener("keydown", this._boundKeydownHandler), this.shadowRoot.addEventListener("change", this._boundChangeHandler), this._eventsAttached = !0, this._syncComposerInputState());
  }
  _handleClick(t) {
    const e = t.target.closest("button, .conv-item, .key-status");
    if (e) {
      if (e.id === "fab") {
        this._isOpen = !this._isOpen, this._isOpen || this._closeSettings(), this._render(), this._isOpen && this._scrollToBottom(!0), this._isOpen && setTimeout(() => this.shadowRoot.getElementById("input")?.focus(), 300);
        return;
      }
      if (e.id === "close") {
        this._isOpen = !1, this._closeSettings(), this._render();
        return;
      }
      if (e.id === "sidebar-overlay") {
        this._sidebarVisible = !1, this._render();
        return;
      }
      if (e.id === "toggle-sidebar" || e.dataset.action === "toggle-sidebar") {
        this._sidebarVisible = !this._sidebarVisible, this._render();
        return;
      }
      if (e.id === "new-chat") {
        this._newConversation();
        return;
      }
      if (e.classList.contains("conv-item")) {
        if (t.target.closest(".conv-delete")) return;
        this._loadConversation(e.dataset.id);
        return;
      }
      if (e.classList.contains("conv-delete")) {
        this._deleteConversation(e.dataset.delete);
        return;
      }
      if (e.id === "key-btn") {
        this._saveKey();
        return;
      }
      if (e.id === "key-status") {
        this._openKeySettings();
        return;
      }
      if (e.id === "reset-key") {
        this._resetKey();
        return;
      }
      if (e.id === "settings-toggle") {
        this._settingsOpen = !this._settingsOpen, this._render();
        return;
      }
      if (e.id === "settings-close" || e.id === "settings-backdrop") {
        this._closeSettings(), this._render();
        return;
      }
      if (e.id === "add-server-toggle") {
        this._showAddServerForm = !this._showAddServerForm, this._settingsError = null, this._showAddServerForm || (this._serverDraft = this._getDefaultServerDraft()), this._render();
        return;
      }
      if (e.id === "settings-cancel-server") {
        this._showAddServerForm = !1, this._settingsError = null, this._serverDraft = this._getDefaultServerDraft(), this._render();
        return;
      }
      if (e.id === "settings-connect-server") {
        this._connectServerFromSettings();
        return;
      }
      if (e.id === "change-key-toggle") {
        this._showKeyEditor = !this._showKeyEditor, this._render();
        return;
      }
      if (e.id === "settings-save-key") {
        this._saveKey(!0);
        return;
      }
      if (e.id === "tool-approval-allow") {
        this._resolveToolApproval(!0);
        return;
      }
      if (e.id === "tool-approval-deny") {
        this._resolveToolApproval(!1);
        return;
      }
      if (e.dataset.removeServerIndex !== void 0) {
        this._removeServerAt(Number(e.dataset.removeServerIndex));
        return;
      }
      e.id === "send" && this._send();
    }
  }
  _handleInput(t) {
    if (t.target.id === "settings-server-name") {
      this._serverDraft.name = t.target.value;
      return;
    }
    if (t.target.id === "settings-server-url") {
      this._serverDraft.url = t.target.value;
      return;
    }
    if (t.target.id === "input") {
      const e = this.shadowRoot.getElementById("send");
      e && (e.className = t.target.value.trim() ? "send-btn active" : "send-btn"), this._resizeComposerInput(t.target);
    }
  }
  _handleKeydown(t) {
    if (t.target.id === "key-input" && t.key === "Enter") {
      this._saveKey();
      return;
    }
    if (t.target.id === "settings-api-key" && t.key === "Enter") {
      this._saveKey(!0);
      return;
    }
    t.target.id === "input" && t.key === "Enter" && !t.shiftKey && (t.preventDefault(), this._send());
  }
  _handleChange(t) {
    if (t.target.id === "settings-server-type") {
      this._serverDraft.type = t.target.value, this._settingsError = null, this._render();
      return;
    }
    t.target.id === "tool-approval-always" && this._toolApprovalRequest && (this._toolApprovalRequest = {
      ...this._toolApprovalRequest,
      alwaysAllow: t.target.checked
    });
  }
  _saveKey(t = !1) {
    const e = t ? "settings-api-key" : "key-input", s = this.shadowRoot.getElementById(e)?.value?.trim();
    s && (z.set(s, this._persistKey), this._hasKey = !0, this._error = null, this._settingsError = null, this._showKeyEditor = !1, this._render(), this._attachEvents(), setTimeout(() => this.shadowRoot.getElementById("input")?.focus(), 100));
  }
  async _send() {
    const t = this.shadowRoot.getElementById("input"), e = t?.value?.trim();
    if (!(!e || this._loading)) {
      this._error = null, this._toolActivity = null, this._retryCountdown = 0, this._streamingAssistantText = "", this._resolveToolApproval(!1, { skipRender: !0 }), this._messages.push({ role: "user", content: e }), t && (t.value = ""), this._loading = !0, this._render(), this._attachEvents(), this._scrollToBottom(!0);
      try {
        const i = await nt.sendWithTools({
          messages: this._messages.map((o) => ({ role: o.role, content: o.content })),
          tools: this._tools,
          systemPrompt: this._systemPrompt,
          onTextDelta: ({ text: o }) => {
            this._updateStreamingAssistantText(o);
          },
          onToolCall: (o) => {
            this._updateToolActivity(o);
          },
          onToolApproval: (o) => this._requestToolApproval(o),
          onRetryCountdown: (o) => this._updateRetryCountdown(o)
        }) || this._streamingAssistantText;
        i && this._messages.push({ role: "assistant", content: i }), this._showHistory && this._upsertActiveConversation();
      } catch (s) {
        this._streamingAssistantText && (this._messages.push({ role: "assistant", content: this._streamingAssistantText }), this._showHistory && this._upsertActiveConversation()), this._error = s?.message || "Message send failed";
      } finally {
        this._loading = !1, this._toolActivity = null, this._retryCountdown = 0, this._streamingAssistantText = "", this._resolveToolApproval(!1, { skipRender: !0 }), this._render(), this._attachEvents(), this._scrollToBottom(!0);
      }
    }
  }
  _scrollToBottom(t = !1) {
    const e = this.shadowRoot.getElementById("messages-area");
    if (!e) return;
    const s = () => {
      e.scrollTop = e.scrollHeight;
    };
    s(), t || requestAnimationFrame(s);
  }
  _isMobileViewport() {
    return typeof window < "u" && window.matchMedia("(max-width: 1024px)").matches;
  }
  _getDefaultServerDraft() {
    return { name: "", type: "remote", url: "" };
  }
  _getServerDraftPlaceholder() {
    return this._serverDraft.type === "bridge" ? "http://localhost:3333" : "https://your-mcp-server.example";
  }
  _closeSettings() {
    this._settingsOpen = !1, this._showAddServerForm = !1, this._showKeyEditor = !1, this._settingsError = null;
  }
  _requestToolApproval({ name: t, description: e, input: s }) {
    return this._alwaysAllowedTools.has(t) ? Promise.resolve({ allowed: !0, alwaysAllow: !0 }) : (this._toolActivity = null, this._resolveToolApproval(!1, { skipRender: !0 }), this._toolApprovalRequest = {
      name: t,
      description: e,
      input: s,
      alwaysAllow: !1
    }, this._render(), this._attachEvents(), this._scrollToBottom(), new Promise((i) => {
      this._pendingToolApprovalResolver = i;
    }));
  }
  _resolveToolApproval(t, { skipRender: e = !1 } = {}) {
    const s = this._toolApprovalRequest, i = this._pendingToolApprovalResolver;
    !s && !i || (t && s?.alwaysAllow && s.name && (this._alwaysAllowedTools.add(s.name), this._saveToolApprovalPreferences()), this._toolApprovalRequest = null, this._pendingToolApprovalResolver = null, !e && this.isConnected && (this._render(), this._attachEvents()), i?.({ allowed: t, alwaysAllow: !!(t && s?.alwaysAllow) }));
  }
  _updateStreamingAssistantText(t) {
    const e = typeof t == "string" ? t : "", s = !!this._streamingAssistantText;
    this._streamingAssistantText = e;
    const i = this.shadowRoot.querySelector("[data-streaming-assistant]");
    if (!s || !i) {
      this._render(), this._attachEvents(), this._scrollToBottom(!0);
      return;
    }
    i.textContent = e, this._scrollToBottom(!0);
  }
  _updateToolActivity(t) {
    this._toolActivity = t, this._render(), this._attachEvents(), this._scrollToBottom(!0);
  }
  _updateRetryCountdown(t) {
    this._retryCountdown = Number.isFinite(t) ? Math.max(0, t) : 0, this.isConnected && (this._render(), this._attachEvents(), this._scrollToBottom(!0));
  }
  _resizeComposerInput(t) {
    if (!t) return;
    t.style.height = "0px";
    const e = Math.min(Math.max(t.scrollHeight, 24), 160);
    t.style.height = `${e}px`, t.style.overflowY = t.scrollHeight > 160 ? "auto" : "hidden";
  }
  _syncComposerInputState() {
    const t = this.shadowRoot?.getElementById("input"), e = this.shadowRoot?.getElementById("send");
    e && t && (e.className = t.value.trim() ? "send-btn active" : "send-btn"), this._resizeComposerInput(t);
  }
  _formatApprovalParams(t) {
    let e = "";
    try {
      e = JSON.stringify(t ?? {}, null, 2);
    } catch {
      e = '{"error":"Parameters could not be serialized"}';
    }
    if (e.length <= U)
      return e;
    const s = e.length - U;
    return `${e.slice(0, U)}

... ${s} more characters`;
  }
  _maskApiKey(t) {
    return t ? t.length <= 10 ? `${t.slice(0, 4)}***` : `${t.slice(0, 7)}***${t.slice(-4)}` : "No API key connected";
  }
  _formatServerType(t) {
    return t === "streamable-http" ? "Remote URL (HTTP)" : t === "sse" ? "Remote URL (SSE)" : t === "remote" ? "Remote URL (HTTP/SSE)" : t === "bridge" ? "Bridge URL" : "MCP Server";
  }
  _getEstimatedTokenUsage() {
    const t = [...this._messages];
    return this._streamingAssistantText && t.push({ role: "assistant", content: this._streamingAssistantText }), nt.estimateConversationTokens({
      messages: t,
      systemPrompt: this._systemPrompt
    });
  }
  _formatTokenCount(t) {
    return (Number.isFinite(t) ? Math.max(0, Math.round(t)) : 0).toLocaleString("en-US");
  }
  _escapeHtml(t = "") {
    return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  _syncServerAttribute() {
    const t = this._serverConfigs.map(({ name: e, url: s, type: i }) => ({ name: e, url: s, type: i }));
    this._suspendAttributeSync = !0;
    try {
      t.length > 0 ? this.setAttribute("mcp-servers", JSON.stringify(t)) : this.removeAttribute("mcp-servers"), this._serverConfigSignature = this._getServerConfigSignature(t);
    } finally {
      this._suspendAttributeSync = !1;
    }
  }
  async _refreshServerConnections({ silent: t = !1 } = {}) {
    t || (this._settingsBusy = !0, this._render(), this._attachEvents());
    try {
      this._tools = await this._connector.connect(this._serverConfigs), this._serverStatuses = this._connector.statuses;
    } catch (e) {
      this._tools = [], this._serverStatuses = {};
      const s = e?.message || "Failed to refresh MCP servers";
      t ? this._error = s : this._settingsError = s;
    } finally {
      this._settingsBusy = !1, t || (this._render(), this._attachEvents());
    }
  }
  async _connectServerFromSettings() {
    const t = this._serverDraft.name.trim(), e = this._serverDraft.url.trim(), s = this._serverDraft.type === "bridge" ? "bridge" : "remote";
    if (!t) {
      this._settingsError = "Server name is required.", this._render(), this._attachEvents();
      return;
    }
    if (!e) {
      this._settingsError = s === "bridge" ? "Bridge URL is required." : "URL is required for remote servers.", this._render(), this._attachEvents();
      return;
    }
    if (this._serverConfigs.some((i) => i.name.toLowerCase() === t.toLowerCase())) {
      this._settingsError = `A server named "${t}" already exists.`, this._render(), this._attachEvents();
      return;
    }
    try {
      const i = new URL(e);
      if (!["http:", "https:"].includes(i.protocol))
        throw new Error("Enter an http:// or https:// URL.");
    } catch {
      this._settingsError = "Enter a valid http:// or https:// URL.", this._render(), this._attachEvents();
      return;
    }
    this._settingsError = null, this._serverConfigs = [...this._serverConfigs, { name: t, url: e, type: s }], this._syncServerAttribute(), await this._refreshServerConnections(), this._showAddServerForm = !1, this._serverDraft = this._getDefaultServerDraft(), this._settingsOpen = !0, this._render(), this._attachEvents();
  }
  async _removeServerAt(t) {
    !Number.isInteger(t) || t < 0 || t >= this._serverConfigs.length || (this._serverConfigs = this._serverConfigs.filter((e, s) => s !== t), this._syncServerAttribute(), await this._refreshServerConnections(), this._settingsOpen = !0, this._render(), this._attachEvents());
  }
  _getApiKey() {
    return z.get({ includeStorage: this._persistKey });
  }
  _resetKey() {
    z.clear(), this._hasKey = !1, this._messages = [], this._clearTransientChatState(), this._showKeyEditor = !1, this._render(), this._attachEvents();
  }
  _openKeySettings() {
    this._settingsOpen = !0, this._showKeyEditor = !0, this._render(), this._attachEvents(), setTimeout(() => this.shadowRoot.getElementById("settings-api-key")?.focus(), 50);
  }
  _getConversationTitle(t = this._messages) {
    return t.find((s) => s.role === "user" && typeof s.content == "string")?.content?.slice(0, 40) || "New chat";
  }
  _upsertActiveConversation() {
    const t = this._getConversationTitle();
    if (this._activeConvId) {
      const e = this._conversations.find((s) => s.id === this._activeConvId);
      e && (e.messages = [...this._messages], e.title = t);
    } else {
      const e = Date.now().toString();
      this._activeConvId = e, this._conversations.unshift({ id: e, title: t, messages: [...this._messages], createdAt: Date.now() });
    }
    this._saveConversations();
  }
  _hasConnectedServers() {
    return Object.values(this._serverStatuses).some((t) => t?.connected);
  }
}
customElements.get("mcp-drop") || customElements.define("mcp-drop", Wt);
const Yt = {
  _tools: [],
  register(r) {
    this._tools = r;
  },
  get definitions() {
    return this._tools.map((r) => ({
      name: r.name,
      description: r.description,
      input_schema: r.input_schema
    }));
  },
  async execute(r, t) {
    const e = this._tools.find((s) => s.name === r);
    if (!e) return { error: `Tool "${r}" not found` };
    try {
      return await e.execute(t);
    } catch (s) {
      return { error: s.message };
    }
  }
};
export {
  z as APIKeyManager,
  nt as AnthropicClient,
  M as MCPConnector,
  Yt as ToolEngine
};
