import { useState } from 'react';
import { Library, Search, X } from 'lucide-react';  // ← ADDED X
import { Track } from '../../types/track';
import { VirtualTrackList } from '../VirtualTrackList';
import { FilterBar } from '../FilterBar';
import { SortOption, FilterOption, BPMRange } from '../../types/track';

interface AnalyzeTabProps {
  tracks: Track[];
  onRemove: (id: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  filterKey: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
  bpmRange: BPMRange;
  onBpmRangeChange: (range: BPMRange) => void;
  trackBPMRange: BPMRange;
  availableKeys: string[];
  filteredTracks: Track[];
}

export function AnalyzeTab({
  tracks,
  onRemove,
  sortBy,
  onSortChange,
  filterKey,
  onFilterChange,
  bpmRange,
  onBpmRangeChange,
  trackBPMRange,
  availableKeys,
  filteredTracks,
}: AnalyzeTabProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const analyzedTracks = tracks.filter(t => !t.isAnalyzing && !t.error);

  // Apply search filter
  const searchedTracks = filteredTracks.filter(track => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return track.name.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Library className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Track Library</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {analyzedTracks.length} track{analyzedTracks.length !== 1 ? 's' : ''} analyzed
            </p>
          </div>
        </div>
      </div>

      {analyzedTracks.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Library className="mx-auto mb-4 text-gray-300 dark:text-gray-600" size={64} />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No Tracks Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Go to the Prepare tab to upload audio files
          </p>
        </div>
      ) : (
        <>
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search tracks by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Filters */}
          {analyzedTracks.length > 1 && (
            <FilterBar
              sortBy={sortBy}
              onSortChange={onSortChange}
              filterKey={filterKey}
              onFilterChange={onFilterChange}
              availableKeys={availableKeys}
              bpmRange={bpmRange}
              onBpmRangeChange={onBpmRangeChange}
              trackBPMRange={trackBPMRange}
            />
          )}

          {/* Track List - UPDATED to use VirtualTrackList */}
          {searchedTracks.length > 0 ? (
            <>
              {/* Performance notice for large lists */}
              {searchedTracks.length > 100 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    ⚡ Showing {searchedTracks.length} tracks with virtual scrolling for optimal performance
                  </p>
                </div>
              )}
              
              <VirtualTrackList
                tracks={searchedTracks}
                onRemove={onRemove}
              />
            </>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <Search className="mx-auto mb-4 text-gray-300 dark:text-gray-600" size={48} />
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No tracks found matching "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* Results Count */}
          {searchQuery && searchedTracks.length > 0 && (
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {searchedTracks.length} of {filteredTracks.length} tracks
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}