// src/utils/formatters.ts
// Complete formatting utilities for display preferences

export type BPMMode = 'rounded' | 'precise' | 'hz';
export type KeyMode = 'standard' | 'camelot' | 'unicode';
export type AccidentalStyle = 'sharp' | 'flat';

/**
 * Format BPM based on display mode
 */
export function formatBPM(bpm: number, mode: BPMMode = 'rounded'): string {
  if (!bpm || bpm <= 0) return '-- BPM';

  switch (mode) {
    case 'rounded':
      return `${Math.round(bpm)} BPM`;
    case 'precise':
      return `${bpm.toFixed(2)} BPM`;
    case 'hz':
      return `${(bpm / 60).toFixed(2)} Hz`;
    default:
      return `${Math.round(bpm)} BPM`;
  }
}

/**
 * Camelot wheel mapping for harmonic mixing
 */
const CAMELOT_MAP: Record<string, string> = {
  // Major keys (B side)
  'C': '8B',
  'C major': '8B',
  'G': '9B',
  'G major': '9B',
  'D': '10B',
  'D major': '10B',
  'A': '11B',
  'A major': '11B',
  'E': '12B',
  'E major': '12B',
  'B': '1B',
  'B major': '1B',
  'F#': '2B',
  'F# major': '2B',
  'Gb': '2B',
  'Gb major': '2B',
  'Db': '3B',
  'Db major': '3B',
  'C#': '3B',
  'C# major': '3B',
  'Ab': '4B',
  'Ab major': '4B',
  'G#': '4B',
  'G# major': '4B',
  'Eb': '5B',
  'Eb major': '5B',
  'D#': '5B',
  'D# major': '5B',
  'Bb': '6B',
  'Bb major': '6B',
  'A#': '6B',
  'A# major': '6B',
  'F': '7B',
  'F major': '7B',

  // Minor keys (A side)
  'Am': '8A',
  'A minor': '8A',
  'Em': '9A',
  'E minor': '9A',
  'Bm': '10A',
  'B minor': '10A',
  'F#m': '11A',
  'Gbm': '11A',
  'F# minor': '11A',
  'C#m': '12A',
  'Dbm': '12A',
  'C# minor': '12A',
  'G#m': '1A',
  'Abm': '1A',
  'G# minor': '1A',
  'D#m': '2A',
  'Ebm': '2A',
  'D# minor': '2A',
  'A#m': '3A',
  'Bbm': '3A',
  'A# minor': '3A',
  'Fm': '4A',
  'F minor': '4A',
  'Cm': '5A',
  'C minor': '5A',
  'Gm': '6A',
  'G minor': '6A',
  'Dm': '7A',
  'D minor': '7A',
};

/**
 * Sharp to flat conversion map
 */
const SHARP_TO_FLAT: Record<string, string> = {
  'C#': 'Db',
  'C# major': 'Db major',
  'D#': 'Eb',
  'D# major': 'Eb major',
  'F#': 'Gb',
  'F# major': 'Gb major',
  'G#': 'Ab',
  'G# major': 'Ab major',
  'A#': 'Bb',
  'A# major': 'Bb major',
  'C#m': 'Dbm',
  'C# minor': 'Db minor',
  'D#m': 'Ebm',
  'D# minor': 'Eb minor',
  'F#m': 'Gbm',
  'F# minor': 'Gb minor',
  'G#m': 'Abm',
  'G# minor': 'Ab minor',
  'A#m': 'Bbm',
  'A# minor': 'Bb minor',
};

/**
 * Flat to sharp conversion map
 */
const FLAT_TO_SHARP: Record<string, string> = {
  'Db': 'C#',
  'Db major': 'C# major',
  'Eb': 'D#',
  'Eb major': 'D# major',
  'Gb': 'F#',
  'Gb major': 'F# major',
  'Ab': 'G#',
  'Ab major': 'G# major',
  'Bb': 'A#',
  'Bb major': 'A# major',
  'Dbm': 'C#m',
  'Db minor': 'C# minor',
  'Ebm': 'D#m',
  'Eb minor': 'D# minor',
  'Gbm': 'F#m',
  'Gb minor': 'F# minor',
  'Abm': 'G#m',
  'Ab minor': 'G# minor',
  'Bbm': 'A#m',
  'Bb minor': 'A# minor',
};

/**
 * Format musical key based on display mode and accidental style
 */
export function formatKey(
  key: string,
  mode: KeyMode = 'standard',
  accidentalStyle: AccidentalStyle = 'sharp'
): string {
  if (!key) return 'Unknown';

  let displayKey = key;

  // Handle accidental style conversion
  if (accidentalStyle === 'flat') {
    displayKey = SHARP_TO_FLAT[key] || key;
  } else {
    displayKey = FLAT_TO_SHARP[key] || key;
  }

  switch (mode) {
    case 'camelot':
      return CAMELOT_MAP[key] || CAMELOT_MAP[displayKey] || key;
    
    case 'unicode':
      return displayKey
        .replace(/#/g, '♯')
        .replace(/b(?!$)/g, '♭') // Replace 'b' but not at end (for 'Eb' etc)
        .replace(' minor', 'm')
        .replace(' major', '');
    
    case 'standard':
    default:
      return displayKey
        .replace(' minor', 'm')
        .replace(' major', '');
  }
}

/**
 * Format duration from seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0 || !isFinite(seconds)) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format confidence as percentage
 */
export function formatConfidence(confidence: number): string {
  if (confidence < 0 || confidence > 1) return '0%';
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Get confidence level description
 */
export function getConfidenceLevel(confidence: number): string {
  if (confidence >= 0.9) return 'Very High';
  if (confidence >= 0.7) return 'High';
  if (confidence >= 0.5) return 'Medium';
  if (confidence >= 0.3) return 'Low';
  return 'Very Low';
}

/**
 * Get confidence color class
 */
export function getConfidenceColorClass(confidence: number): string {
  if (confidence >= 0.7) return 'text-green-600 dark:text-green-400';
  if (confidence >= 0.5) return 'text-blue-600 dark:text-blue-400';
  if (confidence >= 0.3) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Format energy level as text description
 */
export function formatEnergy(energy: number): string {
  if (energy >= 0.8) return 'High';
  if (energy >= 0.6) return 'Medium-High';
  if (energy >= 0.4) return 'Medium';
  if (energy >= 0.2) return 'Low-Medium';
  return 'Low';
}

/**
 * Format energy level as numeric percentage
 */
export function formatEnergyPercent(energy: number): string {
  if (energy < 0 || energy > 1) return '0%';
  return `${Math.round(energy * 100)}%`;
}

/**
 * Get energy level description
 */
export function getEnergyLevel(energy: number): string {
  return formatEnergy(energy);
}

/**
 * Get energy color class
 */
export function getEnergyColorClass(energy: number): string {
  if (energy >= 0.8) return 'text-red-600 dark:text-red-400';
  if (energy >= 0.6) return 'text-orange-600 dark:text-orange-400';
  if (energy >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
  if (energy >= 0.2) return 'text-green-600 dark:text-green-400';
  return 'text-blue-600 dark:text-blue-400';
}

/**
 * Format danceability as text description
 */
export function formatDanceability(danceability: number): string {
  if (danceability >= 0.8) return 'Very Danceable';
  if (danceability >= 0.6) return 'Danceable';
  if (danceability >= 0.4) return 'Moderately Danceable';
  if (danceability >= 0.2) return 'Less Danceable';
  return 'Not Danceable';
}

/**
 * Get key confidence level
 */
export function getKeyConfidenceLevel(confidence: number): string {
  return getConfidenceLevel(confidence);
}

/**
 * Get key confidence color class
 */
export function getKeyConfidenceColorClass(confidence: number): string {
  return getConfidenceColorClass(confidence);
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format timestamp for display (e.g., "2 minutes ago")
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
  if (seconds > 0) {
    return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
  }
  return 'Just now';
}

/**
 * Format date as locale string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Format date and time as locale string
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format score (0-1) as percentage with color indication
 */
export function formatScore(score: number): string {
  const percent = Math.round(score * 100);
  return `${percent}%`;
}

/**
 * Get color class for score
 */
export function getScoreColorClass(score: number): string {
  if (score >= 0.8) return 'text-green-600 dark:text-green-400';
  if (score >= 0.6) return 'text-blue-600 dark:text-blue-400';
  if (score >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Get background color class for score
 */
export function getScoreBgClass(score: number): string {
  if (score >= 0.8) return 'bg-green-100 dark:bg-green-900/30';
  if (score >= 0.6) return 'bg-blue-100 dark:bg-blue-900/30';
  if (score >= 0.4) return 'bg-yellow-100 dark:bg-yellow-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format BPM difference between two tracks
 */
export function formatBPMDiff(bpm1: number, bpm2: number): string {
  const diff = Math.abs(bpm1 - bpm2);
  const percent = ((diff / Math.min(bpm1, bpm2)) * 100).toFixed(1);
  
  if (diff < 1) return 'Perfect Match';
  if (diff < 3) return `±${diff.toFixed(1)} BPM`;
  return `±${diff.toFixed(1)} BPM (${percent}%)`;
}

/**
 * Format key compatibility description
 */
export function formatKeyCompatibility(key1: string, key2: string): string {
  if (key1 === key2) return 'Same Key';
  
  const camelot1 = CAMELOT_MAP[key1];
  const camelot2 = CAMELOT_MAP[key2];
  
  if (!camelot1 || !camelot2) return 'Unknown';
  
  // Extract number and letter
  const num1 = parseInt(camelot1);
  const num2 = parseInt(camelot2);
  const letter1 = camelot1.slice(-1);
  const letter2 = camelot2.slice(-1);
  
  // Perfect match
  if (camelot1 === camelot2) return 'Same Key';
  
  // Energy boost/drop (same letter, ±1 number)
  if (letter1 === letter2 && Math.abs(num1 - num2) === 1) {
    return num2 > num1 ? 'Energy Boost' : 'Energy Drop';
  }
  
  // Relative major/minor (same number, different letter)
  if (num1 === num2 && letter1 !== letter2) {
    return 'Relative Major/Minor';
  }
  
  // Harmonic mix (±1 number, different letter)
  if (Math.abs(num1 - num2) === 1 && letter1 !== letter2) {
    return 'Harmonic Mix';
  }
  
  return 'Different Key';
}

/**
 * Format analysis mode display name
 */
export function formatAnalysisMode(mode: string): string {
  switch (mode) {
    case 'quick':
      return 'Quick (15s)';
    case 'full':
      return 'Full (30s)';
    case 'high-precision':
      return 'High-Precision (45s)';
    default:
      return mode;
  }
}

// ============================================================================
// ALIASES FOR BACKWARDS COMPATIBILITY
// ============================================================================

/**
 * Alias: formatConfidencePercent → formatConfidence
 */
export const formatConfidencePercent = formatConfidence;

/**
 * Alias: formatEnergyValue → formatEnergyPercent
 */
export const formatEnergyValue = formatEnergyPercent;

/**
 * Alias: formatDanceabilityPercent → formatDanceability percentage version
 */
export function formatDanceabilityPercent(danceability: number): string {
  if (danceability < 0 || danceability > 1) return '0%';
  return `${Math.round(danceability * 100)}%`;
}

/**
 * Alias: formatKeyString → formatKey
 */
export const formatKeyString = formatKey;

/**
 * Alias: formatBPMString → formatBPM
 */
export const formatBPMString = formatBPM;

/**
 * Alias: formatTime → formatDuration
 */
export const formatTime = formatDuration;

/**
 * Alias: formatTimestamp → formatDateTime
 */
export const formatTimestamp = formatDateTime;