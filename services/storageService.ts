
const DB_NAME = 'MindStreamDB';
const STORE_NAME = 'kv_store';
const VERSION = 1;

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
        reject(new Error("IndexedDB not supported"));
        return;
    }
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result === undefined ? null : request.result);
        });
    } catch (error) {
        console.error("Storage Read Error:", error);
        return null;
    }
  },

  async set(key: string, value: any): Promise<void> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const request = tx.objectStore(STORE_NAME).put(value, key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.error("Storage Write Error:", error);
    }
  }
};
