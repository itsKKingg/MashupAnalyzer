import { SortOption, FilterOption, BPMRange } from '../types/track';
import { Filter, SortAsc, Gauge } from 'lucide-react';
import { useEffect, useState } from 'react';

interface FilterBarProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  filterKey: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
  availableKeys: string[];
  bpmRange: BPMRange;
  onBpmRangeChange: (range: BPMRange) => void;
  trackBPMRange: BPMRange;
}

export function FilterBar({
  sortBy,
  onSortChange,
  filterKey,
  onFilterChange,
  availableKeys,
  bpmRange,
  onBpmRangeChange,
  trackBPMRange,
}: FilterBarProps) {
  const [localMin, setLocalMin] = useState(bpmRange.min);
  const [localMax, setLocalMax] = useState(bpmRange.max);

  useEffect(() => {
    setLocalMin(trackBPMRange.min);
    setLocalMax(trackBPMRange.max);
    onBpmRangeChange(trackBPMRange);
  }, [trackBPMRange.min, trackBPMRange.max]);

  const handleMinChange = (value: number) => {
    const newMin = Math.min(value, localMax - 1);
    setLocalMin(newMin);
    onBpmRangeChange({ min: newMin, max: localMax });
  };

  const handleMaxChange = (value: number) => {
    const newMax = Math.max(value, localMin + 1);
    setLocalMax(newMax);
    onBpmRangeChange({ min: localMin, max: newMax });
  };

  const resetBPMRange = () => {
    setLocalMin(trackBPMRange.min);
    setLocalMax(trackBPMRange.max);
    onBpmRangeChange(trackBPMRange);
  };

  const isBPMFiltered =
    localMin !== trackBPMRange.min || localMax !== trackBPMRange.max;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex flex-wrap gap-4">
        {/* Sort Dropdown */}
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <SortAsc className="text-gray-500 dark:text-gray-400" size={20} />
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              <option value="name">Name</option>
              <option value="bpm">BPM</option>
              <option value="key">Key</option>
              <option value="duration">Duration</option>
            </select>
          </div>
        </div>

        {/* Key Filter Dropdown */}
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <Filter className="text-gray-500 dark:text-gray-400" size={20} />
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Filter by Key
            </label>
            <select
              value={filterKey}
              onChange={(e) => onFilterChange(e.target.value as FilterOption)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              <option value="all">All Keys</option>
              {availableKeys.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* BPM Range Slider */}
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <Gauge className="text-gray-500 dark:text-gray-400" size={20} />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                BPM Range
              </label>
              {isBPMFiltered && (
                <button
                  onClick={resetBPMRange}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="range"
                  min={trackBPMRange.min}
                  max={trackBPMRange.max}
                  value={localMin}
                  onChange={(e) => handleMinChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-[60px] text-center">
                {localMin} - {localMax}
              </span>

              <div className="flex-1">
                <input
                  type="range"
                  min={trackBPMRange.min}
                  max={trackBPMRange.max}
                  value={localMax}
                  onChange={(e) => handleMaxChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}