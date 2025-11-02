// src/components/TrackCard.tsx
// ✅ UPDATED: Album art + metadata + spectrum analyzer on playback

import { Play, Pause, Trash2, Volume2, Folder, Music, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Track } from '../types/track';
import {
  formatBPM,
  formatKey,
  formatDuration,
  formatConfidencePercent,
  getConfidenceLevel,
  getEnergyLevel,
} from '../utils/formatters';
import { useDisplayPreferences } from '../hooks/useDisplayPreferences';
import { usePlayback } from '../contexts/PlaybackContext';
import { SpectrumAnalyzer } from './SpectrumAnalyzer';

interface TrackCardProps {
  track: Track;
  onRemove?: (id: string) => void;
  compact?: boolean;
}

export function TrackCard({ track, onRemove, compact = false }: TrackCardProps) {
  const { preferences } = useDisplayPreferences();
  
  // ✅ Use global playback
  const { state, playSingleTrack, pause, audio1Ref, setVolume: setGlobalVolume } = usePlayback();
  
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [albumArtError, setAlbumArtError] = useState(false);

  // ✅ Better audio URL validation
  const hasAudioUrl = Boolean(
    track.audioUrl && 
    typeof track.audioUrl === 'string' &&
    track.audioUrl.length > 0 &&
    (track.audioUrl.startsWith('blob:') || track.audioUrl.startsWith('http'))
  );

  // ✅ Check if THIS track is currently playing globally
  const isPlaying = state.source === 'track' && state.track?.id === track.id && state.isPlaying;

  // ✅ Update time/duration from global audio element
  useEffect(() => {
    const audio = audio1Ref.current;
    if (!audio) return;

    const updateTime = () => {
      if (isPlaying) {
        setCurrentTime(audio.currentTime);
      }
    };
    
    const updateDuration = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);

    // Set initial duration if already loaded
    if (audio.duration) {
      setDuration(audio.duration);
    }

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
    };
  }, [audio1Ref, isPlaying]);

  // ✅ Format time as MM:SS
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ✅ Seek to position
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audio1Ref.current || !hasAudioUrl || !isPlaying) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    audio1Ref.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // ✅ Use global playback
  const handlePlayPause = () => {
    if (!hasAudioUrl) {
      alert('Audio file not available. This track was loaded from a saved session.\nPlease re-upload the original audio files to preview.');
      return;
    }

    if (isPlaying) {
      pause();
    } else {
      playSingleTrack(track);
    }
  };

  // ✅ Volume control affects global audio
  const handleVolumeChange = (newVolume: number) => {
    setGlobalVolume(newVolume);
  };

  if (track.isAnalyzing) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center animate-pulse">
              <Music className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {track.name}
            </h3>
            <p className="text-sm text-blue-600 dark:text-blue-400 animate-pulse">
              Analyzing...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (track.error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <Music className="text-red-600 dark:text-red-400" size={24} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {track.name}
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400">{track.error}</p>
          </div>
          {onRemove && (
            <button
              onClick={() => onRemove(track.id)}
              className="flex-shrink-0 p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Calculate progress percentage
  const progressPercentage = isPlaying && duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-lg border-2 transition-all
        ${
          isPlaying
            ? 'border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      {/* Folder Badge (if exists) */}
      {track.folderName && (
        <div className="bg-purple-100 dark:bg-purple-900/30 px-3 py-1.5 border-b border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2">
            <Folder size={14} className="text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 truncate">
              📁 {track.folderPath || track.folderName}
            </span>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Audio Not Available Warning */}
        {!hasAudioUrl && (
          <div className="mb-3 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={14} />
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Audio not available. Re-upload to preview.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          {/* ✅ Album Art or Icon */}
          <div className="flex-shrink-0">
            {track.metadata?.albumArt && !albumArtError ? (
              <img 
                src={track.metadata.albumArt} 
                alt={track.metadata.title || track.name}
                className="w-12 h-12 rounded-lg object-cover shadow-md"
                onError={() => setAlbumArtError(true)}
              />
            ) : (
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
                isPlaying 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                <Music className={isPlaying ? 'text-white' : 'text-blue-600 dark:text-blue-400'} size={24} />
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-1">
              {track.metadata?.title || track.name}
            </h3>

            {/* ✅ Artist/Album/Year metadata */}
            {track.metadata && (track.metadata.artist || track.metadata.album) && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">
                {track.metadata.artist && (
                  <span className="font-medium">{track.metadata.artist}</span>
                )}
                {track.metadata.artist && track.metadata.album && <span> • </span>}
                {track.metadata.album && (
                  <span className="italic">{track.metadata.album}</span>
                )}
                {track.metadata.year && (
                  <span className="ml-2 text-gray-400">({track.metadata.year})</span>
                )}
              </div>
            )}

            {/* ✅ Genre tags */}
            {track.metadata?.genre && track.metadata.genre.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {track.metadata.genre.slice(0, 3).map((genre, i) => (
                  <span 
                    key={i}
                    className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full"
                  >
                    {genre}
                  </span>
                ))}
                {track.metadata.mbGenre && track.metadata.mbGenre.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full flex items-center gap-1">
                    <span>🌐</span>
                    <span>{track.metadata.mbGenre[0]}</span>
                  </span>
                )}
              </div>
            )}

            {/* ✅ Tagged BPM/Key indicators */}
            {(track.metadata?.bpmTag || track.metadata?.keyTag) && (
              <div className="flex flex-wrap gap-1 mb-2">
                {track.metadata.bpmTag && (
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                    🏷️ Tagged BPM: {track.metadata.bpmTag.toFixed(0)}
                  </span>
                )}
                {track.metadata.keyTag && (
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                    🏷️ Tagged Key: {track.metadata.keyTag}
                  </span>
                )}
              </div>
            )}

            {/* Playback controls section */}
            <div className="flex items-center gap-3 mb-3">
              {/* Play/Pause Button */}
              <button
                onClick={handlePlayPause}
                disabled={!hasAudioUrl}
                className={`
                  flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all
                  ${
                    isPlaying
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                      : hasAudioUrl
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  }
                `}
                title={hasAudioUrl ? (isPlaying ? 'Pause' : 'Play') : 'Audio not available'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>

              {/* Progress bar */}
              {hasAudioUrl && (
                <div className="flex-1">
                  <div
                    className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer overflow-hidden group"
                    onClick={handleSeek}
                  >
                    {/* Progress fill */}
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all"
                      style={{ width: `${progressPercentage}%` }}
                    />
                    
                    {/* Hover indicator */}
                    <div className="absolute inset-0 bg-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Playhead */}
                    {isPlaying && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full shadow-md transition-all"
                        style={{ left: `${progressPercentage}%`, marginLeft: '-5px' }}
                      />
                    )}
                  </div>

                  {/* Time display */}
                  <div className="flex items-center justify-between mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-mono">{formatTime(currentTime)}</span>
                    <span className="font-mono">{formatTime(duration || track.duration || 0)}</span>
                  </div>
                </div>
              )}

              {/* Remove Button */}
              {onRemove && (
                <button
                  onClick={() => onRemove(track.id)}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Remove track"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* ✅ NEW: Spectrum Analyzer when playing */}
            {isPlaying && hasAudioUrl && (
              <div className="mb-3">
                <SpectrumAnalyzer
                  audioElement={audio1Ref.current}
                  isPlaying={isPlaying}
                  mode="energy"
                  height={40}
                  showControls={false}
                />
              </div>
            )}

            {/* Main Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">BPM</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatBPM(track.bpm, preferences.bpmMode)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Key</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatKey(track.key, preferences.keyMode, preferences.accidentalStyle)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Duration</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatDuration(track.duration)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Energy</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {getEnergyLevel(track.energy)}
                </div>
              </div>
            </div>

            {/* Confidence Indicators */}
            {preferences.confidenceMode !== 'hidden' && (
              <div className="flex flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                  <span className="text-gray-600 dark:text-gray-400">BPM:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatConfidencePercent(track.confidence)} {getConfidenceLevel(track.confidence)}
                  </span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Key:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatConfidencePercent(track.keyConfidence)} {getConfidenceLevel(track.keyConfidence)}
                  </span>
                </div>
              </div>
            )}

            {/* Volume Control */}
            {hasAudioUrl && (
              <div className="mt-2">
                <button
                  onClick={() => setShowVolumeControl(!showVolumeControl)}
                  className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  <Volume2 size={14} />
                  <span>Volume: {Math.round(state.volume * 100)}%</span>
                </button>
                
                {showVolumeControl && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={state.volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-blue-200 dark:bg-blue-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Analysis Mode Info */}
        {track.analysisMode && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>
                Analyzed: {track.analysisMode} mode
                {track.analyzedDuration && ` (${formatDuration(track.analyzedDuration)})`}
              </span>
              {track.beatCount > 0 && (
                <>
                  <span>•</span>
                  <span>{track.beatCount} beats</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}