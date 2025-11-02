// src/components/MashupCard.tsx
// ✅ FIXED: Full integration with global PlaybackContext

import { Play, Pause, Volume2, Folder, AlertCircle, TrendingUp, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MashupCandidate, MatchBadge, HarmonicTier } from '../types/track';
import { formatBPM, formatKey, formatDuration } from '../utils/formatters';
import { useDisplayPreferences } from '../hooks/useDisplayPreferences';
import { usePlayback } from '../contexts/PlaybackContext';

interface MashupCardProps {
  mashup: MashupCandidate;
  rank: number;
}

const BADGE_STYLES: Record<MatchBadge, { bg: string; text: string; icon: string }> = {
  perfect: { bg: 'bg-gradient-to-r from-yellow-400 to-orange-500', text: 'text-white', icon: '🎯' },
  excellent: { bg: 'bg-gradient-to-r from-green-500 to-emerald-600', text: 'text-white', icon: '⭐' },
  great: { bg: 'bg-gradient-to-r from-blue-500 to-cyan-600', text: 'text-white', icon: '✨' },
  good: { bg: 'bg-gradient-to-r from-indigo-500 to-purple-600', text: 'text-white', icon: '👍' },
  beatmatchable: { bg: 'bg-gradient-to-r from-pink-500 to-rose-600', text: 'text-white', icon: '🥁' },
  harmonic: { bg: 'bg-gradient-to-r from-purple-500 to-pink-600', text: 'text-white', icon: '🎹' },
  fair: { bg: 'bg-gray-400', text: 'text-white', icon: '✓' },
};

const TIER_LABELS: Record<HarmonicTier, string> = {
  'tier-1': 'Same Key (Perfect)',
  'tier-2': 'Perfect 5th (+1)',
  'tier-3': 'Relative Minor/Major',
  'tier-4': 'Energy Boost (+2)',
  'tier-5': 'Compatible',
  'tier-6': 'Creative/Risky',
};

const DIFFICULTY_COLORS = {
  beginner: 'text-green-600 dark:text-green-400',
  intermediate: 'text-blue-600 dark:text-blue-400',
  advanced: 'text-orange-600 dark:text-orange-400',
  expert: 'text-red-600 dark:text-red-400',
};

export function MashupCard({ mashup, rank }: MashupCardProps) {
  const { preferences } = useDisplayPreferences();
  
  const { 
    state, 
    playSingleTrack, 
    playMashup, 
    pause,
    stop,
    audio1Ref, 
    audio2Ref,
    autoMixEnabled,
    setAutoMixEnabled,
    timeStretchInfo
  } = usePlayback();

  const [showDetails, setShowDetails] = useState(false);
  const [track1Volume, setTrack1Volume] = useState(0.7);
  const [track2Volume, setTrack2Volume] = useState(0.7);

  const hasAudio1 = Boolean(
    mashup.track1.audioUrl && 
    typeof mashup.track1.audioUrl === 'string' &&
    mashup.track1.audioUrl.length > 0 &&
    (mashup.track1.audioUrl.startsWith('blob:') || mashup.track1.audioUrl.startsWith('http')) &&
    mashup.track1.file instanceof File
  );
  
  const hasAudio2 = Boolean(
    mashup.track2.audioUrl && 
    typeof mashup.track2.audioUrl === 'string' &&
    mashup.track2.audioUrl.length > 0 &&
    (mashup.track2.audioUrl.startsWith('blob:') || mashup.track2.audioUrl.startsWith('http')) &&
    mashup.track2.file instanceof File
  );
  
  const hasAnyAudio = hasAudio1 || hasAudio2;
  const hasBothAudio = hasAudio1 && hasAudio2;

  // ✅ FIXED: Detect if THIS mashup is playing
  const isThisMashupPlaying = (() => {
    if (!state.isPlaying || state.mode !== 'dual' || !state.mashup) return false;
    
    // Check if the current playing mashup matches this card's mashup
    const match1 = state.mashup.track1.id === mashup.track1.id && state.mashup.track2.id === mashup.track2.id;
    const match2 = state.mashup.track1.id === mashup.track2.id && state.mashup.track2.id === mashup.track1.id;
    
    return match1 || match2;
  })();

  const isTrack1Playing = state.isPlaying && state.mode === 'single' && state.track?.id === mashup.track1.id;
  const isTrack2Playing = state.isPlaying && state.mode === 'single' && state.track?.id === mashup.track2.id;

  // Sync volumes to global audio elements when playing
  useEffect(() => {
    if (isThisMashupPlaying && state.engine === 'none') {
      if (audio1Ref.current && audio2Ref.current) {
        audio1Ref.current.volume = track1Volume;
        audio2Ref.current.volume = track2Volume;
      }
    }
  }, [isThisMashupPlaying, track1Volume, track2Volume, audio1Ref, audio2Ref, state.engine]);

  const handlePlayPause = (mode: 'track1' | 'track2' | 'dual') => {
    console.log('🎵 MashupCard handlePlayPause:', mode, 'isThisMashupPlaying:', isThisMashupPlaying);

    if (mode === 'track1' && !hasAudio1) {
      alert('Audio file not available for Track 1.\nPlease re-upload the original file.');
      return;
    }
    if (mode === 'track2' && !hasAudio2) {
      alert('Audio file not available for Track 2.\nPlease re-upload the original file.');
      return;
    }
    if (mode === 'dual' && !hasBothAudio) {
      alert('Both audio files are required for mashup preview.\nPlease re-upload the original files.');
      return;
    }

    // If this mashup is already playing in dual mode, stop it
    if (mode === 'dual' && isThisMashupPlaying) {
      console.log('⏸️ Stopping current mashup');
      stop();
      return;
    }

    // If a single track from this mashup is playing, stop it
    if (mode === 'track1' && isTrack1Playing) {
      console.log('⏸️ Stopping track 1');
      stop();
      return;
    }

    if (mode === 'track2' && isTrack2Playing) {
      console.log('⏸️ Stopping track 2');
      stop();
      return;
    }

    // Play the requested mode
    if (mode === 'track1') {
      console.log('▶️ Playing track 1');
      playSingleTrack(mashup.track1);
    } else if (mode === 'track2') {
      console.log('▶️ Playing track 2');
      playSingleTrack(mashup.track2);
    } else if (mode === 'dual') {
      console.log('▶️ Playing mashup (dual)');
      playMashup(mashup.track1, mashup.track2);
      
      // Set initial volumes after a short delay
      setTimeout(() => {
        if (audio1Ref.current && audio2Ref.current && state.engine === 'none') {
          audio1Ref.current.volume = track1Volume;
          audio2Ref.current.volume = track2Volume;
        }
      }, 100);
    }
  };

  const getCategoryColor = () => {
    switch (mashup.category) {
      case 'excellent':
        return 'from-green-500 to-emerald-600';
      case 'good':
        return 'from-blue-500 to-cyan-600';
      case 'fair':
        return 'from-yellow-500 to-orange-600';
      case 'poor':
        return 'from-red-500 to-pink-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const badgeStyle = BADGE_STYLES[mashup.matchBadge];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className={`bg-gradient-to-r ${getCategoryColor()} px-4 py-3`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-full">
              <span className="text-sm font-bold text-white">#{rank}</span>
            </div>
            <div>
              <div className="text-white font-semibold">
                Score: {mashup.perfectMatchScore}/100
              </div>
              <div className="text-white/80 text-xs capitalize">{mashup.category}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className={`${badgeStyle.bg} ${badgeStyle.text} px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md`}>
              <span className="text-sm">{badgeStyle.icon}</span>
              <span className="text-xs font-bold uppercase">{mashup.matchBadge}</span>
            </div>

            {mashup.isCrossFolder && (
              <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full flex items-center gap-1">
                <span className="text-xs font-semibold text-white">🔀 Cross-Folder</span>
              </div>
            )}

            <div className={`px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full`}>
              <span className={`text-xs font-semibold ${DIFFICULTY_COLORS[mashup.mixDifficulty]} mix-blend-screen`}>
                {mashup.mixDifficulty.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Reason */}
        <div className="mb-4 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300 text-center font-medium">
            {mashup.reason}
          </p>
        </div>

        {/* DJ Info Panel */}
        <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">BPM Diff</div>
            <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
              ±{mashup.bpmDifference.toFixed(1)}
            </div>
          </div>

          <div className={`rounded-lg p-3 border ${
            mashup.isNaturalPitch 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
              : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
          }`}>
            <div className={`text-xs font-medium mb-1 ${
              mashup.isNaturalPitch 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-orange-600 dark:text-orange-400'
            }`}>
              Pitch Shift
            </div>
            <div className={`text-lg font-bold ${
              mashup.isNaturalPitch 
                ? 'text-green-700 dark:text-green-300' 
                : 'text-orange-700 dark:text-orange-300'
            }`}>
              {mashup.pitchAdjustPercent.toFixed(1)}%
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
            <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">Key Match</div>
            <div className="text-sm font-bold text-purple-700 dark:text-purple-300">
              {TIER_LABELS[mashup.harmonicTier].split(' ')[0]}
            </div>
          </div>

          <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3 border border-pink-200 dark:border-pink-800">
            <div className="text-xs text-pink-600 dark:text-pink-400 font-medium mb-1">Energy Gap</div>
            <div className="text-lg font-bold text-pink-700 dark:text-pink-300">
              {Math.abs(mashup.track1.energy - mashup.track2.energy).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Expandable Details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full mb-4 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors flex items-center justify-between"
        >
          <span>{showDetails ? '▼' : '▶'} DJ Details</span>
          <TrendingUp size={16} />
        </button>

        {showDetails && (
          <div className="mb-4 p-4 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Pitch (Semitones):</span>
                <span className="ml-2 font-bold text-gray-900 dark:text-white">
                  ±{mashup.pitchAdjustSemitones.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Natural Pitch:</span>
                <span className={`ml-2 font-bold ${mashup.isNaturalPitch ? 'text-green-600' : 'text-orange-600'}`}>
                  {mashup.isNaturalPitch ? '✓ Yes' : '✗ No'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600 dark:text-gray-400">Harmonic Tier:</span>
                <span className="ml-2 font-bold text-purple-600 dark:text-purple-400">
                  {TIER_LABELS[mashup.harmonicTier]}
                </span>
              </div>
            </div>

            {!mashup.isNaturalPitch && (
              <div className="mt-2 p-2 bg-orange-100 dark:bg-orange-900/30 rounded border border-orange-300 dark:border-orange-800">
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  ⚠️ Pitch shift &gt; 6% may sound unnatural. Use key lock or tempo sync.
                </p>
              </div>
            )}

            <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded border border-blue-300 dark:border-blue-800">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">💡 Mixing Tips:</p>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                {mashup.bpmDifference <= 2 && <li>• BPMs are very close - beatmatch easily!</li>}
                {mashup.harmonicTier === 'tier-1' && <li>• Same key - harmonic mixing guaranteed</li>}
                {mashup.harmonicTier === 'tier-2' && <li>• Perfect 5th - energy boost transition</li>}
                {mashup.matchBadge === 'perfect' && <li>• PERFECT MATCH - mix anytime!</li>}
                {mashup.mixDifficulty === 'beginner' && <li>• Great for practicing transitions</li>}
              </ul>
            </div>
          </div>
        )}

        {/* Audio Warnings */}
        {!hasAnyAudio && (
          <div className="mb-4 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Audio files not available. Re-upload the original files to preview.
              </p>
            </div>
          </div>
        )}

        {hasAnyAudio && !hasBothAudio && (
          <div className="mb-4 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-orange-700 dark:text-orange-300">
                Only one track available. Mashup preview requires both tracks.
              </p>
            </div>
          </div>
        )}

        {/* Auto-Mix Toggle */}
        <div className="mb-3 flex items-center justify-between bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 p-3 rounded-lg border border-purple-300 dark:border-purple-800">
          <div className="flex items-center gap-2">
            <Zap className={`${autoMixEnabled ? 'text-green-600 animate-pulse' : 'text-purple-600'}`} size={18} />
            <span className="text-sm font-semibold text-purple-900 dark:text-purple-200">
              DJ Auto-Mix Mode
            </span>
          </div>
          <button
            onClick={() => {
              const newAutoMix = !autoMixEnabled;
              setAutoMixEnabled(newAutoMix);
              
              // If currently playing THIS mashup, restart with new mode
              if (isThisMashupPlaying) {
                playMashup(mashup.track1, mashup.track2);
                
                setTimeout(() => {
                  if (audio1Ref.current && audio2Ref.current && state.engine === 'none') {
                    audio1Ref.current.volume = track1Volume;
                    audio2Ref.current.volume = track2Volume;
                  }
                }, 100);
              }
            }}
            disabled={!hasBothAudio}
            className={`
              px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-md
              ${autoMixEnabled
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white ring-2 ring-green-300'
                : hasBothAudio
                  ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 border-2 border-purple-400 hover:bg-purple-50 dark:hover:bg-gray-600'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
              }
            `}
            title={hasBothAudio ? 'Toggle BPM/key auto-matching' : 'Both audio files required'}
          >
            {autoMixEnabled ? '✓ Auto-Mix ON' : 'Auto-Mix OFF'}
          </button>
        </div>

        {/* Auto-Mix Info */}
        {isThisMashupPlaying && autoMixEnabled && timeStretchInfo && timeStretchInfo.targetBPM > 0 && (
          <div className="mb-4 p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border-2 border-green-300 dark:border-green-800 shadow-md">
            <p className="text-xs font-bold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
              <Zap size={14} className="animate-pulse" />
              Auto-Mix Active - Tracks Synchronized
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white dark:bg-gray-800 p-2 rounded border border-blue-200 dark:border-blue-800">
                <p className="text-blue-600 dark:text-blue-400 font-semibold mb-1">🎵 Track 1:</p>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-mono">{mashup.track1.bpm.toFixed(1)}</span> → <span className="font-mono font-bold">{timeStretchInfo.targetBPM.toFixed(1)} BPM</span>
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  Stretch: <span className="font-bold">{((timeStretchInfo.track1Rate - 1) * 100).toFixed(1)}%</span>
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border border-purple-200 dark:border-purple-800">
                <p className="text-purple-600 dark:text-purple-400 font-semibold mb-1">🎵 Track 2:</p>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-mono">{mashup.track2.bpm.toFixed(1)}</span> → <span className="font-mono font-bold">{timeStretchInfo.targetBPM.toFixed(1)} BPM</span>
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  Stretch: <span className="font-bold">{((timeStretchInfo.track2Rate - 1) * 100).toFixed(1)}%</span>
                </p>
              </div>
            </div>
            <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/30 rounded">
              <p className="text-xs text-green-800 dark:text-green-200 text-center font-semibold">
                🎚️ Both tracks tempo-matched! ({timeStretchInfo.engine === 'soundtouch' ? 'SoundTouch' : timeStretchInfo.engine === 'tone' ? 'Tone.js' : 'HTMLAudio'})
              </p>
            </div>
          </div>
        )}

        {/* Dual Preview Button */}
        <div className="mb-4">
          <button
            onClick={() => handlePlayPause('dual')}
            disabled={!hasBothAudio}
            className={`
              w-full px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-md
              ${hasBothAudio
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white hover:shadow-lg'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
              }
              ${isThisMashupPlaying ? 'ring-4 ring-purple-300 dark:ring-purple-700' : ''}
            `}
            title={hasBothAudio ? 'Preview both tracks together' : 'Both audio files required'}
          >
            {isThisMashupPlaying ? (
              <>
                <Pause size={20} />
                <span>Stop Mashup Preview</span>
              </>
            ) : (
              <>
                <Play size={20} />
                <span>🎧 Preview Mashup (Both Tracks)</span>
              </>
            )}
          </button>
        </div>

        {/* Volume Controls (when dual playing) */}
        {isThisMashupPlaying && state.engine === 'none' && (
          <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="text-xs text-purple-700 dark:text-purple-300 font-semibold mb-2 text-center">
              🎛️ Adjust individual track volumes (crossfade in player bar affects both)
            </p>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 mb-1">
                  <span className="font-medium flex items-center gap-1 truncate">
                    <Volume2 size={14} />
                    <span className="truncate">{mashup.track1.name}</span>
                  </span>
                  <span className="font-bold flex-shrink-0 ml-2">{Math.round(track1Volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={track1Volume}
                  onChange={(e) => setTrack1Volume(parseFloat(e.target.value))}
                  className="w-full h-2 bg-purple-200 dark:bg-purple-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 mb-1">
                  <span className="font-medium flex items-center gap-1 truncate">
                    <Volume2 size={14} />
                    <span className="truncate">{mashup.track2.name}</span>
                  </span>
                  <span className="font-bold flex-shrink-0 ml-2">{Math.round(track2Volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={track2Volume}
                  onChange={(e) => setTrack2Volume(parseFloat(e.target.value))}
                  className="w-full h-2 bg-purple-200 dark:bg-purple-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* Individual Track Cards */}
        <div className="space-y-3">
          {/* Track 1 */}
          <div className={`border-2 rounded-lg overflow-hidden transition-all ${
            isTrack1Playing || isThisMashupPlaying
              ? 'border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/20' 
              : 'border-blue-200 dark:border-blue-800'
          }`}>
            {mashup.track1.folderName && (
              <div className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 border-b border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <Folder size={14} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 truncate">
                    📁 {mashup.track1.folderPath || mashup.track1.folderName}
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/10">
              <button
                onClick={() => handlePlayPause('track1')}
                disabled={!hasAudio1}
                className={`
                  flex-shrink-0 p-2.5 rounded-lg transition-all
                  ${isTrack1Playing
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                    : hasAudio1
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  }
                `}
                title={hasAudio1 ? 'Play track' : 'Audio not available'}
              >
                {isTrack1Playing ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                  {mashup.track1.name}
                </h4>
                <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{formatBPM(mashup.track1.bpm, preferences.bpmMode)}</span>
                  <span>•</span>
                  <span className="font-medium">{formatKey(mashup.track1.key, preferences.keyMode, preferences.accidentalStyle)}</span>
                  <span>•</span>
                  <span>{formatDuration(mashup.track1.duration)}</span>
                  <span>•</span>
                  <span>Energy: {mashup.track1.energy.toFixed(2)}</span>
                </div>
                {!hasAudio1 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    ⚠️ Audio unavailable
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Track 2 */}
          <div className={`border-2 rounded-lg overflow-hidden transition-all ${
            isTrack2Playing || isThisMashupPlaying
              ? 'border-purple-500 dark:border-purple-400 shadow-lg shadow-purple-500/20' 
              : 'border-purple-200 dark:border-purple-800'
          }`}>
            {mashup.track2.folderName && (
              <div className="bg-purple-100 dark:bg-purple-900/30 px-3 py-1.5 border-b border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2">
                  <Folder size={14} className="text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 truncate">
                    📁 {mashup.track2.folderPath || mashup.track2.folderName}
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/10">
              <button
                onClick={() => handlePlayPause('track2')}
                disabled={!hasAudio2}
                className={`
                  flex-shrink-0 p-2.5 rounded-lg transition-all
                  ${isTrack2Playing
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md'
                    : hasAudio2
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  }
                `}
                title={hasAudio2 ? 'Play track' : 'Audio not available'}
              >
                {isTrack2Playing ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                  {mashup.track2.name}
                </h4>
                <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{formatBPM(mashup.track2.bpm, preferences.bpmMode)}</span>
                  <span>•</span>
                  <span className="font-medium">{formatKey(mashup.track2.key, preferences.keyMode, preferences.accidentalStyle)}</span>
                  <span>•</span>
                  <span>{formatDuration(mashup.track2.duration)}</span>
                  <span>•</span>
                  <span>Energy: {mashup.track2.energy.toFixed(2)}</span>
                </div>
                {!hasAudio2 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    ⚠️ Audio unavailable
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}