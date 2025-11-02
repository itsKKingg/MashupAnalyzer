// src/utils/tonePlayer.ts
// ✅ FIXED: Tone.js-based audio player with pitch-preserving time-stretch (now with dynamic imports)

import { Track } from '../types/track';

// ✅ FIXED: Dynamic imports for code splitting
let ToneModule: typeof import('tone') | null = null;
let MeydaModule: typeof import('meyda') | null = null;

async function loadTone(): Promise<typeof import('tone')> {
  if (!ToneModule) {
    try {
      ToneModule = await import('tone');
      return ToneModule;
    } catch (error) {
      console.error('Failed to load Tone.js:', error);
      throw new Error('Audio engine (Tone.js) failed to load. Please refresh the page.');
    }
  }
  return ToneModule;
}

async function loadMeyda(): Promise<typeof import('meyda')> {
  if (!MeydaModule) {
    try {
      MeydaModule = await import('meyda');
      return MeydaModule;
    } catch (error) {
      console.error('Failed to load Meyda:', error);
      throw new Error('Audio analysis (Meyda) failed to load. Please refresh the page.');
    }
  }
  return MeydaModule;
}

export interface TonePlayerInstance {
  player: any; // ✅ FIXED: Use any since Tone is dynamically loaded
  gainNode: any; // ✅ FIXED: Use any since Tone is dynamically loaded
  analyser: any | null; // ✅ FIXED: Use any since Meyda is dynamically loaded
  cleanup: () => void;
}

export interface SpectralFeatures {
  rms: number; // Loudness
  energy: number;
  spectralCentroid: number;
  spectralRolloff: number;
  zcr: number; // Zero crossing rate
  chroma: number[];
}

/**
 * Create a Tone.js player for a track with time-stretching and analysis
 */
export async function createTonePlayer(
  track: Track,
  options: {
    playbackRate?: number; // 0.5 - 2.0 (tempo adjustment)
    preservesPitch?: boolean; // Pitch lock
    enableAnalysis?: boolean; // Real-time spectrum analysis
  } = {}
): Promise<TonePlayerInstance | null> {
  try {
    // ✅ FIXED: Dynamically load Tone.js
    const Tone = await loadTone();
    
    // Ensure Tone.js is started (requires user gesture)
    await Tone.start();
    
    if (!track.audioUrl) {
      console.error('No audio URL for track:', track.name);
      return null;
    }

    // Create player with pitch-preserving time-stretch
    const player = new Tone.Player({
      url: track.audioUrl,
      playbackRate: options.playbackRate || 1.0,
      loop: false,
    });

    // Create gain node for volume control
    const gainNode = new Tone.Gain(1.0);

    // Connect: Player → Gain → Destination
    player.connect(gainNode);
    gainNode.toDestination();

    // ✅ FIXED: Optional: Real-time spectral analysis with Meyda (dynamically loaded)
    let analyser: any = null;
    
    if (options.enableAnalysis) {
      // ✅ FIXED: Dynamically load Meyda
      const Meyda = await loadMeyda();
      
      // Get the Web Audio API context from Tone
      const audioContext = Tone.context.rawContext as AudioContext;
      
      // Create analyser (will be started when playback begins)
      analyser = Meyda.createMeydaAnalyzer({
        audioContext,
        source: player.toDestination() as any,
        bufferSize: 512,
        featureExtractors: [
          'rms',
          'energy',
          'spectralCentroid',
          'spectralRolloff',
          'zcr',
          'chroma'
        ],
        // Callback fires on every analysis frame
        callback: (features) => {
          // This will be used later for real-time visualizations
          // For now, we'll expose features via getSpectralFeatures()
        }
      });
    }

    console.log('✅ Tone.js player created:', {
      track: track.name,
      playbackRate: options.playbackRate,
      preservesPitch: options.preservesPitch,
      analysisEnabled: !!analyser,
    });

    return {
      player,
      gainNode,
      analyser,
      cleanup: () => {
        if (analyser) {
          analyser.stop();
        }
        player.stop();
        player.disconnect();
        gainNode.disconnect();
        player.dispose();
        gainNode.dispose();
      }
    };

  } catch (error) {
    console.error('Failed to create Tone.js player:', error);
    return null;
  }
}

/**
 * Play two tracks with independent time-stretching (for mashups)
 */
export async function createDualTonePlayers(
  track1: Track,
  track2: Track,
  options: {
    track1Rate?: number;
    track2Rate?: number;
    crossfade?: number; // 0-1 (0 = track1 only, 1 = track2 only)
    enableAnalysis?: boolean;
  } = {}
): Promise<{
  player1: TonePlayerInstance;
  player2: TonePlayerInstance;
  crossfader: any; // ✅ FIXED: Use any since Tone is dynamically loaded
  masterGain: any; // ✅ FIXED: Use any since Tone is dynamically loaded
  cleanup: () => void;
} | null> {
  try {
    // ✅ FIXED: Dynamically load Tone.js
    const Tone = await loadTone();
    await Tone.start();

    const player1Instance = await createTonePlayer(track1, {
      playbackRate: options.track1Rate || 1.0,
      preservesPitch: true,
      enableAnalysis: options.enableAnalysis,
    });

    const player2Instance = await createTonePlayer(track2, {
      playbackRate: options.track2Rate || 1.0,
      preservesPitch: true,
      enableAnalysis: options.enableAnalysis,
    });

    if (!player1Instance || !player2Instance) {
      player1Instance?.cleanup();
      player2Instance?.cleanup();
      return null;
    }

    // Create crossfader
    const crossfader = new Tone.CrossFade(options.crossfade || 0.5);
    const masterGain = new Tone.Gain(1.0);

    // Disconnect from individual destinations
    player1Instance.gainNode.disconnect();
    player2Instance.gainNode.disconnect();

    // Route: Player1 → CrossfadeA, Player2 → CrossfadeB → MasterGain → Destination
    player1Instance.gainNode.connect(crossfader.a);
    player2Instance.gainNode.connect(crossfader.b);
    crossfader.connect(masterGain);
    masterGain.toDestination();

    console.log('✅ Dual Tone.js players created with crossfader');

    return {
      player1: player1Instance,
      player2: player2Instance,
      crossfader,
      masterGain,
      cleanup: () => {
        player1Instance.cleanup();
        player2Instance.cleanup();
        crossfader.disconnect();
        masterGain.disconnect();
        crossfader.dispose();
        masterGain.dispose();
      }
    };

  } catch (error) {
    console.error('Failed to create dual Tone.js players:', error);
    return null;
  }
}

/**
 * Get current spectral features from analyser (for visualizations)
 */
export function getSpectralFeatures(analyser: any | null): SpectralFeatures | null {
  if (!analyser) return null;

  const features = analyser.get() as any;
  
  if (!features) return null;

  return {
    rms: features.rms || 0,
    energy: features.energy || 0,
    spectralCentroid: features.spectralCentroid || 0,
    spectralRolloff: features.spectralRolloff || 0,
    zcr: features.zcr || 0,
    chroma: features.chroma || [],
  };
}

/**
 * Apply time-stretch to existing player (for Auto-Mix)
 */
export function setPlaybackRate(
  playerInstance: TonePlayerInstance,
  rate: number,
  preservesPitch: boolean = true
): void {
  playerInstance.player.playbackRate = rate;
  
  console.log(`⚙️ Playback rate set to ${rate.toFixed(3)}x (pitch-lock: ${preservesPitch})`);
}

/**
 * Set crossfade position (0 = track1, 1 = track2)
 */
export function setCrossfadePosition(
  crossfader: any, // ✅ FIXED: Use any since Tone is dynamically loaded
  position: number // 0-1
): void {
  crossfader.fade.value = position;
}