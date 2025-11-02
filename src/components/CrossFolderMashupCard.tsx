import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { CrossFolderMashup } from '../types/track';
import { useAudio } from '../contexts/AudioContext';

interface CrossFolderMashupCardProps {
  mashup: CrossFolderMashup;
  rank: number;
}

export function CrossFolderMashupCard({ mashup, rank }: CrossFolderMashupCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume1, setVolume1] = useState(0.7);
  const [volume2, setVolume2] = useState(0.7);
  const audio1Ref = useRef<HTMLAudioElement>(null);
  const audio2Ref = useRef<HTMLAudioElement>(null);
  const { currentlyPlayingId, setCurrentlyPlaying } = useAudio();

  const mashupId = `crossfolder-${mashup.track1.id}-${mashup.track2.id}`;

  useEffect(() => {
    if (currentlyPlayingId !== mashupId && isPlaying) {
      if (audio1Ref.current) audio1Ref.current.pause();
      if (audio2Ref.current) audio2Ref.current.pause();
      setIsPlaying(false);
    }
  }, [currentlyPlayingId, mashupId, isPlaying]);

  useEffect(() => {
    if (audio1Ref.current) audio1Ref.current.volume = volume1;
    if (audio2Ref.current) audio2Ref.current.volume = volume2;
  }, [volume1, volume2]);

  useEffect(() => {
    return () => {
      if (audio1Ref.current) audio1Ref.current.pause();
      if (audio2Ref.current) audio2Ref.current.pause();
    };
  }, []);

  const togglePlayback = () => {
    if (!audio1Ref.current || !audio2Ref.current) return;

    if (isPlaying) {
      audio1Ref.current.pause();
      audio2Ref.current.pause();
      setCurrentlyPlaying(null);
      setIsPlaying(false);
    } else {
      audio1Ref.current.currentTime = 0;
      audio2Ref.current.currentTime = 0;
      setCurrentlyPlaying(mashupId);
      audio1Ref.current.play();
      audio2Ref.current.play();
      setIsPlaying(true);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'excellent':
        return 'from-green-500 to-emerald-600';
      case 'good':
        return 'from-blue-500 to-blue-600';
      case 'fair':
        return 'from-yellow-500 to-orange-500';
      case 'poor':
        return 'from-gray-400 to-gray-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'excellent':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'good':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'fair':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'poor':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-300 dark:text-gray-600">#{rank}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryBadgeColor(mashup.category)}`}>
              {mashup.category.toUpperCase()}
            </span>
          </div>

          <div className={`bg-gradient-to-r ${getCategoryColor(mashup.category)} text-white rounded-lg px-4 py-2`}>
            <div className="text-xs font-medium opacity-90">Score</div>
            <div className="text-2xl font-bold">{mashup.score}</div>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {/* Track 1 with Folder Badge */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border-l-4" style={{ borderLeftColor: mashup.folder1.color }}>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2 py-0.5 rounded text-xs font-semibold"
                style={{ backgroundColor: `${mashup.folder1.color}20`, color: mashup.folder1.color }}
              >
                {mashup.folder1.name}
              </span>
            </div>
            <div className="font-semibold text-gray-900 dark:text-white truncate">{mashup.track1.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {mashup.track1.bpm} BPM • {mashup.track1.key}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Volume2 size={14} className="text-gray-500" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume1}
                onChange={(e) => setVolume1(Number(e.target.value))}
                aria-label={`Volume for ${mashup.track1.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(volume1 * 100)}
                className="flex-1 h-1 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: mashup.folder1.color }}
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[35px]">
                {Math.round(volume1 * 100)}%
              </span>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-full px-4 py-1.5 text-xs font-semibold">
              {mashup.reason}
            </div>
          </div>

          {/* Track 2 with Folder Badge */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border-l-4" style={{ borderLeftColor: mashup.folder2.color }}>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2 py-0.5 rounded text-xs font-semibold"
                style={{ backgroundColor: `${mashup.folder2.color}20`, color: mashup.folder2.color }}
              >
                {mashup.folder2.name}
              </span>
            </div>
            <div className="font-semibold text-gray-900 dark:text-white truncate">{mashup.track2.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {mashup.track2.bpm} BPM • {mashup.track2.key}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Volume2 size={14} className="text-gray-500" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume2}
                onChange={(e) => setVolume2(Number(e.target.value))}
                aria-label={`Volume for ${mashup.track2.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(volume2 * 100)}
                className="flex-1 h-1 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: mashup.folder2.color }}
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[35px]">
                {Math.round(volume2 * 100)}%
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={togglePlayback}
          aria-label={isPlaying ? 'Stop mashup preview' : 'Preview mashup'}
          aria-pressed={isPlaying}
          className={`
            w-full bg-gradient-to-r ${getCategoryColor(mashup.category)} hover:opacity-90 
            text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2
          `}
        >
          {isPlaying ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
          {isPlaying ? 'Stop Preview' : 'Preview Mashup'}
        </button>

        <audio
          ref={audio1Ref}
          src={mashup.track1.audioUrl}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentlyPlaying(null);
          }}
        />
        <audio
          ref={audio2Ref}
          src={mashup.track2.audioUrl}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentlyPlaying(null);
          }}
        />
      </div>
    </div>
  );
}