import { useMemo, useState } from 'react';
import { Track } from '../types/track';
import { keyToCamelot, getCompatibleCamelot, getCamelotColor, camelotToKey } from '../utils/camelotWheel';
import { Info } from 'lucide-react';

interface CamelotWheelProps {
  tracks: Track[];
  onKeySelect?: (key: string) => void;
  selectedKey?: string;
}

export function CamelotWheel({ tracks, onKeySelect, selectedKey }: CamelotWheelProps) {
  const [hoveredCamelot, setHoveredCamelot] = useState<string | null>(null);

  const wheelData = useMemo(() => {
    const analyzedTracks = tracks.filter(t => !t.isAnalyzing && !t.error && t.key);

    // Count tracks in each Camelot position
    const camelotCount = new Map<string, number>();
    analyzedTracks.forEach(t => {
      const camelot = keyToCamelot(t.key);
      if (camelot !== 'N/A') {
        camelotCount.set(camelot, (camelotCount.get(camelot) || 0) + 1);
      }
    });

    return camelotCount;
  }, [tracks]);

  const selectedCamelot = selectedKey ? keyToCamelot(selectedKey) : null;
  const compatibleCamelots = selectedCamelot ? getCompatibleCamelot(selectedCamelot) : [];

  const positions = useMemo(() => {
    const result: Array<{
      camelot: string;
      angle: number;
      x: number;
      y: number;
      isInner: boolean;
      count: number;
    }> = [];

    const centerX = 150;
    const centerY = 150;
    const outerRadius = 120;
    const innerRadius = 80;

    for (let i = 1; i <= 12; i++) {
      const angle = (i - 1) * 30 - 90; // Start at top (12 o'clock)
      const radians = (angle * Math.PI) / 180;

      // Outer wheel (B = Major)
      const outerX = centerX + outerRadius * Math.cos(radians);
      const outerY = centerY + outerRadius * Math.sin(radians);
      const outerCamelot = `${i}B`;

      result.push({
        camelot: outerCamelot,
        angle,
        x: outerX,
        y: outerY,
        isInner: false,
        count: wheelData.get(outerCamelot) || 0,
      });

      // Inner wheel (A = Minor)
      const innerX = centerX + innerRadius * Math.cos(radians);
      const innerY = centerY + innerRadius * Math.sin(radians);
      const innerCamelot = `${i}A`;

      result.push({
        camelot: innerCamelot,
        angle,
        x: innerX,
        y: innerY,
        isInner: true,
        count: wheelData.get(innerCamelot) || 0,
      });
    }

    return result;
  }, [wheelData]);

  const handleCamelotClick = (camelot: string) => {
    if (onKeySelect) {
      const key = camelotToKey(camelot);
      onKeySelect(key);
    }
  };

  const displayCamelot = hoveredCamelot || selectedCamelot;
  const displayKey = displayCamelot ? camelotToKey(displayCamelot) : null;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-purple-100 rounded-lg p-2">
          <Info className="text-purple-600" size={20} />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Camelot Wheel</h3>
      </div>

      <div className="flex flex-col items-center">
        <svg width="300" height="300" className="mb-4">
          {/* Outer circle */}
          <circle
            cx="150"
            cy="150"
            r="130"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2"
          />

          {/* Inner circle */}
          <circle
            cx="150"
            cy="150"
            r="90"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2"
          />

          {/* Center circle */}
          <circle
            cx="150"
            cy="150"
            r="50"
            fill="#f3f4f6"
            stroke="#d1d5db"
            strokeWidth="2"
          />

          {/* Camelot positions */}
          {positions.map((pos) => {
            const isCompatible = compatibleCamelots.includes(pos.camelot);
            const isSelected = pos.camelot === selectedCamelot;
            const isHovered = pos.camelot === hoveredCamelot;
            const hasCount = pos.count > 0;

            let fillColor = getCamelotColor(pos.camelot);
            let opacity = hasCount ? 1 : 0.2;

            if (selectedCamelot && !isCompatible && !isSelected) {
              opacity = 0.15;
            }

            if (isSelected) {
              opacity = 1;
            }

            return (
              <g key={pos.camelot}>
                {/* Circle marker */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isHovered ? 22 : isSelected ? 24 : 18}
                  fill={fillColor}
                  opacity={opacity}
                  stroke={isSelected ? '#000' : isCompatible ? '#4ade80' : 'none'}
                  strokeWidth={isSelected ? 3 : isCompatible ? 2 : 0}
                  className="cursor-pointer transition-all"
                  onClick={() => handleCamelotClick(pos.camelot)}
                  onMouseEnter={() => setHoveredCamelot(pos.camelot)}
                  onMouseLeave={() => setHoveredCamelot(null)}
                />

                {/* Camelot label */}
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  className="text-xs font-bold fill-white pointer-events-none select-none"
                  style={{ fontSize: '11px' }}
                >
                  {pos.camelot}
                </text>

                {/* Track count badge */}
                {pos.count > 0 && (
                  <text
                    x={pos.x}
                    y={pos.y - 25}
                    textAnchor="middle"
                    className="text-xs font-bold fill-gray-700 pointer-events-none"
                    style={{ fontSize: '10px' }}
                  >
                    {pos.count}
                  </text>
                )}
              </g>
            );
          })}

          {/* Center label */}
          <text
            x="150"
            y="145"
            textAnchor="middle"
            className="text-sm font-bold fill-gray-600"
          >
            {displayCamelot || 'Camelot'}
          </text>
          <text
            x="150"
            y="160"
            textAnchor="middle"
            className="text-xs fill-gray-500"
          >
            {displayKey || 'Wheel'}
          </text>
        </svg>

        {/* Legend */}
        <div className="text-center space-y-1">
          <p className="text-xs text-gray-600">
            <span className="font-semibold">Inner Ring (A)</span> = Minor Keys
          </p>
          <p className="text-xs text-gray-600">
            <span className="font-semibold">Outer Ring (B)</span> = Major Keys
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Click a key to see compatible matches
          </p>
          {selectedCamelot && (
            <div className="mt-3 p-2 bg-green-50 rounded-lg">
              <p className="text-xs text-green-700 font-medium">
                Compatible with: {compatibleCamelots.filter(c => c !== selectedCamelot).join(', ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}