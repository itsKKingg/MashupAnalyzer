import { useMemo, useState } from 'react';
import { Track, MashupCandidate } from '../types/track';
import { Grid3x3 } from 'lucide-react';

interface CompatibilityMatrixProps {
  tracks: Track[];
  mashups: MashupCandidate[];
  onMashupClick?: (mashup: MashupCandidate) => void;
}

export function CompatibilityMatrix({ tracks, mashups, onMashupClick }: CompatibilityMatrixProps) {
  const [hoveredCell, setHoveredCell] = useState<{ track1: string; track2: string } | null>(null);

  const { analyzedTracks, matrixData } = useMemo(() => {
    const analyzed = tracks.filter(t => !t.isAnalyzing && !t.error && t.bpm > 0);

    // Limit to 15 tracks for readability
    const limitedTracks = analyzed.slice(0, 15);

    // Build compatibility matrix
    const matrix = new Map<string, MashupCandidate>();

    mashups.forEach(mashup => {
      const key = `${mashup.track1.id}-${mashup.track2.id}`;
      matrix.set(key, mashup);
    });

    return {
      analyzedTracks: limitedTracks,
      matrixData: matrix,
    };
  }, [tracks, mashups]);

  if (analyzedTracks.length < 2) {
    return null;
  }

  const getCellColor = (category: string) => {
    switch (category) {
      case 'excellent':
        return 'bg-green-500';
      case 'good':
        return 'bg-blue-500';
      case 'fair':
        return 'bg-yellow-500';
      case 'poor':
        return 'bg-gray-400';
      default:
        return 'bg-gray-200';
    }
  };

  const getCellOpacity = (category: string) => {
    switch (category) {
      case 'excellent':
        return 'opacity-100';
      case 'good':
        return 'opacity-80';
      case 'fair':
        return 'opacity-60';
      case 'poor':
        return 'opacity-40';
      default:
        return 'opacity-20';
    }
  };

  const getMashup = (track1Id: string, track2Id: string): MashupCandidate | null => {
    const key1 = `${track1Id}-${track2Id}`;
    const key2 = `${track2Id}-${track1Id}`;
    return matrixData.get(key1) || matrixData.get(key2) || null;
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Grid3x3 className="text-orange-600" size={20} />
        <h3 className="text-lg font-bold text-gray-900">Compatibility Matrix</h3>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="p-2 border border-gray-200 bg-gray-50 sticky left-0 z-10">
                  <span className="text-xs text-gray-500">Track</span>
                </th>
                {analyzedTracks.map((track) => (
                  <th
                    key={track.id}
                    className="p-2 border border-gray-200 bg-gray-50 min-w-[100px]"
                  >
                    <div className="text-xs font-medium text-gray-700 truncate max-w-[100px]" title={track.name}>
                      {track.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {track.bpm} BPM • {track.key}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analyzedTracks.map((track1, rowIndex) => (
                <tr key={track1.id}>
                  <td className="p-2 border border-gray-200 bg-gray-50 sticky left-0 z-10">
                    <div className="text-xs font-medium text-gray-700 truncate max-w-[120px]" title={track1.name}>
                      {track1.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {track1.bpm} BPM • {track1.key}
                    </div>
                  </td>
                  {analyzedTracks.map((track2, colIndex) => {
                    if (rowIndex === colIndex) {
                      return (
                        <td key={track2.id} className="p-2 border border-gray-200 bg-gray-100">
                          <div className="w-full h-12 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">—</span>
                          </div>
                        </td>
                      );
                    }

                    if (rowIndex > colIndex) {
                      return (
                        <td key={track2.id} className="p-2 border border-gray-200 bg-gray-50">
                          <div className="w-full h-12"></div>
                        </td>
                      );
                    }

                    const mashup = getMashup(track1.id, track2.id);

                    if (!mashup) {
                      return (
                        <td key={track2.id} className="p-2 border border-gray-200">
                          <div className="w-full h-12 bg-gray-100"></div>
                        </td>
                      );
                    }

                    const isHovered = hoveredCell?.track1 === track1.id && hoveredCell?.track2 === track2.id;

                    return (
                      <td
                        key={track2.id}
                        className="p-2 border border-gray-200 cursor-pointer hover:bg-gray-50"
                        onClick={() => onMashupClick?.(mashup)}
                        onMouseEnter={() => setHoveredCell({ track1: track1.id, track2: track2.id })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <div
                          className={`
                            w-full h-12 rounded flex flex-col items-center justify-center
                            ${getCellColor(mashup.category)} ${getCellOpacity(mashup.category)}
                            transition-all ${isHovered ? 'scale-110 shadow-lg' : ''}
                          `}
                        >
                          <span className="text-white font-bold text-sm">{mashup.score}</span>
                          <span className="text-white text-xs opacity-90">{mashup.category}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {analyzedTracks.length > 15 && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          Showing first 15 tracks. Upload fewer tracks for full matrix view.
        </p>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-xs text-gray-600">Excellent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-xs text-gray-600">Good</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span className="text-xs text-gray-600">Fair</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-400 rounded"></div>
          <span className="text-xs text-gray-600">Poor</span>
        </div>
      </div>

      <p className="text-xs text-gray-500 text-center mt-3">
        Click a cell to jump to that mashup
      </p>
    </div>
  );
}