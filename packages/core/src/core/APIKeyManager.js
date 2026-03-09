const APIKeyManager = {
  _key: null,

  _emitChange() {
    try {
      window.dispatchEvent(new CustomEvent('mcp-drop:keychange'));
    } catch {}
  },

  set(key, persist = false) {
    const normalizedKey = typeof key === 'string' ? key.trim() : '';
    this._key = normalizedKey || null;
    if (persist && normalizedKey) {
      try {
        localStorage.setItem('mcp_chat_key', normalizedKey);
      } catch {}
    }
    this._emitChange();
  },

  get(options = {}) {
    const { includeStorage = true } = typeof options === 'boolean'
      ? { includeStorage: options }
      : options;

    if (this._key) return this._key;
    if (!includeStorage) return null;

    try {
      const storedKey = localStorage.getItem('mcp_chat_key');
      return storedKey ? storedKey.trim() : null;
    } catch {
      return null;
    }
  },

  clear() {
    this._key = null;
    try {
      localStorage.removeItem('mcp_chat_key');
    } catch {}
    this._emitChange();
  }
};

export default APIKeyManager;
