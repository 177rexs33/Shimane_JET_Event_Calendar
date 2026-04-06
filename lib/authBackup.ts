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
          // Backup to LocalStorage
          try {
            localStorage.setItem('shimane_anon_backup', JSON.stringify(result));
          } catch (e) {
            console.error('Failed to backup to localStorage', e);
          }

          // Backup to IndexedDB
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

async function getIndexedDBBackup(): Promise<any> {
  return new Promise((resolve) => {
    const backupReq = indexedDB.open('shimane_auth_backup', 1);
    backupReq.onsuccess = (e) => {
      const backupDb = (e.target as IDBOpenDBRequest).result;
      if (!backupDb.objectStoreNames.contains('backups')) {
        resolve(null);
        return;
      }
      const backupTx = backupDb.transaction('backups', 'readonly');
      const backupStore = backupTx.objectStore('backups');
      const getReq = backupStore.get('anon_backup');
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => resolve(null);
    };
    backupReq.onerror = () => resolve(null);
  });
}

function getLocalStorageBackup(): any {
  try {
    const item = localStorage.getItem('shimane_anon_backup');
    return item ? JSON.parse(item) : null;
  } catch (e) {
    return null;
  }
}

async function writeToFirebaseDB(result: any): Promise<boolean> {
  return new Promise((resolve) => {
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
  });
}

export async function restoreAnonymousUser(restoreState: string | null = null): Promise<boolean> {
  const idbBackup = await getIndexedDBBackup();
  const lsBackup = getLocalStorageBackup();

  let backupToRestore = null;
  let nextState = '';

  if (!restoreState) {
    if (idbBackup && lsBackup) {
      if (idbBackup.value.uid === lsBackup.value.uid) {
        backupToRestore = idbBackup;
        nextState = 'tried_both';
      } else {
        // If they don't match, use IndexedDB first
        backupToRestore = idbBackup;
        nextState = 'tried_idb';
      }
    } else if (idbBackup) {
      backupToRestore = idbBackup;
      nextState = 'tried_both';
    } else if (lsBackup) {
      backupToRestore = lsBackup;
      nextState = 'tried_both';
    }
  } else if (restoreState === 'tried_idb') {
    if (lsBackup) {
      backupToRestore = lsBackup;
      nextState = 'tried_both';
    }
  }

  if (backupToRestore) {
    sessionStorage.setItem('auth_restore_state', nextState);
    return await writeToFirebaseDB(backupToRestore);
  }

  return false;
}
