// src/utils/audioAnalysis.ts
// ✅ UPDATED: Added metadata extraction + MusicBrainz lookup

import { Key, Note } from 'tonal';
import { getSharedAudioContext } from './sharedAudioContext';
import { getCachedAnalysis, setCachedAnalysis } from './fileHash';
import { getWorkerPool } from './workerPool';
import { extractMetadata, lookupMusicBrainzThrottled } from './musicMetadata';
import type { AudioAnalysisResult, AnalysisMode, SegmentDensity, BeatStorage } from '../types/track';

const CONFIG = {
  USE_WORKERS: true,
  MAX_WORKERS: 4,
  DEBUG: true,
};

const performanceMetrics = {
  totalAnalyses: 0,
  successfulAnalyses: 0,
  failedAnalyses: 0,
  totalTime: 0,
  cacheHits: 0,
  averageTime: 0,
  activeAnalyses: 0,
  quickModeCount: 0,
  fullModeCount: 0,
};

export function getAnalysisStats() {
  const workerPool = CONFIG.USE_WORKERS ? getWorkerPool(CONFIG.MAX_WORKERS) : null;
  const workerStats = workerPool?.getStats();

  return {
    ...performanceMetrics,
    ...(workerStats && { workers: workerStats }),
    cacheHitRate: performanceMetrics.totalAnalyses > 0
      ? (performanceMetrics.cacheHits / performanceMetrics.totalAnalyses) * 100
      : 0,
    successRate: performanceMetrics.totalAnalyses > 0
      ? (performanceMetrics.successfulAnalyses / performanceMetrics.totalAnalyses) * 100
      : 0
  };
}

export function resetAnalysisStats() {
  Object.assign(performanceMetrics, {
    totalAnalyses: 0,
    successfulAnalyses: 0,
    failedAnalyses: 0,
    totalTime: 0,
    cacheHits: 0,
    averageTime: 0,
    activeAnalyses: 0,
    quickModeCount: 0,
    fullModeCount: 0,
  });
}

export async function analyzeAudioFile(
  file: File,
  onProgress?: (progress: number, status?: string) => void,
  options?: {
    mode?: AnalysisMode;
    segmentDensity?: SegmentDensity;
    beatStorage?: BeatStorage;
  }
): Promise<AudioAnalysisResult> {
  const startTime = performance.now();
  performanceMetrics.totalAnalyses++;
  performanceMetrics.activeAnalyses++;

  const mode = options?.mode || 'full';
  const segmentDensity = options?.segmentDensity || 'standard';
  const beatStorage = options?.beatStorage || 'count';

  if (mode === 'quick') performanceMetrics.quickModeCount++;
  else performanceMetrics.fullModeCount++;

  if (performanceMetrics.totalAnalyses === 1) {
    console.log('🔍 Worker Configuration:');
    console.log('   USE_WORKERS:', CONFIG.USE_WORKERS);
    console.log('   MAX_WORKERS:', CONFIG.MAX_WORKERS);
    console.log('   DEBUG:', CONFIG.DEBUG);
  }

  // ✅ NEW: Extract metadata FIRST (fast, parallel to cache check)
  let metadata: any = {};
  const metadataPromise = extractMetadata(file).catch(err => {
    console.warn('Metadata extraction failed:', err);
    return {};
  });

  try {
    // Check cache
    const cached = await getCachedAnalysis(file);
    if (cached) {
      console.log('✅ Cache hit for:', file.name);
      performanceMetrics.cacheHits++;
      performanceMetrics.activeAnalyses--;
      onProgress?.(100, 'Loaded from cache');
      
      // ✅ Still extract metadata for cached results (metadata not in cache)
      metadata = await metadataPromise;
      
      return {
        ...cached,
        metadata: metadata || cached.metadata, // Prefer fresh metadata
      };
    }

    console.log('🔍 No cache, performing fresh analysis for:', file.name);
    
    // ✅ Wait for metadata extraction to complete
    onProgress?.(2, 'Extracting metadata...');
    metadata = await metadataPromise;
    
    if (metadata.title || metadata.artist) {
      console.log('📀 Metadata extracted:', {
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        hasArt: !!metadata.albumArt,
        bpmTag: metadata.bpmTag,
        keyTag: metadata.keyTag,
      });
    }
    
    // ✅ Optional: MusicBrainz lookup (only if we have artist + title)
    if (metadata.title && metadata.artist) {
      onProgress?.(4, 'Looking up genre info...');
      try {
        const mbData = await lookupMusicBrainzThrottled(metadata.title, metadata.artist);
        if (mbData.mbGenre && mbData.mbGenre.length > 0) {
          metadata = { ...metadata, ...mbData };
          console.log('✅ MusicBrainz genre:', mbData.mbGenre);
        }
      } catch (mbError) {
        console.warn('MusicBrainz lookup failed, continuing without it');
      }
    }

    onProgress?.(5, 'Decoding audio...');

    const audioContext = getSharedAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;

    onProgress?.(15, mode === 'quick' ? 'Quick analysis...' : 'Analyzing...');

    if (CONFIG.DEBUG && performanceMetrics.totalAnalyses === 1) {
      console.log('🧵 Attempting to get worker pool...');
    }

    let result: AudioAnalysisResult;

    if (CONFIG.USE_WORKERS) {
      try {
        const workerPool = getWorkerPool(CONFIG.MAX_WORKERS);

        if (CONFIG.DEBUG && performanceMetrics.totalAnalyses === 1) {
          console.log('✅ Worker pool acquired');
          console.log('📊 Worker stats:', workerPool.getStats());
        }

        result = await workerPool.analyze(
          channelData,
          sampleRate,
          duration,
          file.name,
          { mode, segmentDensity, beatStorage },
          onProgress
        );

        if (CONFIG.DEBUG && performanceMetrics.totalAnalyses === 1) {
          console.log('✅ Worker analysis completed');
        }
      } catch (workerError) {
        console.error('❌ Worker analysis failed:', workerError);
        console.warn('⚠️ Falling back to main thread analysis');
        result = createFallbackResult();
      }
    } else {
      console.warn('⚠️ Workers disabled, using main thread');
      result = createFallbackResult();
    }

    // ✅ Use tagged BPM/Key if detection confidence is low
    if (metadata.bpmTag && result.confidence < 0.7) {
      console.log('⚠️ Low BPM confidence, using tagged BPM:', metadata.bpmTag);
      result.bpm = metadata.bpmTag;
      result.confidence = 0.85; // Moderate confidence for tagged value
    }
    
    if (metadata.keyTag && result.keyConfidence < 0.7) {
      console.log('⚠️ Low key confidence, using tagged key:', metadata.keyTag);
      result.key = metadata.keyTag;
      result.keyConfidence = 0.85;
    }

    // ✅ Include metadata in result
    result.metadata = metadata;

    // Only cache valid results
    if (result && result.bpm > 0 && result.key && result.key !== 'Unknown') {
      await setCachedAnalysis(file, result);
      console.log('💾 Cached result for:', file.name);
    } else {
      console.warn('⚠️ Not caching invalid result for:', file.name);
    }

    const analysisTime = performance.now() - startTime;
    performanceMetrics.successfulAnalyses++;
    performanceMetrics.totalTime += analysisTime;
    performanceMetrics.averageTime = performanceMetrics.totalTime / performanceMetrics.totalAnalyses;
    performanceMetrics.activeAnalyses--;

    if (CONFIG.DEBUG) {
      console.log(`✅ [${file.name}] ${mode} ${(analysisTime / 1000).toFixed(2)}s`);
    }

    onProgress?.(100, 'Complete!');
    return result;

  } catch (error) {
    performanceMetrics.failedAnalyses++;
    performanceMetrics.activeAnalyses--;
    console.error(`❌ Analysis failed for ${file.name}:`, error);
    onProgress?.(0, `Error: ${(error as Error).message}`);
    
    // ✅ Return metadata even if analysis fails
    const fallback = createFallbackResult();
    fallback.metadata = await metadataPromise;
    return fallback;
  }
}

function createFallbackResult(): AudioAnalysisResult {
  return {
    bpm: 0,
    key: 'Unknown',
    duration: 0,
    segments: [],
    confidence: 0,
    keyConfidence: 0,
    beatCount: 0,
    energy: 0,
    danceability: 0,
    valence: 0,
    genre: 'Unknown',
    genreConfidence: 0
  };
}

export function calculateCompatibility(
  track1: AudioAnalysisResult,
  track2: AudioAnalysisResult
): {
  score: number;
  reason: string;
  category: 'excellent' | 'good' | 'fair' | 'poor';
} {
  let score = 0;
  const reasons: string[] = [];

  const bpmDiff = Math.abs(track1.bpm - track2.bpm);
  const avgBPM = (track1.bpm + track2.bpm) / 2;
  const bpmTolerance = avgBPM * 0.03;

  if (bpmDiff === 0) {
    score += 40;
    reasons.push('Identical BPM');
  } else if (bpmDiff <= bpmTolerance) {
    score += 35;
    reasons.push('Very close BPM');
  } else if (bpmDiff <= bpmTolerance * 2) {
    score += 25;
    reasons.push('Similar BPM');
  } else if (bpmDiff <= bpmTolerance * 3) {
    score += 15;
    reasons.push('Moderate BPM difference');
  } else {
    score += 5;
    reasons.push('Large BPM difference');
  }

  const keyRelationship = getKeyRelationship(track1.key, track2.key);

  const keyScores: Record<string, number> = {
    'same': 60,
    'relative': 55,
    'perfect-fifth': 45,
    'parallel': 40,
    'subdominant': 35,
    'dominant': 35,
    'nearby': 20
  };

  score += keyScores[keyRelationship] || 10;
  reasons.push(keyRelationship.replace('-', ' '));

  const avgConfidence = ((track1.confidence || 0) + (track2.confidence || 0)) / 2;
  if (avgConfidence > 0.7) score = Math.min(100, score + 5);

  const energyDiff = Math.abs((track1.energy || 0) - (track2.energy || 0));
  if (energyDiff < 0.2) score = Math.min(100, score + 3);

  const category: 'excellent' | 'good' | 'fair' | 'poor' =
    score >= 80 ? 'excellent' :
    score >= 60 ? 'good' :
    score >= 40 ? 'fair' : 'poor';

  return {
    score: Math.round(score),
    reason: reasons.join(', '),
    category
  };
}

function getKeyRelationship(key1: string, key2: string): string {
  if (!key1 || !key2 || key1 === 'Unknown' || key2 === 'Unknown') {
    return 'unknown';
  }

  if (key1 === key2) return 'same';

  const isMajor1 = !key1.includes('m');
  const isMajor2 = !key2.includes('m');
  const root1 = key1.replace('m', '');
  const root2 = key2.replace('m', '');

  if (root1 === root2 && isMajor1 !== isMajor2) return 'parallel';

  try {
    const k1 = isMajor1 ? Key.majorKey(root1) : Key.minorKey(root1);
    const k2 = isMajor2 ? Key.majorKey(root2) : Key.minorKey(root2);

    if (k1 && k2) {
      if (isMajor1 && !isMajor2) {
        const relativeMinor = Key.minorKey(k1.tonic);
        if (relativeMinor && relativeMinor.tonic === k2.tonic) return 'relative';
      } else if (!isMajor1 && isMajor2) {
        const relativeMajor = Key.majorKey(k1.tonic);
        if (relativeMajor && relativeMajor.tonic === k2.tonic) return 'relative';
      }
    }
  } catch (e) {
    // Continue
  }

  const note1Midi = Note.midi(root1);
  const note2Midi = Note.midi(root2);

  if (note1Midi !== null && note2Midi !== null) {
    const interval = Math.abs(note1Midi - note2Midi) % 12;

    if (interval === 7 || interval === 5) return 'perfect-fifth';
    if (interval === 5) return 'subdominant';
    if (interval === 7) return 'dominant';
    if (interval === 2 || interval === 10) return 'nearby';
  }

  return 'distant';
}