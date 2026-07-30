import { WorkspaceSession } from '../hooks/useSessionManager';

const DB_NAME = 'CollabWorkspaceDB';
const DB_VERSION = 1;
const STORE_NAME = 'workspace_sessions';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function getIDBSessions(): Promise<WorkspaceSession[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as WorkspaceSession[]);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB read failed, falling back to localStorage', err);
    return [];
  }
}

export async function saveIDBSessions(sessions: WorkspaceSession[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      // Clear existing and rewrite
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        let pending = sessions.length;
        if (pending === 0) {
          resolve();
          return;
        }
        for (const session of sessions) {
          const putReq = store.put(session);
          putReq.onerror = () => reject(putReq.error);
          putReq.onsuccess = () => {
            pending--;
            if (pending === 0) resolve();
          };
        }
      };
      clearReq.onerror = () => reject(clearReq.error);
    });
  } catch (err) {
    console.warn('IndexedDB write failed', err);
  }
}
