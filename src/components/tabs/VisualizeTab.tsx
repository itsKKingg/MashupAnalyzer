import { TrendingUp } from 'lucide-react';
import { Track, MashupCandidate, BPMRange } from '../../types/track';
import { LibraryStats } from '../LibraryStats';
import { BPMDistribution } from '../BPMDistribution';
import { CamelotWheel } from '../CamelotWheel';
import { CompatibilityMatrix } from '../CompatibilityMatrix';

interface VisualizeTabProps {
  tracks: Track[];
  mashups: MashupCandidate[];
  bpmRange: BPMRange;
  onBpmRangeClick: (min: number, max: number) => void;
  selectedKey?: string;
  onKeySelect: (key: string) => void;
  onMashupClick: (mashup: MashupCandidate) => void;
}

export function VisualizeTab({
  tracks,
  mashups,
  bpmRange,
  onBpmRangeClick,
  selectedKey,
  onKeySelect,
  onMashupClick,
}: VisualizeTabProps) {
  const analyzedTracks = tracks.filter(t => !t.isAnalyzing && !t.error);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
          <TrendingUp className="text-white" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Visual Analytics</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Explore your library through interactive visualizations
          </p>
        </div>
      </div>

      {analyzedTracks.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <TrendingUp className="mx-auto mb-4 text-gray-300 dark:text-gray-600" size={64} />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No Data Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Upload tracks to see visual analytics
          </p>
        </div>
      ) : (
        <>
          {/* Library Statistics */}
          <LibraryStats tracks={tracks} mashups={mashups} />

          {/* Charts Grid */}
          {analyzedTracks.length >= 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* BPM Distribution */}
              <BPMDistribution
                tracks={tracks}
                currentBPMRange={bpmRange}
                onBPMRangeClick={onBpmRangeClick}
              />

              {/* Camelot Wheel */}
              <CamelotWheel
                tracks={tracks}
                onKeySelect={onKeySelect}
                selectedKey={selectedKey}
              />
            </div>
          )}

          {/* Compatibility Matrix */}
          {mashups.length > 0 && (
            <CompatibilityMatrix
              tracks={tracks}
              mashups={mashups}
              onMashupClick={onMashupClick}
            />
          )}
        </>
      )}
    </div>
  );
}