// src/components/LibraryStats.tsx
// ✅ FIXED: Recursion bug by using stable primitive dependencies

import { useMemo } from 'react';
import { Music2, Activity, Award, Layers } from 'lucide-react';
import { Track, MashupCandidate } from '../types/track';
import { keyToCamelot } from '../utils/camelotWheel';

interface LibraryStatsProps {
  tracks: Track[];
  mashups: MashupCandidate[];
}

export function LibraryStats({ tracks, mashups }: LibraryStatsProps) {
  // ✅ FIX: Extract stable primitive values BEFORE useMemo to prevent recursion
  const tracksLength = Array.isArray(tracks) ? tracks.length : 0;
  const mashupsLength = Array.isArray(mashups) ? mashups.length : 0;

  const stats = useMemo(() => {
    try {
      // Defensive: ensure we have valid arrays
      if (!Array.isArray(tracks) || !Array.isArray(mashups)) {
        console.warn('LibraryStats received invalid props:', { tracks, mashups });
        return null;
      }

      // Filter and validate tracks
      const analyzedTracks = tracks.filter(
        (t) => t && 
               typeof t === 'object' && 
               !t.isAnalyzing && 
               !t.error && 
               typeof t.bpm === 'number' && 
               t.bpm > 0 &&
               t.key
      );

      if (analyzedTracks.length === 0) {
        return null;
      }

      // Calculate average BPM
      const avgBPM = Math.round(
        analyzedTracks.reduce((sum, t) => sum + t.bpm, 0) / analyzedTracks.length
      );

      // Find most common key
      const keyCount = new Map<string, number>();
      analyzedTracks.forEach((t) => {
        if (t.key && typeof t.key === 'string') {
          const count = keyCount.get(t.key) || 0;
          keyCount.set(t.key, count + 1);
        }
      });

      let mostCommonKey = 'N/A';
      let maxKeyCount = 0;
      keyCount.forEach((count, key) => {
        if (count > maxKeyCount) {
          maxKeyCount = count;
          mostCommonKey = key;
        }
      });

      // Safe Camelot conversion with fallback
      let mostCommonCamelot = 'N/A';
      try {
        if (mostCommonKey && mostCommonKey !== 'N/A' && mostCommonKey !== 'Unknown') {
          mostCommonCamelot = keyToCamelot(mostCommonKey);
        }
      } catch (error) {
        console.warn('Error converting key to Camelot:', mostCommonKey, error);
        mostCommonCamelot = 'Error';
      }

      // Find best mashup score (with validation)
      let bestScore = 0;
      if (Array.isArray(mashups) && mashups.length > 0) {
        const validScores = mashups
          .filter(m => m && typeof m.score === 'number' && !isNaN(m.score))
          .map(m => m.score);
        if (validScores.length > 0) {
          bestScore = Math.max(...validScores);
        }
      }

      // Calculate total possible combinations
      const totalCombos =
        analyzedTracks.length >= 2
          ? (analyzedTracks.length * (analyzedTracks.length - 1)) / 2
          : 0;

      // Calculate BPM range
      const bpms = analyzedTracks.map((t) => t.bpm);
      const minBPM = Math.min(...bpms);
      const maxBPM = Math.max(...bpms);

      // Count excellent mashups
      const excellentCount = Array.isArray(mashups)
        ? mashups.filter((m) => m && m.category === 'excellent').length
        : 0;

      return {
        totalTracks: analyzedTracks.length,
        avgBPM,
        mostCommonKey,
        mostCommonCamelot,
        bestScore,
        totalCombos,
        minBPM,
        maxBPM,
        excellentCount,
      };
    } catch (error) {
      console.error('Error calculating library stats:', error);
      return null;
    }
  }, [tracksLength, mashupsLength, tracks, mashups]); 
  // ✅ FIX: Depend on stable primitive lengths + full arrays for deep changes

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      icon: Music2,
      label: 'Total Tracks',
      value: stats.totalTracks.toString(),
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-700 dark:text-blue-300',
    },
    {
      icon: Activity,
      label: 'Average BPM',
      value: stats.avgBPM.toString(),
      subValue: `Range: ${stats.minBPM}-${stats.maxBPM}`,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-700 dark:text-green-300',
    },
    {
      icon: Award,
      label: 'Most Common Key',
      value: stats.mostCommonKey,
      subValue: stats.mostCommonCamelot !== 'N/A' ? `Camelot: ${stats.mostCommonCamelot}` : undefined,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-700 dark:text-purple-300',
    },
    {
      icon: Layers,
      label: 'Mashup Stats',
      value: `${stats.excellentCount} Excellent`,
      subValue: `${stats.totalCombos} total combinations`,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      textColor: 'text-orange-700 dark:text-orange-300',
    },
  ];

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Activity size={24} className="text-gray-700 dark:text-gray-300" />
        Library Analytics
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`${card.bgColor} rounded-lg p-2.5`}>
                <card.icon className={card.textColor} size={24} />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
              <p
                className={`text-2xl font-bold bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}
              >
                {card.value}
              </p>
              {card.subValue && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{card.subValue}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {stats.bestScore > 0 && (
        <div className="mt-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Best Compatibility Score</p>
              <p className="text-3xl font-bold">{(stats.bestScore * 100).toFixed(0)}</p>
            </div>
            <Award size={48} className="opacity-50" />
          </div>
        </div>
      )}
    </div>
  );
}