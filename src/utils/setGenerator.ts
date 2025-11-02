// src/utils/setGenerator.ts
// Auto-generate DJ sets with energy arc and smooth transitions

import { Track, MashupCandidate } from '../types/track';
import { getHarmonicTier, getKeyCompatibilityScore } from './mashupOptimizer';

export interface SetPreferences {
  durationMinutes: number;
  energyCurve: 'steady' | 'build' | 'rollercoaster';
  preferHarmonicMixing: boolean;
  allowGenreJumps: boolean;
  avoidBackToBackFolder: boolean;
  preferCrossFolderMashups: boolean;
}

export interface GeneratedSet {
  tracks: Track[];
  transitions: {
    fromTrack: Track;
    toTrack: Track;
    score: number;
    bpmDiff: number;
    keyCompatible: boolean;
    mixPoint?: string; // e.g., "2:45 → 0:30"
  }[];
  totalDuration: number;
  energyArc: number[]; // Energy values for visualization
  averageScore: number;
}

/**
 * Calculate target energy for a given position in the set
 */
function getTargetEnergy(
  position: number,
  total: number,
  curve: 'steady' | 'build' | 'rollercoaster'
): number {
  const progress = position / total;

  switch (curve) {
    case 'steady':
      // Maintain around 0.6-0.7 energy
      return 0.65 + Math.random() * 0.1 - 0.05;

    case 'build':
      // Warm-up (25%) → Peak (50%) → Maintain (25%)
      if (progress < 0.25) {
        // Warm-up: 0.4 → 0.6
        return 0.4 + (progress / 0.25) * 0.2;
      } else if (progress < 0.75) {
        // Build to peak: 0.6 → 0.9
        return 0.6 + ((progress - 0.25) / 0.5) * 0.3;
      } else {
        // Maintain peak: 0.85 → 0.9
        return 0.85 + Math.random() * 0.05;
      }

    case 'rollercoaster':
      // Multiple peaks and valleys
      // Use sine wave with multiple cycles
      const cycles = 3;
      const wave = Math.sin(progress * Math.PI * cycles);
      return 0.5 + wave * 0.3; // Range: 0.2 → 0.8

    default:
      return 0.65;
  }
}

/**
 * Score how well a track fits at the current position
 */
function scoreTrackForPosition(
  track: Track,
  previousTrack: Track | null,
  position: number,
  total: number,
  preferences: SetPreferences,
  usedFolders: string[]
): number {
  let score = 0;

  // Energy matching (40% weight)
  const targetEnergy = getTargetEnergy(position, total, preferences.energyCurve);
  const energyDiff = Math.abs(track.energy - targetEnergy);
  const energyScore = Math.max(0, 1 - energyDiff * 2); // Penalize deviation
  score += energyScore * 0.4;

  // Transition from previous track (40% weight)
  if (previousTrack) {
    const bpmDiff = Math.abs(track.bpm - previousTrack.bpm);
    const bpmScore = Math.max(0, 1 - bpmDiff / 15); // ±15 BPM tolerance

    let keyScore = 0;
    if (preferences.preferHarmonicMixing) {
      keyScore = getKeyCompatibilityScore(previousTrack.key, track.key);
    } else {
      keyScore = 0.5; // Neutral if not preferred
    }

    const transitionScore = (bpmScore + keyScore) / 2;
    score += transitionScore * 0.4;
  } else {
    // First track: prefer mid-energy
    score += 0.4;
  }

  // Folder diversity (10% weight)
  if (preferences.avoidBackToBackFolder && previousTrack) {
    const sameFolderAsPrev = track.folderName === previousTrack.folderName;
    if (!sameFolderAsPrev) {
      score += 0.1;
    }
  } else {
    score += 0.05;
  }

  // Variety bonus (10% weight)
  const folderName = track.folderName || 'Uncategorized';
  const folderUsageCount = usedFolders.filter(f => f === folderName).length;
  const varietyScore = Math.max(0, 1 - folderUsageCount * 0.2);
  score += varietyScore * 0.1;

  return score;
}

/**
 * Auto-generate a DJ set
 */
export async function generateSet(
  tracks: Track[],
  preferences: SetPreferences,
  startingTrack?: Track
): Promise<GeneratedSet> {
  console.log('🎵 Generating set...', preferences);

  // Filter valid tracks
  const validTracks = tracks.filter(
    t => t && !t.isAnalyzing && !t.error && t.bpm > 0 && t.key && t.duration > 0
  );

  if (validTracks.length < 2) {
    throw new Error('Need at least 2 valid tracks to generate a set');
  }

  const targetDurationSeconds = preferences.durationMinutes * 60;
  const selectedTracks: Track[] = [];
  const transitions: GeneratedSet['transitions'] = [];
  const usedFolders: string[] = [];
  let totalDuration = 0;

  // Pick starting track
  let currentTrack: Track;
  if (startingTrack) {
    currentTrack = startingTrack;
  } else {
    // Pick a track with mid-energy for warm-up start
    const targetEnergy = getTargetEnergy(0, 1, preferences.energyCurve);
    const sorted = [...validTracks].sort((a, b) => {
      const diffA = Math.abs(a.energy - targetEnergy);
      const diffB = Math.abs(b.energy - targetEnergy);
      return diffA - diffB;
    });
    currentTrack = sorted[0];
  }

  selectedTracks.push(currentTrack);
  usedFolders.push(currentTrack.folderName || 'Uncategorized');
  totalDuration += currentTrack.duration;

  const availableTracks = validTracks.filter(t => t.id !== currentTrack.id);

  // Build the set
  while (totalDuration < targetDurationSeconds && availableTracks.length > 0) {
    const position = selectedTracks.length;
    const estimatedTotal = Math.ceil(targetDurationSeconds / 180); // ~3min avg per track

    // Score all available tracks
    const candidates = availableTracks.map(track => ({
      track,
      score: scoreTrackForPosition(
        track,
        currentTrack,
        position,
        estimatedTotal,
        preferences,
        usedFolders
      ),
    }));

    // Sort by score
    candidates.sort((a, b) => b.score - a.score);

    // Pick best (with slight randomness to avoid too predictable)
    const topCandidates = candidates.slice(0, Math.min(3, candidates.length));
    const nextCandidate = topCandidates[Math.floor(Math.random() * topCandidates.length)];
    const nextTrack = nextCandidate.track;

    // Calculate transition details
    const bpmDiff = Math.abs(nextTrack.bpm - currentTrack.bpm);
    const keyCompatible = getHarmonicTier(currentTrack.key, nextTrack.key) !== 'tier-6';

    transitions.push({
      fromTrack: currentTrack,
      toTrack: nextTrack,
      score: nextCandidate.score,
      bpmDiff,
      keyCompatible,
      mixPoint: `${formatMixTime(currentTrack.duration * 0.75)} → ${formatMixTime(nextTrack.duration * 0.1)}`,
    });

    selectedTracks.push(nextTrack);
    usedFolders.push(nextTrack.folderName || 'Uncategorized');
    totalDuration += nextTrack.duration;
    currentTrack = nextTrack;

    // Remove from available
    const index = availableTracks.findIndex(t => t.id === nextTrack.id);
    if (index >= 0) {
      availableTracks.splice(index, 1);
    }

    // Yield to browser
    if (position % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  // Build energy arc
  const energyArc = selectedTracks.map(t => t.energy);

  // Calculate average transition score
  const averageScore = transitions.length > 0
    ? transitions.reduce((sum, t) => sum + t.score, 0) / transitions.length
    : 0;

  console.log(`✅ Set generated: ${selectedTracks.length} tracks, ${(totalDuration / 60).toFixed(1)} min`);

  return {
    tracks: selectedTracks,
    transitions,
    totalDuration,
    energyArc,
    averageScore,
  };
}

function formatMixTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}