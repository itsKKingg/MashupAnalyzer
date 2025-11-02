// src/utils/indexedDB.ts
// Persistent analysis cache using IndexedDB

import { AudioAnalysisResult } from '../types/track';

const DB_NAME = 'mashup-analyzer';
const DB_VERSION = 1;
const STORE_NAME = 'analysis-cache';

interface CachedAnalysis {
  hash: string;
  result: AudioAnalysisResult;
  cachedAt: number;
}

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize IndexedDB
 */
async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'hash' });
        store.createIndex('cachedAt', 'cachedAt', { unique: false });
        console.log('📦 Created IndexedDB store for analysis cache');
      }
    };
  });
}

/**
 * Get cached analysis from IndexedDB
 */
export async function getIndexedDBAnalysis(fileHash: string): Promise<AudioAnalysisResult | null> {
  try {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(fileHash);

      request.onsuccess = () => {
        const cached = request.result as CachedAnalysis | undefined;
        
        if (cached) {
          // Optional: Check if cache is too old (e.g., > 30 days)
          const age = Date.now() - cached.cachedAt;
          const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
          
          if (age > maxAge) {
            console.log(`⏰ Cache expired for hash: ${fileHash}`);
            resolve(null);
            return;
          }
          
          console.log(`💾 IndexedDB cache hit for hash: ${fileHash}`);
          resolve(cached.result);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.warn('IndexedDB read error:', request.error);
        resolve(null); // Fail gracefully
      };
    });
  } catch (error) {
    console.warn('IndexedDB not available:', error);
    return null;
  }
}

/**
 * Save analysis to IndexedDB
 */
export async function setIndexedDBAnalysis(fileHash: string, result: AudioAnalysisResult): Promise<void> {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const cached: CachedAnalysis = {
        hash: fileHash,
        result,
        cachedAt: Date.now(),
      };

      const request = store.put(cached);

      request.onsuccess = () => {
        console.log(`💾 Saved to IndexedDB: ${fileHash}`);
        resolve();
      };

      request.onerror = () => {
        console.warn('IndexedDB write error:', request.error);
        resolve(); // Fail gracefully
      };
    });
  } catch (error) {
    console.warn('IndexedDB not available:', error);
  }
}

/**
 * Clear all cached analyses
 */
export async function clearIndexedDBCache(): Promise<void> {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('🗑️ Cleared IndexedDB analysis cache');
        resolve();
      };

      request.onerror = () => {
        console.warn('IndexedDB clear error:', request.error);
        resolve(); // Fail gracefully
      };
    });
  } catch (error) {
    console.warn('IndexedDB not available:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getIndexedDBStats(): Promise<{ count: number; size: number }> {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        resolve({
          count: countRequest.result,
          size: 0, // IndexedDB doesn't provide size directly
        });
      };

      countRequest.onerror = () => {
        resolve({ count: 0, size: 0 });
      };
    });
  } catch (error) {
    return { count: 0, size: 0 };
  }
}

/**
 * Delete old cache entries (older than X days)
 */
export async function cleanupOldCache(maxAgeDays: number = 30): Promise<number> {
  try {
    const db = await initDB();
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - maxAge;
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('cachedAt');
      const range = IDBKeyRange.upperBound(cutoff);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          console.log(`🧹 Cleaned up ${deletedCount} old cache entries`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        console.warn('IndexedDB cleanup error:', request.error);
        resolve(0);
      };
    });
  } catch (error) {
    console.warn('IndexedDB cleanup failed:', error);
    return 0;
  }
}