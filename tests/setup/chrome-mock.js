/**
 * In-memory chrome.storage mock.
 *
 * Uses a plain object as the backing store so that get() and set() share real
 * state — contract tests can write via one path and read via another exactly
 * as the extension does at runtime.
 *
 * Reset with resetStorage() in beforeEach so tests don't bleed state.
 */

let _store = {};

export function resetStorage() {
  _store = {};
}

export function getStore() {
  return _store;
}

const chromeMock = {
  storage: {
    local: {
      get(keys, callback) {
        const result = {};
        const ks = Array.isArray(keys) ? keys : [keys];
        for (const k of ks) {
          if (Object.prototype.hasOwnProperty.call(_store, k)) 
            result[k] = JSON.parse(JSON.stringify(_store[k])); // deep clone
        }
        
        if (callback) 
            callback(result);

        return Promise.resolve(result);
      },
      set(items, callback) {
        for (const [k, v] of Object.entries(items)) {
          _store[k] = JSON.parse(JSON.stringify(v)); // deep clone
        }
        
        if (callback) 
            callback();
        
        return Promise.resolve();
      },
      remove(keys, callback) {
        const ks = Array.isArray(keys) ? keys : [keys];
        for (const k of ks) 
            delete _store[k];
        
        if (callback) 
            callback();

        return Promise.resolve();
      },
      clear(callback) {
        _store = {};
        if (callback) 
            callback();
        
        return Promise.resolve();
      },
    },
    onChanged: {
      addListener() {},
      removeListener() {},
    },
  },
  runtime: {
    lastError: null,
    onInstalled: { addListener() {} },
    onStartup:   { addListener() {} },
    onMessage:   { addListener() {} },
    sendMessage() {},
  },
  contextMenus: {
    create:    vi.fn(),
    removeAll: vi.fn(() => Promise.resolve()),
    onClicked: { addListener() {} },
  },
  tabs: {
    sendMessage: vi.fn(),
  },
};

globalThis.chrome = chromeMock;

// Stub out browser-only globals not available in jsdom/Node
globalThis.importScripts = () => {};


beforeEach(() => {
  resetStorage();
  vi.clearAllMocks();
});
