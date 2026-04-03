import { getApp } from 'firebase/app';

function getFirebaseStorageKey() {
  const app = getApp();
  return `firebase:authUser:${app.options.apiKey}:[DEFAULT]`;
}

export async function backupAnonymousUser(): Promise<boolean> {
  const key = getFirebaseStorageKey();
  return new Promise((resolve) => {
    const request = indexedDB.open('firebaseLocalStorageDb');
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
        resolve(false);
        return;
      }
      const tx = db.transaction('firebaseLocalStorage', 'readonly');
      const store = tx.objectStore('firebaseLocalStorage');
      const getReq = store.get(key);
      getReq.onsuccess = () => {
        const result = getReq.result;
        if (result && result.value && result.value.isAnonymous) {
          const backupReq = indexedDB.open('shimane_auth_backup', 1);
          backupReq.onupgradeneeded = (e) => {
            const backupDb = (e.target as IDBOpenDBRequest).result;
            if (!backupDb.objectStoreNames.contains('backups')) {
              backupDb.createObjectStore('backups');
            }
          };
          backupReq.onsuccess = (e) => {
            const backupDb = (e.target as IDBOpenDBRequest).result;
            const backupTx = backupDb.transaction('backups', 'readwrite');
            const backupStore = backupTx.objectStore('backups');
            backupStore.put(result, 'anon_backup');
            backupTx.oncomplete = () => resolve(true);
          };
          backupReq.onerror = () => resolve(false);
        } else {
          resolve(false);
        }
      };
      getReq.onerror = () => resolve(false);
    };
    request.onerror = () => resolve(false);
  });
}

export async function restoreAnonymousUser(): Promise<boolean> {
  return new Promise((resolve) => {
    const backupReq = indexedDB.open('shimane_auth_backup', 1);
    backupReq.onsuccess = (e) => {
      const backupDb = (e.target as IDBOpenDBRequest).result;
      if (!backupDb.objectStoreNames.contains('backups')) {
        resolve(false);
        return;
      }
      const backupTx = backupDb.transaction('backups', 'readonly');
      const backupStore = backupTx.objectStore('backups');
      const getReq = backupStore.get('anon_backup');
      getReq.onsuccess = () => {
        const result = getReq.result;
        if (result) {
          const request = indexedDB.open('firebaseLocalStorageDb');
          request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
              resolve(false);
              return;
            }
            const tx = db.transaction('firebaseLocalStorage', 'readwrite');
            const store = tx.objectStore('firebaseLocalStorage');
            try {
              store.put(result);
            } catch (e) {
              store.put(result, result.fbase_key || `firebase:authUser:${getApp().options.apiKey}:[DEFAULT]`);
            }
            tx.oncomplete = () => resolve(true);
          };
          request.onerror = () => resolve(false);
        } else {
          resolve(false);
        }
      };
      getReq.onerror = () => resolve(false);
    };
    backupReq.onerror = () => resolve(false);
  });
}
