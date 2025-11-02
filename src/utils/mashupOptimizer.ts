// src/utils/mashupOptimizer.ts
// ✅ UPDATED: Fixed duplicate detection (V1/V2 version logic)

import { Track, MashupCandidate, MatchBadge, HarmonicTier, BPMTolerance } from '../types/track';
import { calculateCompatibility, AudioAnalysisResult } from './audioAnalysis';

/**
 * Camelot Wheel compatibility rules
 */
const CAMELOT_WHEEL: Record<string, string[]> = {
  // Major keys (B side)
  'C': ['8B', '9B', '7B', '8A'],
  'G': ['9B', '10B', '8B', '9A'],
  'D': ['10B', '11B', '9B', '10A'],
  'A': ['11B', '12B', '10B', '11A'],
  'E': ['12B', '1B', '11B', '12A'],
  'B': ['1B', '2B', '12B', '1A'],
  'F#': ['2B', '3B', '1B', '2A'],
  'Gb': ['2B', '3B', '1B', '2A'],
  'Db': ['3B', '4B', '2B', '3A'],
  'C#': ['3B', '4B', '2B', '3A'],
  'Ab': ['4B', '5B', '3B', '4A'],
  'G#': ['4B', '5B', '3B', '4A'],
  'Eb': ['5B', '6B', '4B', '5A'],
  'D#': ['5B', '6B', '4B', '5A'],
  'Bb': ['6B', '7B', '5B', '6A'],
  'A#': ['6B', '7B', '5B', '6A'],
  'F': ['7B', '8B', '6B', '7A'],
  
  // Minor keys (A side)
  'Am': ['8A', '9A', '7A', '8B'],
  'A minor': ['8A', '9A', '7A', '8B'],
  'Em': ['9A', '10A', '8A', '9B'],
  'E minor': ['9A', '10A', '8A', '9B'],
  'Bm': ['10A', '11A', '9A', '10B'],
  'B minor': ['10A', '11A', '9A', '10B'],
  'F#m': ['11A', '12A', '10A', '11B'],
  'Gbm': ['11A', '12A', '10A', '11B'],
  'C#m': ['12A', '1A', '11A', '12B'],
  'Dbm': ['12A', '1A', '11A', '12B'],
  'G#m': ['1A', '2A', '12A', '1B'],
  'Abm': ['1A', '2A', '12A', '1B'],
  'D#m': ['2A', '3A', '1A', '2B'],
  'Ebm': ['2A', '3A', '1A', '2B'],
  'A#m': ['3A', '4A', '2A', '3B'],
  'Bbm': ['3A', '4A', '2A', '3B'],
  'Fm': ['4A', '5A', '3A', '4B'],
  'F minor': ['4A', '5A', '3A', '4B'],
  'Cm': ['5A', '6A', '4A', '5B'],
  'C minor': ['5A', '6A', '4A', '5B'],
  'Gm': ['6A', '7A', '5A', '6B'],
  'G minor': ['6A', '7A', '5A', '6B'],
  'Dm': ['7A', '8A', '6A', '7B'],
  'D minor': ['7A', '8A', '6A', '7B'],
};

/**
 * Get harmonic mixing tier based on key relationship
 */
export function getHarmonicTier(key1: string, key2: string): HarmonicTier {
  if (key1 === key2) return 'tier-1';

  const normalized1 = key1.trim();
  const normalized2 = key2.trim();
  
  const compatible1 = CAMELOT_WHEEL[normalized1] || [];
  
  if (compatible1[0] === normalized2 || compatible1[1] === normalized2) {
    return 'tier-2';
  }
  if (compatible1[2] === normalized2) {
    return 'tier-3';
  }
  if (compatible1[3] === normalized2) {
    return 'tier-4';
  }
  if (compatible1.includes(normalized2)) {
    return 'tier-5';
  }
  
  return 'tier-6';
}

/**
 * Get key compatibility score (0-1)
 */
export function getKeyCompatibilityScore(key1: string, key2: string): number {
  const tier = getHarmonicTier(key1, key2);
  
  switch (tier) {
    case 'tier-1': return 1.0;
    case 'tier-2': return 0.95;
    case 'tier-3': return 0.90;
    case 'tier-4': return 0.80;
    case 'tier-5': return 0.70;
    case 'tier-6': return 0.30;
    default: return 0.30;
  }
}

export function isCompatibleKey(key1: string, key2: string): boolean {
  if (key1 === key2) return true;
  
  const normalized1 = key1.trim();
  const normalized2 = key2.trim();
  
  const compatible1 = CAMELOT_WHEEL[normalized1] || [];
  const compatible2 = CAMELOT_WHEEL[normalized2] || [];
  
  return compatible1.includes(normalized2) || compatible2.includes(normalized1);
}

/**
 * BPM compatibility with detailed scoring
 */
function getBPMCompatibility(bpm1: number, bpm2: number): {
  compatible: boolean;
  difference: number;
  pitchAdjust: number;
  method: 'direct' | 'half-time' | 'double-time' | 'none';
  score: number;
} {
  const diff = Math.abs(bpm1 - bpm2);
  const pitchAdjust = ((diff / Math.min(bpm1, bpm2)) * 100);
  
  let score = 0;
  if (diff === 0) score = 1.0;
  else if (diff <= 1) score = 0.95;
  else if (diff <= 2) score = 0.85;
  else if (diff <= 3) score = 0.75;
  else if (diff <= 5) score = 0.60;
  else if (diff <= 10) score = 0.30;
  else if (diff <= 15) score = 0.15;
  else score = 0.0;
  
  const directCompatible = diff <= 15;
  
  const halfTimeCompatible1 = Math.abs(bpm1 - bpm2 / 2) <= 3;
  const halfTimeCompatible2 = Math.abs(bpm2 - bpm1 / 2) <= 3;
  const halfTimeCompatible = halfTimeCompatible1 || halfTimeCompatible2;
  
  const doubleTimeCompatible1 = Math.abs(bpm1 * 2 - bpm2) <= 3;
  const doubleTimeCompatible2 = Math.abs(bpm2 * 2 - bpm1) <= 3;
  const doubleTimeCompatible = doubleTimeCompatible1 || doubleTimeCompatible2;
  
  let method: 'direct' | 'half-time' | 'double-time' | 'none' = 'none';
  if (directCompatible) method = 'direct';
  else if (halfTimeCompatible) method = 'half-time';
  else if (doubleTimeCompatible) method = 'double-time';
  
  return {
    compatible: directCompatible || halfTimeCompatible || doubleTimeCompatible,
    difference: diff,
    pitchAdjust,
    method,
    score,
  };
}

/**
 * Calculate Perfect Match Score (BPM + Key priority)
 */
export function calculatePerfectMatchScore(
  bpm1: number,
  key1: string,
  bpm2: number,
  key2: string,
  energy1: number,
  energy2: number,
  confidence1: number,
  confidence2: number
): number {
  const bpmCompat = getBPMCompatibility(bpm1, bpm2);
  const keyScore = getKeyCompatibilityScore(key1, key2);
  
  const energyDiff = Math.abs(energy1 - energy2);
  const energyScore = Math.max(0, 1 - energyDiff);
  
  const avgConfidence = (confidence1 + confidence2) / 2;
  
  const score = (
    bpmCompat.score * 0.40 +
    keyScore * 0.40 +
    energyScore * 0.10 +
    avgConfidence * 0.10
  );
  
  return Math.round(score * 100);
}

/**
 * Determine match badge based on BPM + Key
 */
export function getMatchBadge(
  bpmDiff: number,
  key1: string,
  key2: string
): MatchBadge {
  const tier = getHarmonicTier(key1, key2);
  
  if (bpmDiff === 0 && tier === 'tier-1') return 'perfect';
  if (bpmDiff <= 1 && (tier === 'tier-1' || tier === 'tier-2')) return 'excellent';
  if (bpmDiff <= 3 && (tier === 'tier-1' || tier === 'tier-2' || tier === 'tier-3')) return 'great';
  if (bpmDiff === 0) return 'beatmatchable';
  if (tier === 'tier-1') return 'harmonic';
  if (bpmDiff <= 5 && tier !== 'tier-6') return 'good';
  
  return 'fair';
}

/**
 * Calculate mix difficulty
 */
export function getMixDifficulty(
  bpmDiff: number,
  tier: HarmonicTier,
  energyDiff: number
): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  if (bpmDiff <= 2 && (tier === 'tier-1' || tier === 'tier-2') && energyDiff <= 0.15) {
    return 'beginner';
  }
  
  if (bpmDiff <= 5 || tier === 'tier-1' || tier === 'tier-2' || tier === 'tier-3') {
    return 'intermediate';
  }
  
  if (bpmDiff <= 10 || tier !== 'tier-6') {
    return 'advanced';
  }
  
  return 'expert';
}

/**
 * BPM tolerance to max BPM difference
 */
export function toleranceToMaxBPM(tolerance: BPMTolerance): number {
  switch (tolerance) {
    case 'strict': return 2;
    case 'normal': return 5;
    case 'flexible': return 10;
    case 'creative': return 15;
    default: return 5;
  }
}

export function getCompatibleCandidates(
  track: Track,
  library: Track[],
  options: {
    maxBPMDiff?: number;
    requireKeyCompatibility?: boolean;
    allowHalfTime?: boolean;
  } = {}
): Track[] {
  const {
    maxBPMDiff = 15,
    requireKeyCompatibility = false,
    allowHalfTime = true,
  } = options;

  return library.filter((other) => {
    if (other.id === track.id) return false;
    if (!other.bpm || !other.key || other.bpm <= 0) return false;
    
    const bpmCompat = getBPMCompatibility(track.bpm, other.bpm);
    
    if (!bpmCompat.compatible) {
      return false;
    }
    
    const directDiff = Math.abs(track.bpm - other.bpm);
    if (directDiff > maxBPMDiff && !allowHalfTime) {
      return false;
    }
    
    if (requireKeyCompatibility) {
      if (!isCompatibleKey(track.key, other.key)) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Smart mashup calculation with Perfect Match ranking
 */
export async function calculateMashupsOptimized(
  tracks: Track[],
  options: {
    maxBPMDiff?: number;
    requireKeyCompatibility?: boolean;
    minScore?: number;
    onProgress?: (current: number, total: number) => void;
    bpmTolerance?: BPMTolerance;
  } = {}
): Promise<MashupCandidate[]> {
  const {
    maxBPMDiff = toleranceToMaxBPM(options.bpmTolerance || 'normal'),
    requireKeyCompatibility = false,
    minScore = 0.3,
    onProgress,
  } = options;

  const candidates: MashupCandidate[] = [];
  
  const validTracks = tracks.filter(
    (t) => t && !t.isAnalyzing && !t.error && t.bpm > 0 && t.key
  );
  
  if (validTracks.length < 2) {
    console.log('⚠️ Need at least 2 valid tracks');
    return [];
  }

  let comparisons = 0;
  let skipped = 0;
  const startTime = Date.now();
  
  const estimatedTotal = validTracks.length * 20;

  console.log(`🔍 Perfect Match calculation starting...`);
  console.log(`   Max BPM diff: ±${maxBPMDiff}`);

  const CHUNK_SIZE = 10;
  
  for (let i = 0; i < validTracks.length; i++) {
    const track1 = validTracks[i];
    
    const compatibleTracks = getCompatibleCandidates(
      track1,
      validTracks.slice(i + 1),
      { maxBPMDiff, requireKeyCompatibility, allowHalfTime: true }
    );
    
    const potentialComparisons = validTracks.length - i - 1;
    skipped += potentialComparisons - compatibleTracks.length;

    for (const track2 of compatibleTracks) {
      try {
        const perfectMatchScore = calculatePerfectMatchScore(
          track1.bpm,
          track1.key,
          track2.bpm,
          track2.key,
          track1.energy,
          track2.energy,
          track1.confidence,
          track2.confidence
        );

        const bpmDiff = Math.abs(track1.bpm - track2.bpm);
        const pitchAdjust = getBPMAdjustment(track1.bpm, track2.bpm);
        const harmonicTier = getHarmonicTier(track1.key, track2.key);
        const matchBadge = getMatchBadge(bpmDiff, track1.key, track2.key);
        const energyDiff = Math.abs(track1.energy - track2.energy);
        const mixDifficulty = getMixDifficulty(bpmDiff, harmonicTier, energyDiff);

        const analysis1: AudioAnalysisResult = {
          bpm: track1.bpm,
          key: track1.key,
          duration: track1.duration,
          confidence: track1.confidence,
          keyConfidence: track1.keyConfidence,
          energy: track1.energy,
          danceability: track1.danceability,
          beatCount: track1.beatCount,
          segments: [],
        };

        const analysis2: AudioAnalysisResult = {
          bpm: track2.bpm,
          key: track2.key,
          duration: track2.duration,
          confidence: track2.confidence,
          keyConfidence: track2.keyConfidence,
          energy: track2.energy,
          danceability: track2.danceability,
          beatCount: track2.beatCount,
          segments: [],
        };

        const compatibility = calculateCompatibility(analysis1, analysis2);

        if (compatibility.score >= minScore) {
          candidates.push({
            track1,
            track2,
            score: compatibility.score,
            reason: compatibility.reason,
            category: compatibility.category,
            bpmDifference: bpmDiff,
            pitchAdjustPercent: pitchAdjust.percentAdjust,
            pitchAdjustSemitones: pitchAdjust.semitoneAdjust,
            isNaturalPitch: pitchAdjust.isNatural,
            matchBadge,
            harmonicTier,
            mixDifficulty,
            perfectMatchScore,
          });
        }

        comparisons++;
        
        if (onProgress && comparisons % 50 === 0) {
          onProgress(comparisons, estimatedTotal);
        }
      } catch (error) {
        console.warn(`Failed compatibility for ${track1.name} & ${track2.name}:`, error);
        continue;
      }
    }

    if (i % CHUNK_SIZE === 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  candidates.sort((a, b) => b.perfectMatchScore - a.perfectMatchScore);

  const elapsed = Date.now() - startTime;
  const totalPossible = (validTracks.length * (validTracks.length - 1)) / 2;
  const savedComparisons = totalPossible - comparisons;
  const speedup = comparisons > 0 ? totalPossible / comparisons : 1;

  console.log(`\n✅ Perfect Match calculation complete!`);
  console.log(`   Comparisons: ${comparisons.toLocaleString()}`);
  console.log(`   Skipped: ${skipped.toLocaleString()}`);
  console.log(`   ${speedup.toFixed(1)}x faster`);
  console.log(`   ${candidates.length} mashups found`);
  console.log(`   Top match score: ${candidates[0]?.perfectMatchScore || 0}/100\n`);

  return candidates;
}

export function getMashupStats(trackCount: number): {
  bruteForce: number;
  optimized: number;
  savings: number;
  speedup: number;
  estimatedTimeMs: number;
} {
  const bruteForce = (trackCount * (trackCount - 1)) / 2;
  const avgCompatiblePerTrack = Math.min(20, trackCount / 5);
  const optimized = Math.floor(trackCount * avgCompatiblePerTrack);
  const savings = bruteForce - optimized;
  const speedup = bruteForce / (optimized || 1);
  const estimatedTimeMs = optimized * 0.5;

  return { 
    bruteForce, 
    optimized, 
    savings, 
    speedup: Math.max(1, speedup),
    estimatedTimeMs 
  };
}

/**
 * Get BPM adjustment needed
 */
export function getBPMAdjustment(
  sourceBPM: number,
  targetBPM: number
): {
  percentAdjust: number;
  semitoneAdjust: number;
  direction: 'speed up' | 'slow down' | 'match';
  isNatural: boolean;
} {
  const percentAdjust = ((targetBPM - sourceBPM) / sourceBPM) * 100;
  const semitoneAdjust = percentAdjust / 5.95;
  const direction = percentAdjust > 0 ? 'speed up' : percentAdjust < 0 ? 'slow down' : 'match';
  const isNatural = Math.abs(percentAdjust) <= 6;

  return {
    percentAdjust: Math.abs(percentAdjust),
    semitoneAdjust: Math.abs(semitoneAdjust),
    direction,
    isNatural,
  };
}

/**
 * ✅ UPDATED: Find duplicate/similar tracks (V1/V2 version detection)
 * Only flags tracks with same base name + version markers (V1, V2, etc.)
 */
export function findDuplicates(tracks: Track[]): Map<string, Track[]> {
  const groups = new Map<string, Track[]>();
  
  // ✅ FIXED: Helper to extract base name and version with improved edge case handling
  function parseTrackName(name: string): { base: string; version: string | null } {
    // Remove file extension
    const nameWithoutExt = name.replace(/\.[^/.]+$/, '');
    
    // ✅ FIXED: Improved version patterns that exclude years (4-digit numbers)
    // Match version patterns: V1, V2, v1, v2, (V1), [V2], - V1, _v2, Ver.1, Version 2, etc.
    // Exclude years (1900-2099) and standalone large numbers
    const versionPatterns = [
      /[\s\-_\[\(]?[vV](\d{1,2})[\]\)]?$/,           // V1, V2, v1, (V1), [V2], -V1, _v2 (max 2 digits)
      /[\s\-_\[\(]?[vV]er\.?\s*(\d{1,2})[\]\)]?$/i,  // Ver.1, Ver 2, version 1 (max 2 digits)
      /[\s\-_\[\(]?[vV]ersion\s*(\d{1,2})[\]\)]?$/i, // Version 1, version 2 (max 2 digits)
      // ✅ FIXED: Exclude 4-digit years in parentheses, only match 1-2 digit versions
      /[\s\-_]\(([1-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9]|7[0-9]|8[0-9]|9[0-9])\)$/,  // (1) to (99), excludes (2024)
      // ✅ FIXED: Only match trailing numbers if they're 1-2 digits and preceded by space/dash/underscore
      /[\s\-_]([1-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9]|7[0-9]|8[0-9]|9[0-9])$/,  // Excludes "2024" at end
    ];
    
    for (const pattern of versionPatterns) {
      const match = nameWithoutExt.match(pattern);
      if (match) {
        // ✅ FIXED: Check if matched number is a year (1900-2099) - exclude it
        const matchedNumber = parseInt(match[1] || match[0].replace(/[^\d]/g, ''), 10);
        if (matchedNumber >= 1900 && matchedNumber <= 2099) {
          continue; // Skip years
        }
        
        const base = nameWithoutExt.replace(pattern, '').trim().toLowerCase(); // ✅ FIXED: Normalize to lowercase
        const version = match[0].trim();
        return { base, version };
      }
    }
    
    // No version marker
    return { base: nameWithoutExt.trim().toLowerCase(), version: null }; // ✅ FIXED: Normalize to lowercase
  }
  
  // Group tracks by base name
  const baseNameGroups = new Map<string, Track[]>();
  
  for (const track of tracks) {
    if (!track || track.isAnalyzing || track.error) continue;
    
    const { base } = parseTrackName(track.name);
    
    if (!baseNameGroups.has(base)) {
      baseNameGroups.set(base, []);
    }
    baseNameGroups.get(base)!.push(track);
  }
  
  // Find groups with multiple versions
  for (const [base, tracksInGroup] of baseNameGroups.entries()) {
    if (tracksInGroup.length > 1) {
      // Check if they have version markers
      const parsedTracks = tracksInGroup.map(t => ({
        track: t,
        parsed: parseTrackName(t.name),
      }));
      
      const hasVersionMarkers = parsedTracks.some(pt => pt.parsed.version !== null);
      
      // Check if exact duplicates (same name, similar BPM, same key)
      const firstTrack = tracksInGroup[0];
      const areExactDuplicates = tracksInGroup.every(t => 
        t.name === firstTrack.name &&
        Math.abs(t.bpm - firstTrack.bpm) <= 1 &&
        t.key === firstTrack.key
      );
      
      if (hasVersionMarkers) {
        // Version-based duplicates (V1, V2, etc.)
        const key = `version-${base}`;
        groups.set(key, tracksInGroup);
        console.log(`📦 Found version group: ${base} (${tracksInGroup.length} versions)`);
      } else if (areExactDuplicates) {
        // Exact duplicates (same file uploaded multiple times)
        const key = `exact-${base}`;
        groups.set(key, tracksInGroup);
        console.log(`⚠️ Found exact duplicates: ${base} (${tracksInGroup.length} copies)`);
      }
      // Otherwise, just tracks with similar names - don't flag as duplicates
    }
  }
  
  return groups;
}

/**
 * "Mix-Ready" quick filter
 */
export function filterMixReady(candidates: MashupCandidate[]): MashupCandidate[] {
  return candidates.filter(m => {
    if (m.bpmDifference > 3) return false;
    if (m.harmonicTier === 'tier-6') return false;
    
    const energyDiff = Math.abs(m.track1.energy - m.track2.energy);
    if (energyDiff >= 0.2) return false;
    
    const avgConfidence = (m.track1.confidence + m.track2.confidence) / 2;
    if (avgConfidence < 0.8) return false;
    
    const hasAudio1 = Boolean(m.track1.audioUrl && m.track1.file instanceof File);
    const hasAudio2 = Boolean(m.track2.audioUrl && m.track2.file instanceof File);
    if (!hasAudio1 || !hasAudio2) return false;
    
    return true;
  });
}