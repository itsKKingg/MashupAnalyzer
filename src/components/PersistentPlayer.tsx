// src/components/PersistentPlayer.tsx
// ✅ FIXED: Working volume controls with direct interaction

import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music2, Disc3, X, Activity, RotateCcw, RotateCw } from 'lucide-react';
import { usePlayback } from '../contexts/PlaybackContext';
import { formatBPM, formatKey } from '../utils/formatters';
import { useDisplayPreferences } from '../hooks/useDisplayPreferences';
import { useState, useEffect, useRef } from 'react';
import { SpectrumAnalyzer } from './SpectrumAnalyzer';

export function PersistentPlayer() {
  const {
    state,
    togglePlayPause,
    stop,
    volume,
    setVolume,
    crossfade,
    setCrossfade,
    skip,
    currentTime,
    duration,
    timeStretchInfo,
  } = usePlayback();

  const { preferences } = useDisplayPreferences();
  const [albumArtError, setAlbumArtError] = useState(false);
  const [showSpectrum, setShowSpectrum] = useState(false);
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [isDraggingCrossfade, setIsDraggingCrossfade] = useState(false);

  const volumeRef = useRef<HTMLDivElement>(null);
  const crossfadeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAlbumArtError(false);
  }, [state.track?.id, state.mashup?.track1?.id]);

  // Volume drag handlers
  useEffect(() => {
    if (!isDraggingVolume) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!volumeRef.current) return;
      const rect = volumeRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      setVolume(percentage);
    };

    const handleMouseUp = () => {
      setIsDraggingVolume(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingVolume, setVolume]);

  // Crossfade drag handlers
  useEffect(() => {
    if (!isDraggingCrossfade) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!crossfadeRef.current) return;
      const rect = crossfadeRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      setCrossfade(percentage);
    };

    const handleMouseUp = () => {
      setIsDraggingCrossfade(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingCrossfade, setCrossfade]);

  if (!state.track && !state.mashup) {
    return null;
  }

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const canSeek = state.engine === 'none' || state.mode === 'single';

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canSeek || !duration || duration <= 0) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;
    
    skip(newTime - currentTime);
  };

  const handleSkipBackward = () => {
    skip(-10);
  };

  const handleSkipForward = () => {
    skip(10);
  };

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeRef.current) return;
    const rect = volumeRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    setVolume(percentage);
  };

  const handleCrossfadeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!crossfadeRef.current) return;
    const rect = crossfadeRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    setCrossfade(percentage);
  };

  return (
    <>
      {showSpectrum && (state.track || state.mashup) && (
        <div className="fixed bottom-20 left-0 right-0 z-40">
          <div className="max-w-screen-2xl mx-auto px-4">
            <SpectrumAnalyzer
              audioElement={null}
              isPlaying={state.isPlaying}
              mode="spectrum"
              height={100}
              showControls={true}
            />
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-[#181818] border-t border-[#282828] z-50">
        <div className="max-w-screen-2xl mx-auto px-4 py-3">
          <div className="grid grid-cols-[1fr_2fr_1fr] gap-4 items-center">
            
            {/* LEFT: Track Info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-14 h-14 bg-[#282828] rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                {state.mode === 'single' && state.track?.metadata?.albumArt && !albumArtError ? (
                  <img 
                    src={state.track.metadata.albumArt} 
                    alt={state.track.metadata.title || state.track.name}
                    className="w-full h-full object-cover"
                    onError={() => setAlbumArtError(true)}
                  />
                ) : state.mode === 'dual' && state.mashup?.track1?.metadata?.albumArt && !albumArtError ? (
                  <img 
                    src={state.mashup.track1.metadata.albumArt} 
                    alt="Mashup"
                    className="w-full h-full object-cover"
                    onError={() => setAlbumArtError(true)}
                  />
                ) : state.mode === 'single' ? (
                  <Music2 className="text-[#b3b3b3]" size={24} />
                ) : (
                  <Disc3 className="text-[#b3b3b3] animate-spin-slow" size={24} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                {state.mode === 'single' && state.track && (
                  <>
                    <h4 className="text-white text-sm font-normal truncate hover:underline cursor-pointer">
                      {state.track.metadata?.title || state.track.name}
                    </h4>
                    <p className="text-[#b3b3b3] text-xs truncate hover:underline hover:text-white cursor-pointer">
                      {state.track.metadata?.artist || formatBPM(state.track.bpm, preferences.bpmMode)}
                    </p>
                  </>
                )}

                {state.mode === 'dual' && state.mashup && (
                  <>
                    <h4 className="text-white text-sm font-normal truncate">
                      Mashup Preview
                    </h4>
                    <p className="text-[#b3b3b3] text-xs truncate">
                      {state.mashup.track1.metadata?.artist || state.mashup.track1.name}
                      {' × '}
                      {state.mashup.track2.metadata?.artist || state.mashup.track2.name}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* CENTER: Player Controls */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-4">
                {/* Skip Back 10s */}
                <button
                  onClick={handleSkipBackward}
                  className={`
                    transition-colors
                    ${canSeek && currentTime >= 1
                      ? 'text-[#b3b3b3] hover:text-white cursor-pointer' 
                      : 'text-[#4d4d4d] cursor-not-allowed'
                    }
                  `}
                  disabled={!canSeek || currentTime < 1}
                  title={canSeek ? "Skip back 10 seconds" : "Seeking disabled (time-stretch engine)"}
                >
                  <RotateCcw size={20} />
                </button>

                <button
                  className="text-[#b3b3b3] hover:text-white transition-colors opacity-40 cursor-not-allowed"
                  disabled
                  title="Previous (not implemented)"
                >
                  <SkipBack size={18} fill="currentColor" />
                </button>

                <button
                  onClick={togglePlayPause}
                  className="w-8 h-8 bg-white hover:scale-105 rounded-full flex items-center justify-center transition-transform"
                  title={state.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                >
                  {state.isPlaying ? (
                    <Pause className="text-black" size={18} fill="currentColor" />
                  ) : (
                    <Play className="text-black ml-0.5" size={18} fill="currentColor" />
                  )}
                </button>

                <button
                  className="text-[#b3b3b3] hover:text-white transition-colors opacity-40 cursor-not-allowed"
                  disabled
                  title="Next (not implemented)"
                >
                  <SkipForward size={18} fill="currentColor" />
                </button>

                {/* Skip Forward 10s */}
                <button
                  onClick={handleSkipForward}
                  className={`
                    transition-colors
                    ${canSeek && currentTime < duration - 1
                      ? 'text-[#b3b3b3] hover:text-white cursor-pointer' 
                      : 'text-[#4d4d4d] cursor-not-allowed'
                    }
                  `}
                  disabled={!canSeek || currentTime >= duration - 1}
                  title={canSeek ? "Skip forward 10 seconds" : "Seeking disabled (time-stretch engine)"}
                >
                  <RotateCw size={20} />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#a7a7a7] font-normal min-w-[40px] text-right">
                  {formatTime(currentTime)}
                </span>

                <div
                  className="flex-1 h-3 flex items-center group"
                  onMouseEnter={() => setIsHoveringProgress(true)}
                  onMouseLeave={() => setIsHoveringProgress(false)}
                  onClick={handleSeek}
                >
                  <div className={`
                    relative w-full rounded-full overflow-hidden
                    ${isHoveringProgress ? 'h-1.5' : 'h-1'}
                    ${canSeek ? 'cursor-pointer' : 'cursor-not-allowed'}
                    transition-all duration-100
                  `}>
                    <div className={`
                      absolute inset-0 rounded-full
                      ${canSeek ? 'bg-[#4d4d4d]' : 'bg-gradient-to-r from-[#4d4d4d] to-[#3d3d3d]'}
                    `}>
                      {!canSeek && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer-slow" />
                      )}
                    </div>

                    <div
                      className={`
                        absolute inset-y-0 left-0 rounded-full
                        ${canSeek 
                          ? 'bg-white group-hover:bg-[#1db954]' 
                          : 'bg-[#b3b3b3]'
                        }
                        transition-colors duration-100
                      `}
                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    >
                      {canSeek && isHoveringProgress && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
                      )}
                    </div>
                  </div>
                </div>

                <span className="text-[11px] text-[#a7a7a7] font-normal min-w-[40px]">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Engine Info */}
              {state.mode === 'dual' && timeStretchInfo && (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[10px] text-[#737373]">
                    {timeStretchInfo.engine === 'soundtouch' ? '🎯 SoundTouch' :
                     timeStretchInfo.engine === 'tone' ? '🎹 Tone.js' :
                     '⚡ Simple'}
                  </span>
                  {timeStretchInfo.targetBPM > 0 && (
                    <>
                      <span className="text-[10px] text-[#535353]">•</span>
                      <span className="text-[10px] text-[#737373]">
                        {timeStretchInfo.targetBPM.toFixed(1)} BPM
                      </span>
                    </>
                  )}
                  {!canSeek && (
                    <>
                      <span className="text-[10px] text-[#535353]">•</span>
                      <span className="text-[10px] text-[#b8860b]">Seeking disabled</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: Volume & Controls */}
            <div className="flex items-center justify-end gap-2">
              {/* Crossfader (dual mode only) */}
              {state.mode === 'dual' && (
                <div className="flex items-center gap-2 mr-2">
                  <span className="text-[10px] text-[#1db954] font-semibold">1</span>
                  <div
                    ref={crossfadeRef}
                    className="w-20 h-3 flex items-center cursor-pointer group"
                    onClick={handleCrossfadeClick}
                    onMouseDown={() => setIsDraggingCrossfade(true)}
                  >
                    <div className="relative w-full h-1 bg-[#4d4d4d] rounded-full overflow-hidden group-hover:h-1.5 transition-all">
                      <div
                        className="h-full bg-[#1db954] transition-all"
                        style={{ width: `${crossfade * 100}%` }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ 
                          left: `${crossfade * 100}%`,
                          marginLeft: '-6px'
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-[#8b5cf6] font-semibold">2</span>
                </div>
              )}

              {/* Spectrum Toggle */}
              <button
                onClick={() => setShowSpectrum(!showSpectrum)}
                className={`p-2 rounded-full transition-colors ${
                  showSpectrum 
                    ? 'text-[#1db954] bg-[#282828]' 
                    : 'text-[#b3b3b3] hover:text-white hover:bg-[#282828]'
                }`}
                title="Toggle spectrum analyzer"
              >
                <Activity size={16} />
              </button>

              {/* Volume Control */}
              <div className="flex items-center gap-2 group">
                <button
                  onClick={() => setVolume(volume > 0 ? 0 : 0.7)}
                  className="text-[#b3b3b3] hover:text-white transition-colors"
                  title={volume === 0 ? 'Unmute' : 'Mute'}
                >
                  {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                
                {/* Volume Bar */}
                <div
                  ref={volumeRef}
                  className="w-24 h-3 flex items-center cursor-pointer"
                  onClick={handleVolumeClick}
                  onMouseDown={() => setIsDraggingVolume(true)}
                >
                  <div className="relative w-full h-1 bg-[#4d4d4d] rounded-full overflow-hidden group-hover:h-1.5 transition-all">
                    <div
                      className="h-full bg-white group-hover:bg-[#1db954] transition-colors"
                      style={{ width: `${volume * 100}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ 
                        left: `${volume * 100}%`,
                        marginLeft: '-6px'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Stop Button */}
              <button
                onClick={stop}
                className="p-2 text-[#b3b3b3] hover:text-white hover:bg-[#282828] rounded-full transition-colors"
                title="Stop playback"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin-slow {
            animation: spin-slow 3s linear infinite;
          }

          @keyframes shimmer-slow {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
          .animate-shimmer-slow {
            animation: shimmer-slow 4s ease-in-out infinite;
          }
        `}</style>
      </div>
    </>
  );
}