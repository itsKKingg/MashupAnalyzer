// src/utils/audioProcessor.ts
// Audio processing utilities for time-stretching and pitch shifting

import { Track } from '../types/track';

/**
 * Calculate BPM adjustment needed to match target BPM
 * Returns playback rate multiplier (e.g., 1.05 = 5% faster)
 */
export function calculateBPMStretch(sourceBPM: number, targetBPM: number): number {
  if (sourceBPM <= 0 || targetBPM <= 0) return 1.0;
  return targetBPM / sourceBPM;
}

/**
 * Calculate semitone shift needed to match keys
 * Returns positive for pitch up, negative for pitch down
 */
export function calculateKeyShift(sourceKey: string, targetKey: string): number {
  const keyMap: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
    'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
  };

  // Extract root note (remove minor/major suffix)
  const sourceRoot = sourceKey.replace(/\s*(minor|major|m|maj)$/i, '').trim();
  const targetRoot = targetKey.replace(/\s*(minor|major|m|maj)$/i, '').trim();

  const sourceValue = keyMap[sourceRoot];
  const targetValue = keyMap[targetRoot];

  if (sourceValue === undefined || targetValue === undefined) {
    return 0; // Unknown key
  }

  let shift = targetValue - sourceValue;
  
  // Wrap around octave (keep shift between -6 and +6 semitones)
  if (shift > 6) shift -= 12;
  if (shift < -6) shift += 12;

  return shift;
}

/**
 * Calculate optimal BPM target for mashup (average of both tracks)
 */
export function calculateOptimalBPM(track1: Track, track2: Track): number {
  return (track1.bpm + track2.bpm) / 2;
}

/**
 * Determine if key shift is needed (Camelot wheel compatible keys)
 */
export function shouldShiftKey(sourceKey: string, targetKey: string): boolean {
  const shift = Math.abs(calculateKeyShift(sourceKey, targetKey));
  return shift > 0 && shift <= 3; // Only shift if it's 1-3 semitones (reasonable range)
}

/**
 * Convert semitones to frequency ratio
 * Used for pitch shifting
 */
export function semitonesToRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

/**
 * Convert frequency ratio to semitones
 */
export function ratioToSemitones(ratio: number): number {
  return 12 * Math.log2(ratio);
}

/**
 * Check if playback rate will sound natural (< 6% pitch change)
 */
export function isNaturalPlaybackRate(rate: number): boolean {
  const percentChange = Math.abs((rate - 1.0) * 100);
  return percentChange <= 6;
}

/**
 * Calculate time-stretch quality estimate
 * Returns 'excellent' | 'good' | 'fair' | 'poor'
 */
export function estimateStretchQuality(
  originalBPM: number,
  targetBPM: number
): 'excellent' | 'good' | 'fair' | 'poor' {
  const stretch = calculateBPMStretch(originalBPM, targetBPM);
  const percentChange = Math.abs((stretch - 1.0) * 100);

  if (percentChange <= 3) return 'excellent';
  if (percentChange <= 6) return 'good';
  if (percentChange <= 10) return 'fair';
  return 'poor';
}

/**
 * Get recommended mixing technique based on BPM difference
 */
export function getRecommendedMixTechnique(bpmDiff: number): string {
  if (bpmDiff <= 2) return 'Direct mix (BPMs very close)';
  if (bpmDiff <= 5) return 'Beatmatch with slight tempo adjust';
  if (bpmDiff <= 10) return 'Use tempo sync or time-stretch';
  return 'Creative mixing required (large BPM gap)';
}

/**
 * Calculate energy curve for smooth transitions
 */
export function calculateEnergyCurve(
  track1Energy: number,
  track2Energy: number,
  position: number // 0-1 (crossfade position)
): number {
  // Smooth energy transition using cosine curve
  const curve = (1 - Math.cos(position * Math.PI)) / 2;
  return track1Energy * (1 - curve) + track2Energy * curve;
}

/**
 * Detect if tracks are in double-time relationship
 */
export function detectDoubleTime(bpm1: number, bpm2: number): {
  isDoubleTime: boolean;
  relationship?: 'double' | 'half';
  suggestedAdjustment?: number;
} {
  const ratio = bpm2 / bpm1;
  
  // Check if one is roughly double the other (within 5% tolerance)
  if (Math.abs(ratio - 2.0) < 0.1) {
    return {
      isDoubleTime: true,
      relationship: 'double',
      suggestedAdjustment: 0.5, // Slow down track2 by 50%
    };
  }
  
  if (Math.abs(ratio - 0.5) < 0.05) {
    return {
      isDoubleTime: true,
      relationship: 'half',
      suggestedAdjustment: 2.0, // Speed up track2 by 100%
    };
  }
  
  return { isDoubleTime: false };
}

/**
 * Calculate recommended EQ settings for mashup
 * Returns suggested frequency cuts/boosts
 */
export function calculateMashupEQ(
  track1Energy: number,
  track2Energy: number
): {
  track1LowCut: number; // dB
  track1HighBoost: number;
  track2LowCut: number;
  track2HighBoost: number;
} {
  // If track1 is higher energy, cut its lows to make room for track2
  const energyDiff = track1Energy - track2Energy;
  
  return {
    track1LowCut: energyDiff > 0.2 ? -3 : 0,
    track1HighBoost: energyDiff < -0.2 ? 2 : 0,
    track2LowCut: energyDiff < -0.2 ? -3 : 0,
    track2HighBoost: energyDiff > 0.2 ? 2 : 0,
  };
}

/**
 * Validate if auto-mix is advisable for given tracks
 */
export function canAutoMix(track1: Track, track2: Track): {
  canMix: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  const bpmDiff = Math.abs(track1.bpm - track2.bpm);
  const stretch1 = calculateBPMStretch(track1.bpm, calculateOptimalBPM(track1, track2));
  const stretch2 = calculateBPMStretch(track2.bpm, calculateOptimalBPM(track1, track2));
  
  // Check if time-stretch is too extreme
  if (!isNaturalPlaybackRate(stretch1)) {
    warnings.push(`Track 1 requires ${((stretch1 - 1) * 100).toFixed(1)}% stretch (may sound unnatural)`);
  }
  
  if (!isNaturalPlaybackRate(stretch2)) {
    warnings.push(`Track 2 requires ${((stretch2 - 1) * 100).toFixed(1)}% stretch (may sound unnatural)`);
  }
  
  // Check BPM difference
  if (bpmDiff > 20) {
    warnings.push(`Large BPM difference (${bpmDiff.toFixed(1)} BPM) - consider manual tempo matching`);
  }
  
  // Check confidence
  if (track1.confidence < 0.7 || track2.confidence < 0.7) {
    warnings.push('Low BPM detection confidence - results may vary');
  }
  
  return {
    canMix: warnings.length < 2, // Allow if fewer than 2 warnings
    warnings,
  };
}