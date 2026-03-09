import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import APIKeyManager from '../src/core/APIKeyManager.js';

const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;
const originalCustomEvent = globalThis.CustomEvent;

function createStorageMock() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    }
  };
}

beforeEach(() => {
  globalThis.window = new EventTarget();
  globalThis.localStorage = createStorageMock();
  if (!globalThis.CustomEvent) {
    globalThis.CustomEvent = class CustomEvent extends Event {
      constructor(type, options = {}) {
        super(type);
        this.detail = options.detail;
      }
    };
  }
  APIKeyManager.clear();
});

afterEach(() => {
  APIKeyManager.clear();
  globalThis.window = originalWindow;
  globalThis.localStorage = originalLocalStorage;
  globalThis.CustomEvent = originalCustomEvent;
});

test('stores trimmed API key in memory and localStorage when persist=true', () => {
  APIKeyManager.set('  sk-ant-demo  ', true);

  assert.equal(APIKeyManager.get(), 'sk-ant-demo');
  assert.equal(globalThis.localStorage.getItem('mcp_chat_key'), 'sk-ant-demo');
});

test('does not read localStorage when includeStorage=false', () => {
  globalThis.localStorage.setItem('mcp_chat_key', 'sk-ant-stored');

  assert.equal(APIKeyManager.get({ includeStorage: false }), null);
  assert.equal(APIKeyManager.get({ includeStorage: true }), 'sk-ant-stored');
});

test('emits a key change event on set and clear', () => {
  let eventCount = 0;
  globalThis.window.addEventListener('mcp-drop:keychange', () => {
    eventCount += 1;
  });

  APIKeyManager.set('sk-ant-demo', false);
  APIKeyManager.clear();

  assert.equal(eventCount, 2);
});
