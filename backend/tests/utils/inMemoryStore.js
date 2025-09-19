const { randomUUID } = require('crypto');

const stores = new Map();

function getStore(name) {
  if (!stores.has(name)) {
    stores.set(name, []);
  }
  return stores.get(name);
}

function setStore(name, values) {
  stores.set(name, values);
}

function clearStore(name) {
  if (stores.has(name)) {
    stores.set(name, []);
  }
}

function resetStores() {
  stores.clear();
}

function generateId() {
  return randomUUID();
}

function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = {
  getStore,
  setStore,
  clearStore,
  resetStores,
  generateId,
  cloneDeep,
};
