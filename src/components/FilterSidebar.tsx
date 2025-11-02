// src/components/FilterSidebar.tsx
// ✅ UPDATED: Added Cross-Folder Filtering Controls

import { Search, Sliders, FolderOpen, CheckSquare, Square, Zap, Filter, Shuffle } from 'lucide-react';
import { MashupCategoryFilter, BPMRange, BPMTolerance, SortOption } from '../types/track';

interface FilterSidebarProps {
  // Quality filter
  qualityFilter: MashupCategoryFilter;
  onQualityChange: (quality: MashupCategoryFilter) => void;
  qualityCounts: {
    excellent: number;
    good: number;
    fair: number;
    all: number;
  };
  
  // Folder filter
  folders: string[];
  selectedFolders: string[];
  onFoldersChange: (folders: string[]) => void;
  
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  
  // BPM range
  bpmRange: BPMRange;
  trackBPMRange: BPMRange;
  onBPMRangeChange: (range: BPMRange) => void;
  
  // Key filter
  selectedKey: string;
  availableKeys: string[];
  onKeyChange: (key: string) => void;

  // BPM Tolerance
  bpmTolerance?: BPMTolerance;
  onBPMToleranceChange?: (tolerance: BPMTolerance) => void;

  // Mix-Ready Quick Filter
  showMixReadyOnly?: boolean;
  onMixReadyToggle?: (enabled: boolean) => void;

  // Sort Options
  sortBy?: SortOption;
  onSortChange?: (sort: SortOption) => void;

  // ✅ NEW: Cross-Folder Filtering
  crossFolderOnly?: boolean;
  onCrossFolderOnlyChange?: (enabled: boolean) => void;
  selectedFolder1?: string | null;
  selectedFolder2?: string | null;
  onFolder1Change?: (folder: string | null) => void;
  onFolder2Change?: (folder: string | null) => void;
}

export function FilterSidebar({
  qualityFilter,
  onQualityChange,
  qualityCounts,
  folders,
  selectedFolders,
  onFoldersChange,
  searchQuery,
  onSearchChange,
  bpmRange,
  trackBPMRange,
  onBPMRangeChange,
  selectedKey,
  availableKeys,
  onKeyChange,
  bpmTolerance = 'normal',
  onBPMToleranceChange,
  showMixReadyOnly = false,
  onMixReadyToggle,
  sortBy = 'perfect-match',
  onSortChange,
  crossFolderOnly = false,
  onCrossFolderOnlyChange,
  selectedFolder1 = null,
  selectedFolder2 = null,
  onFolder1Change,
  onFolder2Change,
}: FilterSidebarProps) {
  
  const toggleFolder = (folder: string) => {
    if (selectedFolders.includes(folder)) {
      onFoldersChange(selectedFolders.filter(f => f !== folder));
    } else {
      onFoldersChange([...selectedFolders, folder]);
    }
  };

  const selectAllFolders = () => {
    onFoldersChange(folders);
  };

  const clearAllFolders = () => {
    onFoldersChange([]);
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sliders size={20} className="text-gray-600 dark:text-gray-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
      </div>

      {/* Mix-Ready Quick Filter */}
      {onMixReadyToggle && (
        <div>
          <button
            onClick={() => onMixReadyToggle(!showMixReadyOnly)}
            aria-label={showMixReadyOnly ? 'Show all mashups' : 'Show mix-ready mashups only'}
            aria-pressed={showMixReadyOnly}
            className={`
              w-full px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-md
              ${showMixReadyOnly
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
          >
            <Zap size={18} />
            <span>{showMixReadyOnly ? '✓ Mix-Ready Only' : 'Show Mix-Ready'}</span>
          </button>
          {showMixReadyOnly && (
            <p className="mt-2 text-xs text-green-600 dark:text-green-400 text-center">
              Showing only easy-to-mix tracks (≤3 BPM diff, compatible keys, similar energy)
            </p>
          )}
        </div>
      )}

      {/* Sort Options */}
      {onSortChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Filter size={14} />
            Sort By
          </label>
          <div className="space-y-1">
            {[
              { value: 'perfect-match', label: '🎯 Perfect Match', desc: 'BPM + Key' },
              { value: 'bpm-first', label: '🥁 Rhythmic First', desc: 'BPM priority' },
              { value: 'key-first', label: '🎹 Harmonic First', desc: 'Key priority' },
              { value: 'score', label: '📊 Traditional Score', desc: 'Overall' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => onSortChange(option.value as SortOption)}
                aria-label={`Sort by ${option.label}`}
                aria-pressed={sortBy === option.value}
                className={`
                  w-full px-3 py-2 rounded-lg text-left transition-colors
                  ${sortBy === option.value
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium border-2 border-blue-300 dark:border-blue-700'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                  }
                `}
              >
                <div className="text-sm">{option.label}</div>
                <div className="text-xs opacity-70">{option.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quality Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quality
        </label>
        <div className="space-y-1">
          {([
            { key: 'excellent', label: 'Excellent', count: qualityCounts.excellent },
            { key: 'good', label: 'Good', count: qualityCounts.good },
            { key: 'fair', label: 'Fair', count: qualityCounts.fair },
            { key: 'all', label: 'All', count: qualityCounts.all },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => onQualityChange(key)}
              aria-label={`Filter ${label} mashups`}
              aria-pressed={qualityFilter === key}
              className={`
                w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                ${
                  qualityFilter === key
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <span>{label}</span>
              <span className="text-xs opacity-60">({count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Compare (Folders) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Compare
        </label>
        
        {folders.length === 0 ? (
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No folders detected. Upload folders (not individual files) to enable folder filtering.
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-2">
              <button
                onClick={selectAllFolders}
                className="flex-1 px-2 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                All
              </button>
              <button
                onClick={clearAllFolders}
                className="flex-1 px-2 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                None
              </button>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto">
              {folders.map((folder) => {
                const isSelected = selectedFolders.includes(folder);
                return (
                  <button
                    key={folder}
                    onClick={() => toggleFolder(folder)}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left
                      ${
                        isSelected
                          ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    {isSelected ? (
                      <CheckSquare size={16} className="flex-shrink-0 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <Square size={16} className="flex-shrink-0 text-gray-400" />
                    )}
                    <FolderOpen size={14} className="flex-shrink-0" />
                    <span className="truncate flex-1">{folder}</span>
                  </button>
                );
              })}
            </div>

            {selectedFolders.length > 0 && (
              <div className="mt-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded text-xs text-purple-700 dark:text-purple-300 font-medium">
                {selectedFolders.length === folders.length
                  ? '✓ All folders selected'
                  : `${selectedFolders.length} of ${folders.length} selected`}
              </div>
            )}
          </>
        )}
      </div>

      {/* ✅ NEW: Cross-Folder Filtering */}
      {folders.length >= 2 && onCrossFolderOnlyChange && onFolder1Change && onFolder2Change && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Shuffle size={14} />
            Cross-Folder Mix
          </label>

          {/* Cross-Folder Toggle */}
          <button
            onClick={() => onCrossFolderOnlyChange(!crossFolderOnly)}
            className={`
              w-full px-3 py-2.5 rounded-lg font-medium transition-all flex items-center justify-between mb-3
              ${crossFolderOnly
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
          >
            <span className="text-sm">
              {crossFolderOnly ? '✓ Cross-Folder Only' : 'Show All Combinations'}
            </span>
            <Shuffle size={16} />
          </button>

          {/* Folder Pair Selectors (only when cross-folder is enabled) */}
          {crossFolderOnly && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Folder A
                </label>
                <select
                  value={selectedFolder1 || ''}
                  onChange={(e) => onFolder1Change(e.target.value || null)}
                  className="w-full px-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Any folder</option>
                  {folders.map((folder) => (
                    <option key={folder} value={folder}>
                      {folder}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-center text-xs text-gray-500 dark:text-gray-400">×</div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Folder B
                </label>
                <select
                  value={selectedFolder2 || ''}
                  onChange={(e) => onFolder2Change(e.target.value || null)}
                  className="w-full px-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Any folder</option>
                  {folders.map((folder) => (
                    <option key={folder} value={folder}>
                      {folder}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-2 px-2 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded text-xs text-orange-700 dark:text-orange-300">
                {selectedFolder1 && selectedFolder2
                  ? `Showing: ${selectedFolder1} × ${selectedFolder2}`
                  : selectedFolder1
                  ? `${selectedFolder1} × any other folder`
                  : selectedFolder2
                  ? `Any folder × ${selectedFolder2}`
                  : 'Showing all cross-folder combinations'}
              </div>
            </div>
          )}

          {crossFolderOnly && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Only mashups mixing tracks from different folders
            </p>
          )}
        </div>
      )}

      {/* BPM Tolerance */}
      {onBPMToleranceChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            BPM Tolerance
          </label>
          <div className="space-y-1">
            {[
              { value: 'strict', label: 'Strict', desc: '±2 BPM' },
              { value: 'normal', label: 'Normal', desc: '±5 BPM' },
              { value: 'flexible', label: 'Flexible', desc: '±10 BPM' },
              { value: 'creative', label: 'Creative', desc: '±15 BPM' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => onBPMToleranceChange(option.value as BPMTolerance)}
                className={`
                  w-full px-3 py-2 rounded-lg text-left transition-colors text-sm
                  ${bpmTolerance === option.value
                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-xs opacity-70">{option.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Track name..."
            aria-label="Search tracks by name"
            aria-describedby="search-helper"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span id="search-helper" className="sr-only">Search for tracks in mashup combinations</span>
        </div>
      </div>

      {/* BPM Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          BPM Range
        </label>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>{bpmRange.min}</span>
            <span>{bpmRange.max}</span>
          </div>
          <input
            type="range"
            min={trackBPMRange.min}
            max={trackBPMRange.max}
            value={bpmRange.min}
            onChange={(e) => onBPMRangeChange({ ...bpmRange, min: Number(e.target.value) })}
            className="w-full accent-blue-600"
          />
          <input
            type="range"
            min={trackBPMRange.min}
            max={trackBPMRange.max}
            value={bpmRange.max}
            onChange={(e) => onBPMRangeChange({ ...bpmRange, max: Number(e.target.value) })}
            className="w-full accent-blue-600"
          />
        </div>
      </div>

      {/* Key Filter */}
      {availableKeys.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Key
          </label>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            <button
              onClick={() => onKeyChange('all')}
              className={`
                w-full px-3 py-2 rounded-lg text-sm transition-colors text-left
                ${
                  selectedKey === 'all'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              All Keys
            </button>
            {availableKeys.map((key) => (
              <button
                key={key}
                onClick={() => onKeyChange(key)}
                className={`
                  w-full px-3 py-2 rounded-lg text-sm transition-colors text-left
                  ${
                    selectedKey === key
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}