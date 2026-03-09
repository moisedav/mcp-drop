import APIKeyManager from './core/APIKeyManager.js';
import AnthropicClient from './core/AnthropicClient.js';
import MCPConnector from './core/MCPConnector.js';

const CORE_VERSION = '0.1.0';
const GITHUB_URL = 'https://github.com/moisedav/mcp-drop';
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful AI assistant with access to external tools via MCP (Model Context Protocol). Use the available tools when needed to help the user accomplish their tasks. Be concise and efficient.\n\nBe concise. When tools return large data (XML, JSON, HTML), extract only what is needed for the user\'s request. Never repeat large data blocks back to the user. If you need specific details, call the tool again with more specific parameters. When the user asks you to modify code, content, or design, inspect only the minimum necessary context and then act. Do not narrate your internal search process to the user. If you already have enough context to make the change, make it directly. For edit requests, prefer one focused inspection and then perform the edit immediately.';
const TOOL_APPROVALS_STORAGE_KEY = 'mcp-drop_tool_approvals';
const MAX_APPROVAL_PREVIEW_CHARS = 2400;
const SETTINGS_ICON = `
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" stroke-width="1.5"/>
    <path d="M13.7655 2.152C13.3985 2 12.9325 2 12.0005 2C11.0685 2 10.6025 2 10.2355 2.152C9.99263 2.25251 9.772 2.3999 9.58617 2.58572C9.40035 2.77155 9.25296 2.99218 9.15245 3.235C9.06045 3.458 9.02345 3.719 9.00945 4.098C9.00294 4.37193 8.92705 4.63973 8.78889 4.87635C8.65073 5.11298 8.45481 5.31069 8.21945 5.451C7.98026 5.58477 7.71104 5.65567 7.43698 5.65707C7.16293 5.65847 6.893 5.59032 6.65245 5.459C6.31645 5.281 6.07345 5.183 5.83245 5.151C5.30677 5.08187 4.77515 5.22431 4.35445 5.547C4.04045 5.79 3.80645 6.193 3.34045 7C2.87445 7.807 2.64045 8.21 2.58945 8.605C2.55509 8.86545 2.57237 9.13012 2.64032 9.38389C2.70826 9.63767 2.82554 9.87556 2.98545 10.084C3.13345 10.276 3.34045 10.437 3.66145 10.639C4.13445 10.936 4.43845 11.442 4.43845 12C4.43845 12.558 4.13445 13.064 3.66145 13.36C3.34045 13.563 3.13245 13.724 2.98545 13.916C2.82554 14.1244 2.70826 14.3623 2.64032 14.6161C2.57237 14.8699 2.55509 15.1345 2.58945 15.395C2.64145 15.789 2.87445 16.193 3.33945 17C3.80645 17.807 4.03945 18.21 4.35445 18.453C4.56289 18.6129 4.80078 18.7302 5.05456 18.7981C5.30833 18.8661 5.573 18.8834 5.83345 18.849C6.07345 18.817 6.31645 18.719 6.65245 18.541C6.893 18.4097 7.16293 18.3415 7.43698 18.3429C7.71104 18.3443 7.98026 18.4152 8.21945 18.549C8.70245 18.829 8.98945 19.344 9.00945 19.902C9.02345 20.282 9.05945 20.542 9.15245 20.765C9.25296 21.0078 9.40035 21.2284 9.58617 21.4143C9.772 21.6001 9.99263 21.7475 10.2355 21.848C10.6025 22 11.0685 22 12.0005 22C12.9325 22 13.3985 22 13.7655 21.848C14.0083 21.7475 14.2289 21.6001 14.4147 21.4143C14.6006 21.2284 14.7479 21.0078 14.8484 20.765C14.9404 20.542 14.9775 20.282 14.9915 19.902C15.0115 19.344 15.2985 18.828 15.7815 18.549C16.0206 18.4152 16.2899 18.3443 16.5639 18.3429C16.838 18.3415 17.1079 18.4097 17.3484 18.541C17.6844 18.719 17.9274 18.817 18.1674 18.849C18.4279 18.8834 18.6926 18.8661 18.9463 18.7981C19.2001 18.7302 19.438 18.6129 19.6465 18.453C19.9615 18.211 20.1944 17.807 20.6604 17C21.1264 16.193 21.3604 15.79 21.4114 15.395C21.4458 15.1345 21.4285 14.8699 21.3606 14.6161C21.2926 14.3623 21.1754 14.1244 21.0154 13.916C20.8674 13.724 20.6605 13.563 20.3395 13.361C20.1054 13.2184 19.9113 13.0187 19.7754 12.7807C19.6395 12.5427 19.5663 12.2741 19.5625 12C19.5625 11.442 19.8665 10.936 20.3395 10.64C20.6605 10.437 20.8684 10.276 21.0154 10.084C21.1754 9.87556 21.2926 9.63767 21.3606 9.38389C21.4285 9.13012 21.4458 8.86545 21.4114 8.605C21.3594 8.211 21.1264 7.807 20.6614 7C20.1944 6.193 19.9615 5.79 19.6465 5.547C19.438 5.38709 19.2001 5.26981 18.9463 5.20187C18.6926 5.13392 18.4279 5.11664 18.1674 5.151C17.9274 5.183 17.6845 5.281 17.3475 5.459C17.107 5.59014 16.8373 5.6582 16.5634 5.6568C16.2896 5.6554 16.0205 5.58459 15.7815 5.451C15.5461 5.31069 15.3502 5.11298 15.212 4.87635C15.0738 4.63973 14.998 4.37193 14.9915 4.098C14.9775 3.718 14.9414 3.458 14.8484 3.235C14.7479 2.99218 14.6006 2.77155 14.4147 2.58572C14.2289 2.3999 14.0083 2.25251 13.7655 2.152Z" stroke="currentColor" stroke-width="1.5"/>
  </svg>
`;

// ── Shared styles ─────────────────────────────────────────
const baseStyles = `
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
`;

// ── Widget styles ─────────────────────────────────────────
const widgetStyles = `
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
`;

// ── Fullpage styles ───────────────────────────────────────
const fullpageStyles = `
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
`;

// ── Shared chat styles ────────────────────────────────────
const chatStyles = `
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

// ─────────────────────────────────────────────────────────
class McpChat extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._messages = [];
    this._conversations = [];
    this._activeConvId = null;
    this._loading = false;
    this._tools = [];
    this._isOpen = false;
    this._error = null;
    this._toolActivity = null;
    this._streamingAssistantText = '';
    this._toolApprovalRequest = null;
    this._pendingToolApprovalResolver = null;
    this._retryCountdown = 0;
    this._sidebarVisible = true;
    this._didSetMobileSidebarDefault = false;
    this._settingsOpen = false;
    this._settingsBusy = false;
    this._showAddServerForm = false;
    this._showKeyEditor = false;
    this._settingsError = null;
    this._serverConfigs = [];
    this._serverStatuses = {};
    this._connector = MCPConnector.createSession();
    this._suspendAttributeSync = false;
    this._serverConfigSignature = '[]';
    this._serverDraft = this._getDefaultServerDraft();
    this._alwaysAllowedTools = this._loadToolApprovalPreferences();
    this._eventsAttached = false;
    this._boundClickHandler = (event) => this._handleClick(event);
    this._boundInputHandler = (event) => this._handleInput(event);
    this._boundKeydownHandler = (event) => this._handleKeydown(event);
    this._boundChangeHandler = (event) => this._handleChange(event);
    this._boundApiKeyChangeHandler = () => this._handleApiKeyChange();
  }

  static get observedAttributes() {
    return ['title', 'placeholder', 'system-prompt', 'mcp-servers', 'persist-key', 'mode', 'history'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'mcp-servers' && oldValue === newValue) return;
    if (oldValue === newValue || !this.isConnected || this._suspendAttributeSync) return;

    void this._applyAttributes();
  }

  async connectedCallback() {
    try {
      await this._applyAttributes({ forceServerRefresh: true });
    } catch (err) {
      this._error = err?.message || 'Failed to initialize mcp-drop';
    }

    window.addEventListener('mcp-drop:keychange', this._boundApiKeyChangeHandler);
    this._render();
    this._attachEvents();
  }

  disconnectedCallback() {
    window.removeEventListener('mcp-drop:keychange', this._boundApiKeyChangeHandler);
    this._connector.disconnectAll();
    this._resolveToolApproval(false, { skipRender: true });

    if (this._eventsAttached) {
      this.shadowRoot.removeEventListener('click', this._boundClickHandler);
      this.shadowRoot.removeEventListener('input', this._boundInputHandler);
      this.shadowRoot.removeEventListener('keydown', this._boundKeydownHandler);
      this.shadowRoot.removeEventListener('change', this._boundChangeHandler);
      this._eventsAttached = false;
    }
  }

  async _applyAttributes({ forceServerRefresh = false } = {}) {
    const previousShowHistory = this._showHistory;
    const previousServerSignature = this._serverConfigSignature;

    this._mode = this.getAttribute('mode') || 'widget';
    this._title = this.getAttribute('title') || 'mcp-drop';
    this._placeholder = this.getAttribute('placeholder') || 'Type a message...';
    this._systemPrompt = this.getAttribute('system-prompt') || DEFAULT_SYSTEM_PROMPT;
    this._persistKey = this.hasAttribute('persist-key');
    this._showHistory = this.hasAttribute('history');
    if (this._isMobileViewport() && this._mode === 'fullpage' && this._showHistory && !this._didSetMobileSidebarDefault) {
      this._sidebarVisible = false;
      this._didSetMobileSidebarDefault = true;
    }

    const { servers, error } = this._readServerConfigsFromAttribute();
    this._serverConfigs = servers;
    this._serverConfigSignature = this._getServerConfigSignature(servers);
    this._settingsError = error;

    if (this._showHistory && !previousShowHistory) {
      this._loadConversations();
    }
    if (!this._showHistory && previousShowHistory) {
      this._activeConvId = null;
    }

    this._hasKey = !!this._getApiKey();

    if (forceServerRefresh || previousServerSignature !== this._serverConfigSignature) {
      await this._refreshServerConnections({ silent: true });
    } else {
      this._serverStatuses = this._connector.statuses;
      this._tools = this._connector.tools;
    }

    if (this.isConnected) {
      this._render();
      this._attachEvents();
    }
  }

  _readServerConfigsFromAttribute() {
    const mcpAttr = this.getAttribute('mcp-servers');
    if (!mcpAttr) {
      return { servers: [], error: null };
    }

    try {
      const servers = JSON.parse(mcpAttr);
      return {
        servers: Array.isArray(servers)
          ? servers.map((server) => ({
              name: typeof server?.name === 'string' ? server.name.trim() : '',
              url: typeof server?.url === 'string' ? server.url.trim() : '',
              type: server?.type || 'bridge'
            }))
          : [],
        error: null
      };
    } catch (err) {
      return {
        servers: [],
        error: err?.message || 'Invalid mcp-servers attribute'
      };
    }
  }

  _getServerConfigSignature(servers = this._serverConfigs) {
    return JSON.stringify(
      (Array.isArray(servers) ? servers : []).map(({ name, url, type }) => ({ name, url, type }))
    );
  }

  _handleApiKeyChange() {
    const hasKey = !!this._getApiKey();
    this._hasKey = hasKey;
    if (!hasKey) {
      this._showKeyEditor = false;
      this._messages = [];
      this._clearTransientChatState();
    }

    if (this.isConnected) {
      this._render();
      this._attachEvents();
    }
  }

  // ── Storage ─────────────────────────────────────────────
  _loadConversations() {
    if (!this._showHistory) return;
    try {
      const saved = localStorage.getItem('mcp_chat_conversations');
      const parsed = saved ? JSON.parse(saved) : [];
      this._conversations = Array.isArray(parsed)
        ? parsed
          .filter(conversation => conversation && typeof conversation === 'object')
          .map(conversation => ({
            id: String(conversation.id || Date.now()),
            title: String(conversation.title || 'New chat'),
            createdAt: Number(conversation.createdAt || Date.now()),
            messages: Array.isArray(conversation.messages)
              ? conversation.messages
                .filter(message =>
                  message &&
                  (message.role === 'user' || message.role === 'assistant') &&
                  typeof message.content === 'string'
                )
                .map(message => ({ role: message.role, content: message.content }))
              : []
          }))
        : [];
    } catch {
      this._conversations = [];
    }
  }

  _saveConversations() {
    if (!this._showHistory) return;
    try {
      localStorage.setItem('mcp_chat_conversations', JSON.stringify(this._conversations));
    } catch {}
  }

  _loadToolApprovalPreferences() {
    try {
      const stored = localStorage.getItem(TOOL_APPROVALS_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      return new Set(
        Array.isArray(parsed)
          ? parsed
            .filter((name) => typeof name === 'string' && name.trim())
            .map((name) => name.trim())
          : []
      );
    } catch {
      return new Set();
    }
  }

  _saveToolApprovalPreferences() {
    try {
      localStorage.setItem(
        TOOL_APPROVALS_STORAGE_KEY,
        JSON.stringify(Array.from(this._alwaysAllowedTools).sort())
      );
    } catch {}
  }

  _newConversation() {
    if (this._messages.length > 0) {
      const title = this._getConversationTitle(this._messages);
      const existing = this._conversations.find(c => c.id === this._activeConvId);
      if (existing) {
        existing.messages = [...this._messages];
        existing.title = title;
      } else {
        this._conversations.unshift({
          id: Date.now().toString(),
          title,
          messages: [...this._messages],
          createdAt: Date.now()
        });
      }
      this._saveConversations();
    }
    this._messages = [];
    this._activeConvId = null;
    this._clearTransientChatState();
    this._render();
    this._attachEvents();
  }

  _loadConversation(id) {
    const conv = this._conversations.find(c => c.id === id);
    if (!conv) return;
    this._clearTransientChatState();
    this._messages = conv.messages.map(message => ({ role: message.role, content: message.content }));
    this._activeConvId = id;
    if (this._isMobileViewport()) {
      this._sidebarVisible = false;
    }
    this._render();
    this._attachEvents();
    this._scrollToBottom(true);
  }

  _deleteConversation(id) {
    this._conversations = this._conversations.filter(c => c.id !== id);
    if (this._activeConvId === id) {
      this._clearTransientChatState();
      this._messages = [];
      this._activeConvId = null;
    }
    this._saveConversations();
    this._render();
    this._attachEvents();
  }

  _clearTransientChatState() {
    this._streamingAssistantText = '';
    this._toolActivity = null;
    this._retryCountdown = 0;
    this._error = null;
    this._resolveToolApproval(false, { skipRender: true });
  }

  // ── Render ───────────────────────────────────────────────
  _render() {
    if (this._mode === 'fullpage') {
      this._renderFullpage();
    } else {
      this._renderWidget();
    }
  }

  _renderWidget() {
    const statusClass = this._loading
      ? 'loading'
      : (this._hasConnectedServers() ? '' : 'disconnected');

    this.shadowRoot.innerHTML = `
      <style>${baseStyles}${widgetStyles}${chatStyles}</style>
      <button class="fab" id="fab">
        ${this._isOpen
          ? '✕'
          : '<svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.96 9.96 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" fill="currentColor"/></svg>'
        }
      </button>
      <div class="widget-panel ${this._isOpen ? 'open' : ''}" id="panel">
        <div class="panel-header">
          <div class="panel-header-left">
            <div class="status-dot ${statusClass}"></div>
            <span class="panel-title">${this._escapeHtml(this._title)}</span>
            ${this._tools.length > 0 ? `<span class="metric-badge">${this._tools.length} tools</span>` : ''}
          </div>
          <div class="header-actions">
            <button class="icon-btn" id="settings-toggle" title="Settings" aria-label="Settings">${SETTINGS_ICON}</button>
            ${this._hasKey ? '<button class="icon-btn" id="reset-key" title="Reset API key">🔑</button>' : ''}
            <button class="icon-btn" id="close" title="Close">✕</button>
          </div>
        </div>
        ${this._renderChatBody()}
        ${this._renderSettingsPanel()}
      </div>
    `;
  }

  _renderFullpage() {
    const activeTitle = this._activeConvId
      ? this._conversations.find(c => c.id === this._activeConvId)?.title || this._title
      : this._title;
    const mobileSidebarClass = this._isMobileViewport() && this._sidebarVisible ? 'mobile-sidebar-open' : '';

    this.shadowRoot.innerHTML = `
      <style>${baseStyles}${fullpageStyles}${chatStyles}</style>
      <div class="fullpage ${mobileSidebarClass}">
        ${this._showHistory && this._isMobileViewport() && this._sidebarVisible ? `
          <button class="sidebar-overlay" id="sidebar-overlay" aria-label="Close sidebar"></button>
        ` : ''}
        ${this._showHistory ? `
          <div class="sidebar ${this._sidebarVisible ? '' : 'hidden'}" id="sidebar">
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
                ${this._conversations.map(c => `
                  <div class="conv-item ${c.id === this._activeConvId ? 'active' : ''}" data-id="${this._escapeHtml(c.id)}">
                    <span class="conv-title">${this._escapeHtml(c.title)}</span>
                    <button class="conv-delete" data-delete="${this._escapeHtml(c.id)}">✕</button>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            <div class="sidebar-footer">
              <div class="key-status" id="key-status">
                <div class="key-dot ${this._hasKey ? '' : 'disconnected'}"></div>
                <span class="key-label">${this._hasKey ? 'API key connected' : 'No API key'}</span>
                ${this._hasKey ? '<span class="key-change-hint">change</span>' : ''}
              </div>
              <div class="sidebar-meta">
                <span class="sidebar-meta-item">~${this._formatTokenCount(this._getEstimatedTokenUsage())} tokens</span>
                ${this._retryCountdown > 0 ? `<span class="sidebar-meta-item retry">Retrying in ${this._retryCountdown}s</span>` : ''}
              </div>
            </div>
          </div>
        ` : ''}

        <div class="chat-main">
          <div class="chat-topbar">
            ${this._showHistory ? `
              <button class="toggle-sidebar-btn" id="toggle-sidebar">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M10 6v12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              </button>
            ` : ''}
            <span class="chat-title">${this._escapeHtml(activeTitle)}</span>
            ${this._tools.length > 0 ? `<span class="tools-badge">${this._tools.length} tools active</span>` : ''}
            <div class="header-actions ${this._tools.length > 0 ? '' : 'push-right'}">
              <button class="icon-btn" id="settings-toggle" title="Settings" aria-label="Settings">${SETTINGS_ICON}</button>
              ${this._hasKey && !this._showHistory ? '<button class="icon-btn" id="reset-key" title="Reset API key">🔑</button>' : ''}
            </div>
          </div>
          ${this._renderChatBody()}
          ${this._renderSettingsPanel()}
        </div>
      </div>
    `;
  }

  _renderChatBody() {
    if (!this._hasKey) {
      return `
        <div class="key-form">
          <div class="key-icon">🔑</div>
          <div class="key-title">Enter API Key</div>
          <div class="key-sub">Your Anthropic API key stays in your browser.<br/>Get one at <span class="key-link">console.anthropic.com</span></div>
          <input class="key-input" id="key-input" type="password" placeholder="sk-ant-..." />
          <button class="key-btn" id="key-btn">Connect</button>
        </div>
      `;
    }

    const shouldShowEmptyState = this._messages.length === 0
      && !this._streamingAssistantText
      && !this._toolApprovalRequest
      && !this._loading;

    return `
      <div class="messages-area" id="messages-area">
        <div class="messages-inner">
          ${shouldShowEmptyState ? `
            <div class="empty-state">
              <div class="empty-greeting">How can I help?</div>
            </div>
          ` : this._messages.map(m => typeof m.content === 'string' ? `
            <div class="bubble ${m.role === 'user' ? 'user' : 'assistant'}">${this._escapeHtml(m.content)}</div>
          ` : '').join('')}
          ${this._streamingAssistantText ? `
            <div class="bubble assistant streaming" data-streaming-assistant>${this._escapeHtml(this._streamingAssistantText)}</div>
          ` : ''}
          ${this._toolApprovalRequest ? this._renderToolApprovalCard() : ''}
          ${this._retryCountdown > 0 ? `
            <div class="tool-badge info">Retrying after rate limit in ${this._retryCountdown}s</div>
          ` : ''}
          ${this._toolActivity ? `
            <div class="tool-badge"><span class="spin">⚙</span> Running: ${this._escapeHtml(this._toolActivity)}</div>
          ` : ''}
          ${this._loading && !this._toolActivity && !this._toolApprovalRequest && !this._streamingAssistantText ? `
            <div class="typing"><span></span><span></span><span></span></div>
          ` : ''}
        </div>
      </div>
      ${this._error ? `<div class="error-bar">⚠ ${this._escapeHtml(this._error)}</div>` : ''}
      <div class="input-wrap">
        <div class="composer-shell">
          <div class="input-box">
            <textarea id="input" placeholder="${this._escapeHtml(this._placeholder)}" rows="1"></textarea>
          </div>
          <button class="send-btn" id="send">↑</button>
        </div>
      </div>
    `;
  }

  _renderToolApprovalCard() {
    if (!this._toolApprovalRequest) return '';

    return `
      <div class="approval-card">
        <div class="approval-header">Tool approval required</div>
        <div class="approval-title">${this._escapeHtml(this._toolApprovalRequest.name)}</div>
        <div class="approval-description">
          ${this._escapeHtml(this._toolApprovalRequest.description || 'This tool wants to run with the parameters below.')}
        </div>
        <div class="approval-params-label">Parameters</div>
        <pre class="approval-params">${this._escapeHtml(this._formatApprovalParams(this._toolApprovalRequest.input))}</pre>
        <label class="approval-checkbox">
          <input type="checkbox" id="tool-approval-always" ${this._toolApprovalRequest.alwaysAllow ? 'checked' : ''} />
          Always allow this tool
        </label>
        <div class="approval-actions">
          <button class="settings-action" id="tool-approval-allow">Allow</button>
          <button class="settings-action secondary" id="tool-approval-deny">Deny</button>
        </div>
      </div>
    `;
  }

  _renderSettingsPanel() {
    const currentKey = this._getApiKey();

    return `
      <div class="settings-backdrop ${this._settingsOpen ? 'open' : ''}" id="settings-backdrop"></div>
      <aside class="settings-panel ${this._settingsOpen ? 'open' : ''}" id="settings-panel">
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
              ${this._serverConfigs.length > 0 ? this._serverConfigs.map((server, index) => {
                const status = this._serverStatuses[server.name] || {};
                const detail = [
                  this._formatServerType(status.transport || server.type),
                  server.url || ''
                ].filter(Boolean).join(' · ');

                return `
                  <div class="server-item">
                    <div class="server-status-dot ${status.connected ? '' : 'offline'}"></div>
                    <div class="server-meta">
                      <div class="server-name">${this._escapeHtml(server.name)}</div>
                      <div class="server-detail">${status.connected ? 'Connected' : 'Disconnected'} · ${this._escapeHtml(detail)}</div>
                      ${status.error ? `<div class="server-detail">${this._escapeHtml(status.error)}</div>` : ''}
                    </div>
                    <button class="server-remove" data-remove-server-index="${index}">Remove</button>
                  </div>
                `;
              }).join('') : `
                <div class="settings-note">No MCP servers configured yet.</div>
              `}
            </div>

            <div class="settings-buttons">
              <button class="settings-action secondary" id="add-server-toggle">${this._showAddServerForm ? 'Hide form' : 'Add Server'}</button>
            </div>

            ${this._showAddServerForm ? `
              <div class="server-form">
                <div class="settings-label">Server name</div>
                <input class="settings-input" id="settings-server-name" type="text" placeholder="my-server" value="${this._escapeHtml(this._serverDraft.name)}" />

                <div class="settings-label">Type</div>
                <select class="settings-select" id="settings-server-type">
                  <option value="remote" ${this._serverDraft.type === 'remote' ? 'selected' : ''}>Remote URL (HTTP/SSE)</option>
                  <option value="bridge" ${this._serverDraft.type === 'bridge' ? 'selected' : ''}>Local via Bridge</option>
                </select>

                <div class="settings-label">${this._serverDraft.type === 'bridge' ? 'Bridge URL' : 'Server URL'}</div>
                <input class="settings-input" id="settings-server-url" type="url" placeholder="${this._escapeHtml(this._getServerDraftPlaceholder())}" value="${this._escapeHtml(this._serverDraft.url)}" />

                ${this._serverDraft.type === 'bridge' ? `
                  <div class="settings-note">Use a local bridge URL such as <code>http://localhost:3333</code>.</div>
                ` : `
                  <div class="settings-note">Use a remote MCP endpoint that supports Streamable HTTP or SSE.</div>
                `}

                ${this._settingsError ? `<div class="settings-error">${this._escapeHtml(this._settingsError)}</div>` : ''}

                <div class="settings-buttons">
                  <button class="settings-action" id="settings-connect-server" ${this._settingsBusy ? 'disabled' : ''}>${this._settingsBusy ? 'Connecting...' : 'Connect'}</button>
                  <button class="settings-action secondary" id="settings-cancel-server">Cancel</button>
                </div>
              </div>
            ` : ''}
          </section>

          <section class="settings-section">
            <div class="settings-section-title">API Key</div>
            <div class="settings-row">
              <div class="settings-value">${this._escapeHtml(this._maskApiKey(currentKey))}</div>
              <button class="settings-action secondary" id="change-key-toggle">${this._showKeyEditor ? 'Cancel' : 'Change key'}</button>
            </div>

            ${this._showKeyEditor ? `
              <div class="server-form">
                <div class="settings-label">Anthropic API key</div>
                <input class="settings-input" id="settings-api-key" type="password" placeholder="sk-ant-..." />
                <div class="settings-buttons">
                  <button class="settings-action" id="settings-save-key">Save key</button>
                </div>
              </div>
            ` : ''}
          </section>

          <section class="settings-section">
            <div class="settings-section-title">About</div>
            <div class="settings-value">@mcp-drop/core v${CORE_VERSION}</div>
            <div class="settings-note">Connect Claude to anything. Drop it anywhere.</div>
            <a class="settings-link" href="${GITHUB_URL}" target="_blank" rel="noreferrer">GitHub</a>
          </section>
        </div>
      </aside>
    `;
  }

  // ── Events ───────────────────────────────────────────────
  _attachEvents() {
    if (this._eventsAttached) return;

    this.shadowRoot.addEventListener('click', this._boundClickHandler);
    this.shadowRoot.addEventListener('input', this._boundInputHandler);
    this.shadowRoot.addEventListener('keydown', this._boundKeydownHandler);
    this.shadowRoot.addEventListener('change', this._boundChangeHandler);
    this._eventsAttached = true;
    this._syncComposerInputState();
  }

  _handleClick(event) {
    const target = event.target.closest('button, .conv-item, .key-status');
    if (!target) return;

    if (target.id === 'fab') {
      this._isOpen = !this._isOpen;
      if (!this._isOpen) this._closeSettings();
      this._render();
      if (this._isOpen) this._scrollToBottom(true);
      if (this._isOpen) setTimeout(() => this.shadowRoot.getElementById('input')?.focus(), 300);
      return;
    }

    if (target.id === 'close') {
      this._isOpen = false;
      this._closeSettings();
      this._render();
      return;
    }

    if (target.id === 'sidebar-overlay') {
      this._sidebarVisible = false;
      this._render();
      return;
    }

    if (target.id === 'toggle-sidebar' || target.dataset.action === 'toggle-sidebar') {
      this._sidebarVisible = !this._sidebarVisible;
      this._render();
      return;
    }

    if (target.id === 'new-chat') {
      this._newConversation();
      return;
    }

    if (target.classList.contains('conv-item')) {
      if (event.target.closest('.conv-delete')) return;
      this._loadConversation(target.dataset.id);
      return;
    }

    if (target.classList.contains('conv-delete')) {
      this._deleteConversation(target.dataset.delete);
      return;
    }

    if (target.id === 'key-btn') {
      this._saveKey();
      return;
    }

    if (target.id === 'key-status') {
      this._openKeySettings();
      return;
    }

    if (target.id === 'reset-key') {
      this._resetKey();
      return;
    }

    if (target.id === 'settings-toggle') {
      this._settingsOpen = !this._settingsOpen;
      this._render();
      return;
    }

    if (target.id === 'settings-close' || target.id === 'settings-backdrop') {
      this._closeSettings();
      this._render();
      return;
    }

    if (target.id === 'add-server-toggle') {
      this._showAddServerForm = !this._showAddServerForm;
      this._settingsError = null;
      if (!this._showAddServerForm) this._serverDraft = this._getDefaultServerDraft();
      this._render();
      return;
    }

    if (target.id === 'settings-cancel-server') {
      this._showAddServerForm = false;
      this._settingsError = null;
      this._serverDraft = this._getDefaultServerDraft();
      this._render();
      return;
    }

    if (target.id === 'settings-connect-server') {
      void this._connectServerFromSettings();
      return;
    }

    if (target.id === 'change-key-toggle') {
      this._showKeyEditor = !this._showKeyEditor;
      this._render();
      return;
    }

    if (target.id === 'settings-save-key') {
      this._saveKey(true);
      return;
    }

    if (target.id === 'tool-approval-allow') {
      this._resolveToolApproval(true);
      return;
    }

    if (target.id === 'tool-approval-deny') {
      this._resolveToolApproval(false);
      return;
    }

    if (target.dataset.removeServerIndex !== undefined) {
      void this._removeServerAt(Number(target.dataset.removeServerIndex));
      return;
    }

    if (target.id === 'send') {
      void this._send();
    }
  }

  _handleInput(event) {
    if (event.target.id === 'settings-server-name') {
      this._serverDraft.name = event.target.value;
      return;
    }

    if (event.target.id === 'settings-server-url') {
      this._serverDraft.url = event.target.value;
      return;
    }

    if (event.target.id === 'input') {
      const btn = this.shadowRoot.getElementById('send');
      if (btn) {
        btn.className = event.target.value.trim() ? 'send-btn active' : 'send-btn';
      }
      this._resizeComposerInput(event.target);
    }
  }

  _handleKeydown(event) {
    if (event.target.id === 'key-input' && event.key === 'Enter') {
      this._saveKey();
      return;
    }

    if (event.target.id === 'settings-api-key' && event.key === 'Enter') {
      this._saveKey(true);
      return;
    }

    if (event.target.id === 'input' && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this._send();
    }
  }

  _handleChange(event) {
    if (event.target.id === 'settings-server-type') {
      this._serverDraft.type = event.target.value;
      this._settingsError = null;
      this._render();
      return;
    }

    if (event.target.id === 'tool-approval-always' && this._toolApprovalRequest) {
      this._toolApprovalRequest = {
        ...this._toolApprovalRequest,
        alwaysAllow: event.target.checked
      };
    }
  }

  _saveKey(fromSettings = false) {
    const inputId = fromSettings ? 'settings-api-key' : 'key-input';
    const val = this.shadowRoot.getElementById(inputId)?.value?.trim();
    if (!val) return;
    APIKeyManager.set(val, this._persistKey);
    this._hasKey = true;
    this._error = null;
    this._settingsError = null;
    this._showKeyEditor = false;
    this._render();
    this._attachEvents();
    setTimeout(() => this.shadowRoot.getElementById('input')?.focus(), 100);
  }

  async _send() {
    const input = this.shadowRoot.getElementById('input');
    const text = input?.value?.trim();
    if (!text || this._loading) return;

    this._error = null;
    this._toolActivity = null;
    this._retryCountdown = 0;
    this._streamingAssistantText = '';
    this._resolveToolApproval(false, { skipRender: true });
    this._messages.push({ role: 'user', content: text });
    if (input) input.value = '';
    this._loading = true;
    this._render();
    this._attachEvents();
    this._scrollToBottom(true);

    try {
      const reply = await AnthropicClient.sendWithTools({
        messages: this._messages.map(m => ({ role: m.role, content: m.content })),
        tools: this._tools,
        systemPrompt: this._systemPrompt,
        onTextDelta: ({ text: partialText }) => {
          this._updateStreamingAssistantText(partialText);
        },
        onToolCall: (name) => {
          this._updateToolActivity(name);
        },
        onToolApproval: (request) => this._requestToolApproval(request),
        onRetryCountdown: (seconds) => this._updateRetryCountdown(seconds)
      });

      const finalReply = reply || this._streamingAssistantText;
      if (finalReply) {
        this._messages.push({ role: 'assistant', content: finalReply });
      }

      if (this._showHistory) {
        this._upsertActiveConversation();
      }
    } catch (err) {
      if (this._streamingAssistantText) {
        this._messages.push({ role: 'assistant', content: this._streamingAssistantText });
        if (this._showHistory) {
          this._upsertActiveConversation();
        }
      }
      this._error = err?.message || 'Message send failed';
    } finally {
      this._loading = false;
      this._toolActivity = null;
      this._retryCountdown = 0;
      this._streamingAssistantText = '';
      this._resolveToolApproval(false, { skipRender: true });
      this._render();
      this._attachEvents();
      this._scrollToBottom(true);
    }
  }

  _scrollToBottom(immediate = false) {
    const area = this.shadowRoot.getElementById('messages-area');
    if (!area) return;

    const applyScroll = () => {
      area.scrollTop = area.scrollHeight;
    };

    applyScroll();
    if (!immediate) {
      requestAnimationFrame(applyScroll);
    }
  }

  _isMobileViewport() {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches;
  }

  _getDefaultServerDraft() {
    return { name: '', type: 'remote', url: '' };
  }

  _getServerDraftPlaceholder() {
    return this._serverDraft.type === 'bridge'
      ? 'http://localhost:3333'
      : 'https://your-mcp-server.example';
  }

  _closeSettings() {
    this._settingsOpen = false;
    this._showAddServerForm = false;
    this._showKeyEditor = false;
    this._settingsError = null;
  }

  _requestToolApproval({ name, description, input }) {
    if (this._alwaysAllowedTools.has(name)) {
      return Promise.resolve({ allowed: true, alwaysAllow: true });
    }

    this._toolActivity = null;
    this._resolveToolApproval(false, { skipRender: true });
    this._toolApprovalRequest = {
      name,
      description,
      input,
      alwaysAllow: false
    };
    this._render();
    this._attachEvents();
    this._scrollToBottom();

    return new Promise((resolve) => {
      this._pendingToolApprovalResolver = resolve;
    });
  }

  _resolveToolApproval(allowed, { skipRender = false } = {}) {
    const request = this._toolApprovalRequest;
    const resolver = this._pendingToolApprovalResolver;

    if (!request && !resolver) return;

    if (allowed && request?.alwaysAllow && request.name) {
      this._alwaysAllowedTools.add(request.name);
      this._saveToolApprovalPreferences();
    }

    this._toolApprovalRequest = null;
    this._pendingToolApprovalResolver = null;

    if (!skipRender && this.isConnected) {
      this._render();
      this._attachEvents();
    }

    resolver?.({ allowed, alwaysAllow: Boolean(allowed && request?.alwaysAllow) });
  }

  _updateStreamingAssistantText(text) {
    const normalizedText = typeof text === 'string' ? text : '';
    const hadText = Boolean(this._streamingAssistantText);
    this._streamingAssistantText = normalizedText;

    const bubble = this.shadowRoot.querySelector('[data-streaming-assistant]');
    if (!hadText || !bubble) {
      this._render();
      this._attachEvents();
      this._scrollToBottom(true);
      return;
    }

    bubble.textContent = normalizedText;
    this._scrollToBottom(true);
  }

  _updateToolActivity(name) {
    this._toolActivity = name;
    this._render();
    this._attachEvents();
    this._scrollToBottom(true);
  }

  _updateRetryCountdown(seconds) {
    this._retryCountdown = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;

    if (!this.isConnected) return;
    this._render();
    this._attachEvents();
    this._scrollToBottom(true);
  }

  _resizeComposerInput(textarea) {
    if (!textarea) return;

    textarea.style.height = '0px';
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 24), 160);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 160 ? 'auto' : 'hidden';
  }

  _syncComposerInputState() {
    const textarea = this.shadowRoot?.getElementById('input');
    const sendButton = this.shadowRoot?.getElementById('send');

    if (sendButton && textarea) {
      sendButton.className = textarea.value.trim() ? 'send-btn active' : 'send-btn';
    }

    this._resizeComposerInput(textarea);
  }

  _formatApprovalParams(input) {
    let serialized = '';

    try {
      serialized = JSON.stringify(input ?? {}, null, 2);
    } catch {
      serialized = '{"error":"Parameters could not be serialized"}';
    }

    if (serialized.length <= MAX_APPROVAL_PREVIEW_CHARS) {
      return serialized;
    }

    const truncatedChars = serialized.length - MAX_APPROVAL_PREVIEW_CHARS;
    return `${serialized.slice(0, MAX_APPROVAL_PREVIEW_CHARS)}\n\n... ${truncatedChars} more characters`;
  }

  _maskApiKey(key) {
    if (!key) return 'No API key connected';
    if (key.length <= 10) return `${key.slice(0, 4)}***`;
    return `${key.slice(0, 7)}***${key.slice(-4)}`;
  }

  _formatServerType(type) {
    if (type === 'streamable-http') return 'Remote URL (HTTP)';
    if (type === 'sse') return 'Remote URL (SSE)';
    if (type === 'remote') return 'Remote URL (HTTP/SSE)';
    if (type === 'bridge') return 'Bridge URL';
    return 'MCP Server';
  }

  _getEstimatedTokenUsage() {
    const liveMessages = [...this._messages];

    if (this._streamingAssistantText) {
      liveMessages.push({ role: 'assistant', content: this._streamingAssistantText });
    }

    return AnthropicClient.estimateConversationTokens({
      messages: liveMessages,
      systemPrompt: this._systemPrompt
    });
  }

  _formatTokenCount(tokens) {
    const normalized = Number.isFinite(tokens) ? Math.max(0, Math.round(tokens)) : 0;
    return normalized.toLocaleString('en-US');
  }

  _escapeHtml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  _syncServerAttribute() {
    const serializable = this._serverConfigs.map(({ name, url, type }) => ({ name, url, type }));
    this._suspendAttributeSync = true;
    try {
      if (serializable.length > 0) {
        this.setAttribute('mcp-servers', JSON.stringify(serializable));
      } else {
        this.removeAttribute('mcp-servers');
      }
      this._serverConfigSignature = this._getServerConfigSignature(serializable);
    } finally {
      this._suspendAttributeSync = false;
    }
  }

  async _refreshServerConnections({ silent = false } = {}) {
    if (!silent) {
      this._settingsBusy = true;
      this._render();
      this._attachEvents();
    }

    try {
      this._tools = await this._connector.connect(this._serverConfigs);
      this._serverStatuses = this._connector.statuses;
    } catch (err) {
      this._tools = [];
      this._serverStatuses = {};
      const message = err?.message || 'Failed to refresh MCP servers';
      if (silent) this._error = message;
      else this._settingsError = message;
    } finally {
      this._settingsBusy = false;

      if (!silent) {
        this._render();
        this._attachEvents();
      }
    }
  }

  async _connectServerFromSettings() {
    const name = this._serverDraft.name.trim();
    const url = this._serverDraft.url.trim();
    const type = this._serverDraft.type === 'bridge' ? 'bridge' : 'remote';

    if (!name) {
      this._settingsError = 'Server name is required.';
      this._render();
      this._attachEvents();
      return;
    }
    if (!url) {
      this._settingsError = type === 'bridge'
        ? 'Bridge URL is required.'
        : 'URL is required for remote servers.';
      this._render();
      this._attachEvents();
      return;
    }
    if (this._serverConfigs.some(server => server.name.toLowerCase() === name.toLowerCase())) {
      this._settingsError = `A server named "${name}" already exists.`;
      this._render();
      this._attachEvents();
      return;
    }

    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Enter an http:// or https:// URL.');
      }
    } catch {
      this._settingsError = 'Enter a valid http:// or https:// URL.';
      this._render();
      this._attachEvents();
      return;
    }

    this._settingsError = null;
    this._serverConfigs = [...this._serverConfigs, { name, url, type }];
    this._syncServerAttribute();
    await this._refreshServerConnections();
    this._showAddServerForm = false;
    this._serverDraft = this._getDefaultServerDraft();
    this._settingsOpen = true;
    this._render();
    this._attachEvents();
  }

  async _removeServerAt(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this._serverConfigs.length) return;
    this._serverConfigs = this._serverConfigs.filter((_, serverIndex) => serverIndex !== index);
    this._syncServerAttribute();
    await this._refreshServerConnections();
    this._settingsOpen = true;
    this._render();
    this._attachEvents();
  }

  _getApiKey() {
    return APIKeyManager.get({ includeStorage: this._persistKey });
  }

  _resetKey() {
    APIKeyManager.clear();
    this._hasKey = false;
    this._messages = [];
    this._clearTransientChatState();
    this._showKeyEditor = false;
    this._render();
    this._attachEvents();
  }

  _openKeySettings() {
    this._settingsOpen = true;
    this._showKeyEditor = true;
    this._render();
    this._attachEvents();
    setTimeout(() => this.shadowRoot.getElementById('settings-api-key')?.focus(), 50);
  }

  _getConversationTitle(messages = this._messages) {
    const firstMessage = messages.find(message => message.role === 'user' && typeof message.content === 'string');
    return firstMessage?.content?.slice(0, 40) || 'New chat';
  }

  _upsertActiveConversation() {
    const title = this._getConversationTitle();

    if (this._activeConvId) {
      const conversation = this._conversations.find(item => item.id === this._activeConvId);
      if (conversation) {
        conversation.messages = [...this._messages];
        conversation.title = title;
      }
    } else {
      const id = Date.now().toString();
      this._activeConvId = id;
      this._conversations.unshift({ id, title, messages: [...this._messages], createdAt: Date.now() });
    }

    this._saveConversations();
  }

  _hasConnectedServers() {
    return Object.values(this._serverStatuses).some(status => status?.connected);
  }
}

if (!customElements.get('mcp-drop')) {
  customElements.define('mcp-drop', McpChat);
}
export default McpChat;
