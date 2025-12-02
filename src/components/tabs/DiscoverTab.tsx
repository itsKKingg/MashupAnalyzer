// src/components/tabs/DiscoverTab.tsx
// ✅ UPDATED: Sort Options + BPM Tolerance + Mix-Ready Filter + Duplicate Detection + Cross-Folder Filtering

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Sparkles, TrendingUp, Zap, Clock, Info, Loader, AlertTriangle } from 'lucide-react';
import { Track, MashupCandidate, MashupCategoryFilter, BPMRange, BPMTolerance, SortOption } from '../../types/track';
import { MashupCard } from '../MashupCard';
import { FilterSidebar } from '../FilterSidebar';
import { getMashupStats, filterMixReady, findDuplicates } from '../../utils/mashupOptimizer';
import { getUniqueFolders, filterCrossFolderMashups, filterByFolderPair } from '../../utils/folderUtils';

interface DiscoverTabProps {
  tracks: Track[];
  mashupCandidates: MashupCandidate[];
  onCalculateMashups: () => Promise<void>;
  bpmRange: BPMRange;
  onBPMRangeChange: (range: BPMRange) => void;
  trackBPMRange: BPMRange;
  bpmTolerance?: BPMTolerance;
  onBPMToleranceChange?: (tolerance: BPMTolerance) => void;
}

export function DiscoverTab({
  tracks = [],
  mashupCandidates = [],
  onCalculateMashups,
  bpmRange,
  onBPMRangeChange,
  trackBPMRange,
  bpmTolerance = 'normal',
  onBPMToleranceChange,
}: DiscoverTabProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationTime, setCalculationTime] = useState<number | null>(null);
  
  // ✅ FIXED: Filter states with localStorage persistence
  const STORAGE_KEY = 'discover-tab-filters';
  
  // Load saved filter state from localStorage
  const loadSavedFilters = (): {
    qualityFilter: MashupCategoryFilter;
    selectedFolders: string[];
    searchQuery: string;
    selectedKey: string;
    sortBy: SortOption;
    showMixReadyOnly: boolean;
    crossFolderOnly: boolean;
    selectedFolder1: string | null;
    selectedFolder2: string | null;
  } => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error);
    }
    return {
      qualityFilter: 'excellent',
      selectedFolders: [],
      searchQuery: '',
      selectedKey: 'all',
      sortBy: 'perfect-match',
      showMixReadyOnly: false,
      crossFolderOnly: false,
      selectedFolder1: null,
      selectedFolder2: null,
    };
  };

  const savedFilters = loadSavedFilters();
  
  const [qualityFilter, setQualityFilter] = useState<MashupCategoryFilter>(savedFilters.qualityFilter);
  const [selectedFolders, setSelectedFolders] = useState<string[]>(savedFilters.selectedFolders);
  const [searchQuery, setSearchQuery] = useState(savedFilters.searchQuery);
  const [selectedKey, setSelectedKey] = useState<string>(savedFilters.selectedKey);
  const [displayCount, setDisplayCount] = useState(10);

  // Sort and filter states
  const [sortBy, setSortBy] = useState<SortOption>(savedFilters.sortBy);
  const [showMixReadyOnly, setShowMixReadyOnly] = useState(savedFilters.showMixReadyOnly);

  // ✅ NEW: Cross-folder filtering states
  const [crossFolderOnly, setCrossFolderOnly] = useState(savedFilters.crossFolderOnly);
  const [selectedFolder1, setSelectedFolder1] = useState<string | null>(savedFilters.selectedFolder1);
  const [selectedFolder2, setSelectedFolder2] = useState<string | null>(savedFilters.selectedFolder2);

  // Filter to only analyzed tracks
  const analyzedTracks = useMemo(
    () => (tracks || []).filter((t) => t && !t.isAnalyzing && !t.error && t.bpm > 0 && t.key),
    [tracks]
  );

  // Get unique folders
  const folders = useMemo(() => getUniqueFolders(analyzedTracks), [analyzedTracks]);

  // ✅ FIXED: Auto-select all folders on mount when folders change (only if no saved state)
  useEffect(() => {
    if (folders.length > 0 && selectedFolders.length === 0 && !savedFilters.selectedFolders.length) {
      setSelectedFolders(folders);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders.length]); // Only depend on folders.length to avoid infinite loops

  // ✅ FIXED: Persist filter state to localStorage (debounced to prevent race conditions)
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        const filterState = {
          qualityFilter,
          selectedFolders,
          searchQuery,
          selectedKey,
          sortBy,
          showMixReadyOnly,
          crossFolderOnly,
          selectedFolder1,
          selectedFolder2,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filterState));
      } catch (error) {
        console.error('Failed to save filters:', error);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeout);
  }, [qualityFilter, selectedFolders, searchQuery, selectedKey, sortBy, showMixReadyOnly, crossFolderOnly, selectedFolder1, selectedFolder2]);

  // Get unique keys
  const availableKeys = useMemo(() => {
    const keys = new Set<string>();
    analyzedTracks.forEach((t) => {
      if (t.key) keys.add(t.key);
    });
    return Array.from(keys).sort();
  }, [analyzedTracks]);

  // Get optimization stats
  const optimizationStats = useMemo(
    () => getMashupStats(analyzedTracks.length),
    [analyzedTracks.length]
  );

  // Detect duplicates
  const duplicateGroups = useMemo(() => {
    const groups = findDuplicates(analyzedTracks);
    return groups;
  }, [analyzedTracks]);

  const hasDuplicates = duplicateGroups.size > 0;

  // Handle mashup calculation with timing
  const handleCalculateMashups = useCallback(async () => {
    setIsCalculating(true);
    setCalculationTime(null);

    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      await onCalculateMashups();
      const elapsed = Date.now() - startTime;
      setCalculationTime(elapsed);
    } catch (error) {
      console.error('Mashup calculation failed:', error);
      alert('Failed to calculate mashups. Check console for details.');
    } finally {
      setIsCalculating(false);
    }
  }, [onCalculateMashups]);

  // ✅ UPDATED: ENHANCED FOLDER FILTERING WITH CROSS-FOLDER SUPPORT
  const filteredMashups = useMemo(() => {
    let filtered = [...(mashupCandidates || [])];

    // ✅ Cross-folder filter (FIRST - most restrictive)
    if (crossFolderOnly) {
      filtered = filterCrossFolderMashups(filtered);
      
      // Apply specific folder pairing if selected
      if (selectedFolder1 || selectedFolder2) {
        filtered = filterByFolderPair(filtered, selectedFolder1, selectedFolder2);
      }
    }

    // Mix-Ready filter
    if (showMixReadyOnly) {
      filtered = filterMixReady(filtered);
    }

    // Quality filter
    if (qualityFilter !== 'all') {
      filtered = filtered.filter((m) => m.category === qualityFilter);
    }

    // MULTI-FOLDER FILTER (only if NOT using cross-folder filter)
    if (!crossFolderOnly && selectedFolders.length > 0 && selectedFolders.length < folders.length) {
      filtered = filtered.filter((m) => {
        const track1Folder = m.track1.folderName || 'Uncategorized';
        const track2Folder = m.track2.folderName || 'Uncategorized';
        
        return selectedFolders.includes(track1Folder) && selectedFolders.includes(track2Folder);
      });
    }

    // BPM filter
    filtered = filtered.filter((m) => {
      const track1InRange = m.track1.bpm >= bpmRange.min && m.track1.bpm <= bpmRange.max;
      const track2InRange = m.track2.bpm >= bpmRange.min && m.track2.bpm <= bpmRange.max;
      return track1InRange && track2InRange;
    });

    // Key filter
    if (selectedKey !== 'all') {
      filtered = filtered.filter(
        (m) => m.track1.key === selectedKey || m.track2.key === selectedKey
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.track1.name.toLowerCase().includes(query) ||
          m.track2.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [mashupCandidates, qualityFilter, selectedFolders, folders.length, bpmRange, selectedKey, searchQuery, showMixReadyOnly, crossFolderOnly, selectedFolder1, selectedFolder2]);

  // Apply sorting
  const sortedMashups = useMemo(() => {
    const sorted = [...filteredMashups];

    switch (sortBy) {
      case 'perfect-match':
        // Already sorted by perfectMatchScore from mashupOptimizer
        return sorted.sort((a, b) => b.perfectMatchScore - a.perfectMatchScore);
      
      case 'bpm-first':
        // Sort by BPM difference (lowest first), then by key compatibility
        return sorted.sort((a, b) => {
          if (a.bpmDifference !== b.bpmDifference) {
            return a.bpmDifference - b.bpmDifference;
          }
          return b.perfectMatchScore - a.perfectMatchScore;
        });
      
      case 'key-first': {
        // Sort by harmonic tier (tier-1 first), then by BPM difference
        const tierOrder = { 'tier-1': 0, 'tier-2': 1, 'tier-3': 2, 'tier-4': 3, 'tier-5': 4, 'tier-6': 5 };
        return sorted.sort((a, b) => {
          const tierDiff = tierOrder[a.harmonicTier] - tierOrder[b.harmonicTier];
          if (tierDiff !== 0) return tierDiff;
          return a.bpmDifference - b.bpmDifference;
        });
      }
      
      case 'score':
        // Traditional compatibility score
        return sorted.sort((a, b) => b.score - a.score);
      
      default:
        return sorted;
    }
  }, [filteredMashups, sortBy]);

  // Quality counts
  const qualityCounts = useMemo(() => {
    const candidates = mashupCandidates || [];
    return {
      excellent: candidates.filter((m) => m.category === 'excellent').length,
      good: candidates.filter((m) => m.category === 'good').length,
      fair: candidates.filter((m) => m.category === 'fair').length,
      all: candidates.length,
    };
  }, [mashupCandidates]);

  // Display mashups (paginated)
  const displayedMashups = useMemo(
    () => sortedMashups.slice(0, displayCount),
    [sortedMashups, displayCount]
  );

  const hasMore = displayCount < sortedMashups.length;

  // ✅ UPDATED: Reset display count when filters change (including cross-folder filters)
  useEffect(() => {
    setDisplayCount(10);
  }, [qualityFilter, selectedFolders, selectedKey, searchQuery, bpmRange, sortBy, showMixReadyOnly, crossFolderOnly, selectedFolder1, selectedFolder2]);

  return (
    <div className="flex h-full">
      {/* ✅ UPDATED: Sidebar Filters with Cross-Folder Props */}
      <FilterSidebar
        qualityFilter={qualityFilter}
        onQualityChange={setQualityFilter}
        qualityCounts={qualityCounts}
        folders={folders}
        selectedFolders={selectedFolders}
        onFoldersChange={setSelectedFolders}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        bpmRange={bpmRange}
        trackBPMRange={trackBPMRange}
        onBPMRangeChange={onBPMRangeChange}
        selectedKey={selectedKey}
        availableKeys={availableKeys}
        onKeyChange={setSelectedKey}
        bpmTolerance={bpmTolerance}
        onBPMToleranceChange={onBPMToleranceChange}
        showMixReadyOnly={showMixReadyOnly}
        onMixReadyToggle={setShowMixReadyOnly}
        sortBy={sortBy}
        onSortChange={setSortBy}
        crossFolderOnly={crossFolderOnly}
        onCrossFolderOnlyChange={setCrossFolderOnly}
        selectedFolder1={selectedFolder1}
        selectedFolder2={selectedFolder2}
        onFolder1Change={setSelectedFolder1}
        onFolder2Change={setSelectedFolder2}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-4">
              <Sparkles className="text-white" size={32} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Discover Mashups
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Find perfect track combinations with BPM + Key priority matching
            </p>
          </div>

          {/* Stats Card */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                  {analyzedTracks.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Tracks Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-600 dark:text-pink-400 mb-1">
                  {optimizationStats.bruteForce.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Possible Combinations</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                  {optimizationStats.speedup.toFixed(1)}x
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Faster with Smart Filter</div>
              </div>
            </div>
          </div>

          {/* Duplicate Warning */}
          {hasDuplicates && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 text-sm mb-1">
                    Duplicate Tracks Detected
                  </h3>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">
                    Found {duplicateGroups.size} group(s) of similar/duplicate tracks. Consider removing duplicates to improve mashup quality.
                  </p>
                  <div className="space-y-1">
                    {Array.from(duplicateGroups.entries()).slice(0, 3).map(([key, tracks]) => (
                      <div key={key} className="text-xs text-yellow-600 dark:text-yellow-400">
                        • {tracks.map(t => t.name).join(', ')}
                      </div>
                    ))}
                    {duplicateGroups.size > 3 && (
                      <div className="text-xs text-yellow-600 dark:text-yellow-400">
                        ... and {duplicateGroups.size - 3} more group(s)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Calculate Button or Results */}
          {mashupCandidates.length === 0 ? (
            <div className="text-center">
              <button
                onClick={handleCalculateMashups}
                disabled={analyzedTracks.length < 2 || isCalculating}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none inline-flex items-center gap-3"
              >
                {isCalculating ? (
                  <>
                    <Loader className="animate-spin" size={24} />
                    <span>Calculating Perfect Matches...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={24} />
                    <span>Discover Perfect Matches ({analyzedTracks.length} tracks)</span>
                  </>
                )}
              </button>

              {analyzedTracks.length < 2 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Upload and analyze at least 2 tracks to discover mashup combinations
                </p>
              )}

              {analyzedTracks.length >= 2 && !isCalculating && (
                <div className="mt-6 max-w-md mx-auto bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={18} />
                    <div className="text-sm text-left">
                      <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                        🎯 Perfect Match Algorithm Ready
                      </p>
                      <p className="text-blue-700 dark:text-blue-300">
                        Will prioritize <strong>BPM proximity + Key compatibility</strong>
                      </p>
                      <p className="text-blue-600 dark:text-blue-400 mt-1">
                        Tolerance: <strong>±{bpmTolerance === 'strict' ? '2' : bpmTolerance === 'normal' ? '5' : bpmTolerance === 'flexible' ? '10' : '15'} BPM</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 md:mt-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-gray-700">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-3">
                    <Zap className="text-purple-600 dark:text-purple-400" size={20} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm md:text-base">
                    BPM + Key First
                  </h3>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    Perfect Match algorithm prioritizes beatmatchable BPMs and harmonic key compatibility
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-gray-700">
                  <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center mb-3">
                    <TrendingUp className="text-pink-600 dark:text-pink-400" size={20} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm md:text-base">
                    DJ-Focused Scoring
                  </h3>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    Match badges, pitch adjustment %, harmonic tiers, and mix difficulty ratings
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-gray-700">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-3">
                    <Clock className="text-blue-600 dark:text-blue-400" size={20} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm md:text-base">
                    Lightning Fast
                  </h3>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    {optimizationStats.speedup.toFixed(1)}x faster than traditional algorithms. Scales to hundreds of tracks.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Performance Banner */}
              {calculationTime !== null && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Zap className="text-green-600 dark:text-green-400 flex-shrink-0" size={24} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900 dark:text-green-100 text-sm">
                        ⚡ Perfect Match Algorithm Complete
                      </h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-green-700 dark:text-green-300 mt-1">
                        <span>
                          <strong>{calculationTime}ms</strong> total time
                        </span>
                        <span>•</span>
                        <span>
                          Saved <strong>{optimizationStats.savings.toLocaleString()}</strong> comparisons
                        </span>
                        <span>•</span>
                        <span>
                          Sorted by <strong>BPM + Key priority</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Results Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                    Mashup Candidates
                  </h3>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {sortedMashups.length} {qualityFilter !== 'all' ? qualityFilter : ''} combination
                    {sortedMashups.length !== 1 ? 's' : ''} found
                    {showMixReadyOnly && <span className="text-green-600 dark:text-green-400"> • Mix-Ready Only</span>}
                    {crossFolderOnly && <span className="text-orange-600 dark:text-orange-400"> • Cross-Folder Only</span>}
                    {selectedFolders.length > 0 && selectedFolders.length < folders.length && !crossFolderOnly && (
                      <span className="text-purple-600 dark:text-purple-400">
                        {' '}• {selectedFolders.length} folder{selectedFolders.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                </div>

                <button
                  onClick={handleCalculateMashups}
                  disabled={isCalculating}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm inline-flex items-center gap-2 self-start sm:self-auto"
                >
                  {isCalculating ? (
                    <>
                      <Loader className="animate-spin" size={16} />
                      <span>Recalculating...</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp size={16} />
                      <span>Recalculate</span>
                    </>
                  )}
                </button>
              </div>

              {/* Mashup Cards */}
              {displayedMashups.length > 0 ? (
                <>
                  <div className="grid gap-4">
                    {displayedMashups.map((mashup, index) => (
                      <MashupCard
                        key={`${mashup.track1.id}-${mashup.track2.id}-${index}`}
                        mashup={mashup}
                        rank={index + 1}
                      />
                    ))}
                  </div>

                  {/* Load More Button */}
                  {hasMore && (
                    <div className="text-center">
                      <button
                        onClick={() => setDisplayCount((prev) => prev + 10)}
                        className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                      >
                        Load More ({sortedMashups.length - displayCount} remaining)
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
                  <p className="text-gray-600 dark:text-gray-400">
                    No mashups match your current filters.
                    {selectedFolders.length === 0 && !crossFolderOnly && ' Select at least one folder to see results.'}
                    {crossFolderOnly && ' No cross-folder combinations found. Try selecting different folders or disabling cross-folder filter.'}
                    {selectedFolders.length > 0 && showMixReadyOnly && !crossFolderOnly && ' Try disabling Mix-Ready filter or adjusting BPM tolerance.'}
                    {selectedFolders.length > 0 && !showMixReadyOnly && !crossFolderOnly && ' Try selecting more folders or adjusting filters.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}