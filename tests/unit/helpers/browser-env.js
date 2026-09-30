const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS_DIR = path.join(__dirname, '../../../js');

function makeStorage() {
  const data = new Map();
  return {
    getItem(key) {
      const name = String(key);
      return data.has(name) ? data.get(name) : null;
    },
    setItem(key, value) {
      data.set(String(key), String(value));
    },
    removeItem(key) {
      data.delete(String(key));
    },
    clear() {
      data.clear();
    },
  };
}

function makeBlockedStorage() {
  const blocked = () => {
    throw new Error('storage blocked');
  };
  return {
    getItem: blocked,
    setItem: blocked,
    removeItem: blocked,
    clear: blocked,
  };
}

function loadScripts(names, options = {}) {
  const search = options.search || '';
  const sessionStorage = options.sessionStorage || makeStorage();
  const localStorage = options.localStorage || makeStorage();
  const replaced = [];
  const context = vm.createContext({
    console: options.console || console,
    sessionStorage,
    localStorage,
    URLSearchParams,
    setTimeout: (...args) => setTimeout(...args),
    clearTimeout: (...args) => clearTimeout(...args),
  });
  context.window = context;
  context.location = {
    search,
    replace(url) {
      replaced.push(url);
    },
  };

  names.forEach(name => {
    const filename = `${name}.js`;
    const code = fs.readFileSync(path.join(JS_DIR, filename), 'utf8');
    vm.runInContext(code, context, { filename });
  });

  return { Breezy: context.Breezy, replaced, context };
}

/** Copies a vm value into this realm so strict asserts can compare it. */
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = { makeStorage, makeBlockedStorage, loadScripts, plain };
