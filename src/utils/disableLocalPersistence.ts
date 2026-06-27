const APP_STORAGE_PREFIXES = [
  'mena_inc_',
  'ui.customer.',
  'ui.inventory.',
  'ui.purchases.',
  'ui.loans.',
  'telegram_backup_'
];

function shouldBlockStorageKey(key: string) {
  return APP_STORAGE_PREFIXES.some(prefix => key.startsWith(prefix));
}

function clearAppStorage(storage: Storage) {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && shouldBlockStorageKey(key)) keys.push(key);
  }
  keys.forEach(key => storage.removeItem(key));
}

function disableStorageMethods() {
  const prototype = Storage.prototype;
  const originalSetItem = prototype.setItem;
  const originalGetItem = prototype.getItem;
  const originalRemoveItem = prototype.removeItem;

  prototype.setItem = function setItemWithoutAppPersistence(key: string, value: string) {
    if (shouldBlockStorageKey(key)) return;
    return originalSetItem.call(this, key, value);
  };
  prototype.getItem = function getItemWithoutAppPersistence(key: string) {
    if (shouldBlockStorageKey(key)) return null;
    return originalGetItem.call(this, key);
  };
  prototype.removeItem = function removeItemWithoutAppPersistence(key: string) {
    if (shouldBlockStorageKey(key)) return;
    return originalRemoveItem.call(this, key);
  };
}

export function disableLocalPersistence() {
  if (typeof window === 'undefined') return;
  try {
    clearAppStorage(window.localStorage);
    clearAppStorage(window.sessionStorage);
    disableStorageMethods();
  } catch (error) {
    console.warn('Could not disable browser persistence:', error);
  }
}
