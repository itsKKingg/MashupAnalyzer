// src/utils/fileHash.ts

import { AudioAnalysisResult } from '../types/track';
import { 
  getIndexedDBAnalysis,
  setIndexedDBAnalysis,
  clearIndexedDBCache
} from './indexedDB';

/**
 * Generate a fast hash from file metadata (doesn't read file contents)
 */
export function getFileHash(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/**
 * In-memory cache for analysis results (fast first check)
 */
const analysisCache = new Map<string, AudioAnalysisResult>();

/**
 * Get cached analysis (checks memory first, then IndexedDB)
 */
export async function getCachedAnalysis(file: File): Promise<AudioAnalysisResult | null> {
  const hash = getFileHash(file);
  
  // Check in-memory cache first (fastest)
  const memCached = analysisCache.get(hash);
  if (memCached) {
    // 🔥 VALIDATE cached result
    if (memCached.bpm && memCached.key) {
      console.log(`⚡ Memory cache hit for: ${file.name}`);
      return memCached;
    } else {
      console.warn(`⚠️ Invalid memory cache for ${file.name}, removing`);
      analysisCache.delete(hash);
    }
  }
  
  // Check IndexedDB (persistent)
  const dbCached = await getIndexedDBAnalysis(hash);
  if (dbCached) {
    // 🔥 VALIDATE cached result from IndexedDB
    if (dbCached.bpm && dbCached.key && typeof dbCached.bpm === 'number') {
      // Populate memory cache for next time
      analysisCache.set(hash, dbCached);
      console.log(`💾 IndexedDB cache hit for: ${file.name}`, dbCached);
      return dbCached;
    } else {
      console.warn(`⚠️ Invalid IndexedDB cache for ${file.name}:`, dbCached);
      // Don't use invalid cached data
      return null;
    }
  }
  
  return null;
}

/**
 * Save analysis to both memory and IndexedDB
 */
export async function setCachedAnalysis(file: File, result: AudioAnalysisResult): Promise<void> {
  // 🔥 NEVER cache null or invalid results
  if (!result || !result.bpm || !result.key || typeof result.bpm !== 'number') {
    console.warn(`⚠️ Refusing to cache invalid result for: ${file.name}`, result);
    return;
  }

  const hash = getFileHash(file);
  
  // Save to memory cache
  analysisCache.set(hash, result);
  
  // Limit memory cache to 500 files to prevent memory issues
  if (analysisCache.size > 500) {
    const firstKey = analysisCache.keys().next().value;
    if (firstKey) {
      analysisCache.delete(firstKey);
    }
  }
  
  // Save to IndexedDB (persistent)
  await setIndexedDBAnalysis(hash, result);
  
  console.log(`💾 Cached analysis for: ${file.name} (${analysisCache.size} in memory)`, {
    bpm: result.bpm,
    key: result.key
  });
}

/**
 * Clear all caches
 */
export async function clearAnalysisCache(): Promise<void> {
  analysisCache.clear();
  await clearIndexedDBCache();
  console.log('🗑️ Cleared all analysis caches');
}

export function getCacheSize(): number {
  return analysisCache.size;
}