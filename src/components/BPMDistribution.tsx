import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Track } from '../types/track';
import { Activity } from 'lucide-react';

interface BPMDistributionProps {
  tracks: Track[];
  currentBPMRange?: { min: number; max: number };
  onBPMRangeClick?: (min: number, max: number) => void;
}

export function BPMDistribution({ tracks, currentBPMRange, onBPMRangeClick }: BPMDistributionProps) {
  const chartData = useMemo(() => {
    const analyzedTracks = tracks.filter(t => !t.isAnalyzing && !t.error && t.bpm > 0);

    if (analyzedTracks.length === 0) return [];

    // Define BPM ranges
    const ranges = [
      { min: 60, max: 80, label: '60-80' },
      { min: 80, max: 100, label: '80-100' },
      { min: 100, max: 120, label: '100-120' },
      { min: 120, max: 140, label: '120-140' },
      { min: 140, max: 160, label: '140-160' },
      { min: 160, max: 180, label: '160-180' },
      { min: 180, max: 200, label: '180+' },
    ];

    // Count tracks in each range
    return ranges.map(range => {
      const count = analyzedTracks.filter(t => {
        if (range.max === 200) {
          return t.bpm >= range.min;
        }
        return t.bpm >= range.min && t.bpm < range.max;
      }).length;

      return {
        range: range.label,
        count,
        min: range.min,
        max: range.max,
      };
    }).filter(item => item.count > 0); // Only show ranges with tracks
  }, [tracks]);

  if (chartData.length === 0) {
    return null;
  }

  const handleBarClick = (data: any) => {
    if (onBPMRangeClick) {
      onBPMRangeClick(data.min, data.max);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="text-blue-600" size={20} />
        <h3 className="text-lg font-bold text-gray-900">BPM Distribution</h3>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="range" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
            }}
            formatter={(value: number) => [`${value} track${value !== 1 ? 's' : ''}`, 'Count']}
          />
          <Bar 
            dataKey="count" 
            fill="#3b82f6"
            radius={[8, 8, 0, 0]}
            onClick={handleBarClick}
            cursor="pointer"
          >
            {chartData.map((entry, index) => {
              const isInRange = currentBPMRange 
                ? entry.min >= currentBPMRange.min && entry.max <= currentBPMRange.max
                : false;
              
              return (
                <Cell 
                  key={`cell-${index}`} 
                  fill={isInRange ? '#10b981' : '#3b82f6'}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-xs text-gray-500 text-center mt-4">
        Click on a bar to filter tracks by that BPM range
      </p>
    </div>
  );
}