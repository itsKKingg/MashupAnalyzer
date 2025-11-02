// src/types/track.ts
// ✅ UPDATED: Added metadata field

export interface Track {
  id: string;
  name: string;
  file: File;
  audioUrl: string;
  
  // Analysis results
  bpm: number;
  key: string;
  duration: number;
  energy: number;
  confidence: number;
  keyConfidence: number;
  danceability: number;
  beatCount: number;
  
  // Optional analysis data
  beats?: number[];
  segments?: Array<{ start: number; duration: number; loudness: number }>;
  analysisMode?: 'quick' | 'full' | 'high-precision';
  analyzedDuration?: number;
  
  // State
  isAnalyzing: boolean;
  error?: string;
  
  // Folder info
  folderName?: string;
  folderPath?: string;
  
  // ✅ NEW: Extended metadata
  metadata?: {
    title?: string;
    artist?: string;
    album?: string;
    year?: number;
    genre?: string[];
    albumArt?: string; // Base64 data URL
    bpmTag?: number; // BPM from file tags (if exists)
    keyTag?: string; // Key from file tags
    mbid?: string; // MusicBrainz ID
    mbGenre?: string[]; // Genre from MusicBrainz
    mbRating?: number;
  };
}

export type SortBy = 'name' | 'bpm' | 'key' | 'energy' | 'confidence' | 'duration';

export type BPMMode = 'original' | 'doubled' | 'halved';
export type KeyMode = 'standard' | 'camelot' | 'open-key';
export type AccidentalStyle = 'sharp' | 'flat';
export type ConfidenceMode = 'always' | 'low-only' | 'hidden';

export type MashupCategory = 'excellent' | 'good' | 'fair' | 'poor';
export type MatchBadge = 'perfect' | 'excellent' | 'great' | 'good' | 'beatmatchable' | 'harmonic' | 'fair';
export type HarmonicTier = 'tier-1' | 'tier-2' | 'tier-3' | 'tier-4' | 'tier-5' | 'tier-6';
export type MixDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface MashupCandidate {
  track1: Track;
  track2: Track;
  score: number;
  reason: string;
  category: MashupCategory;
  
  // DJ-first metadata
  perfectMatchScore: number; // 0-100 (BPM + key priority)
  bpmDifference: number;
  pitchAdjustPercent: number;
  pitchAdjustSemitones: number;
  isNaturalPitch: boolean; // <= 6%
  matchBadge: MatchBadge;
  harmonicTier: HarmonicTier;
  mixDifficulty: MixDifficulty;
  isCrossFolder?: boolean;
}

export type BPMTolerance = 'strict' | 'normal' | 'flexible' | 'creative';
export type SortOption = 'perfect-match' | 'bpm-first' | 'key-first' | 'score';

export interface AnalysisPreferences {
  mode: 'quick' | 'full' | 'high-precision';
  segmentDensity: 'minimal' | 'moderate' | 'detailed';
  beatStorage: 'none' | 'count' | 'full';
}

export interface DisplayPreferences {
  bpmMode: BPMMode;
  keyMode: KeyMode;
  accidentalStyle: AccidentalStyle;
  confidenceMode: ConfidenceMode;
}

// ✅ FIXED: Added CrossFolderMashup type for cross-folder mashup cards
export interface CrossFolderMashup extends MashupCandidate {
  folder1: {
    name: string;
    color: string;
  };
  folder2: {
    name: string;
    color: string;
  };
}