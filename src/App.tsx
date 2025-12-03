// src/App.tsx
// ✅ FIXED: Keyboard shortcuts don't interfere with input fields

import { useEffect, useState } from 'react';
import { Settings, Music2 } from 'lucide-react';
import { useTrackLibrary } from './hooks/useTrackLibrary';
import { TabNavigation, TabId } from './components/TabNavigation';
import { SettingsPanel } from './components/SettingsPanel';
import { PrepareTab } from './components/tabs/PrepareTab';
import { AnalyzeTab } from './components/tabs/AnalyzeTab';
import { DiscoverTab } from './components/tabs/DiscoverTab';
import { VisualizeTab } from './components/tabs/VisualizeTab';
import { UVR5Tab } from './components/tabs/UVR5Tab';
import { SessionManager } from './components/SessionManager';
import { RestoreSession } from './components/RestoreSession';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { PersistentPlayer } from './components/PersistentPlayer';
import { SetGeneratorModal } from './components/SetGeneratorModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePlayback } from './contexts/PlaybackContext';
import { loadLibrary, clearLibrary, SavedLibrary } from './utils/localStorage';
import { MashupCandidate } from './types/track';
import { closeSharedAudioContext } from './utils/sharedAudioContext';

function App() {
  const {
    tracks,
    addTracks,
    removeTrack,
    mashupCandidates,
    calculateMashups,
    sortBy,
    setSortBy,
    filterKey,
    setFilterKey,
    getFilteredTracks,
    getUniqueKeys,
    isProcessing,
    mashupCategoryFilter,
    setMashupCategoryFilter,
    bpmRange,
    setBpmRange,
    showAllMashups,
    setShowAllMashups,
    getFilteredMashups,
    getTrackBPMRange,
    getCategoryCounts,
    autoSave,
    setAutoSave,
    lastSaved,
    hasUnsavedChanges,
    addTracksFromSaved,
    clearAllTracks,
    manualSave,
    uploadQueue,
    getQueueStats,
    analysisPreferences,
    setAnalysisPreferences,
    cancelAnalysis,
    bpmTolerance,
    setBpmTolerance,
  } = useTrackLibrary();

  const {
    playSingleTrack,
    playMashup,
    togglePlayPause,
    stop,
    volume,
    setVolume,
    state: playbackState,
    currentTime,
    duration,
  } = usePlayback();

  const [activeTab, setActiveTab] = useState<TabId>('prepare');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showSetGenerator, setShowSetGenerator] = useState(false);

  const [savedLibrary, setSavedLibrary] = useState<SavedLibrary | null>(null);
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);

  useEffect(() => {
    const library = loadLibrary();
    if (library && library.tracks.length > 0) {
      setSavedLibrary(library);
      setShowRestoreBanner(true);
    }
  }, []);

    useEffect(() => {
      return () => {
        closeSharedAudioContext();
      };
    }, []);

  // ✅ FIXED: Check if user is typing before triggering shortcuts
  const isTyping = () => {
    const activeElement = document.activeElement;
    const tagName = activeElement?.tagName;
    return (
      tagName === 'INPUT' ||
      tagName === 'TEXTAREA' ||
      (activeElement as HTMLElement)?.isContentEditable
    );
  };

  useKeyboardShortcuts(
    [
      // Settings & UI
      {
        key: ',',
        ctrl: true,
        handler: () => setSettingsOpen(true),
        description: 'Open settings',
      },
      {
        key: 'f',
        ctrl: true,
        handler: () => {
          const searchInput = document.querySelector(
            'input[type="text"]'
          ) as HTMLInputElement;
          if (searchInput) searchInput.focus();
        },
        description: 'Focus search',
      },
      {
        key: '?',
        handler: () => setShowKeyboardHelp(true),
        description: 'Show keyboard shortcuts',
      },
      {
        key: 'Escape',
        handler: () => {
          if (settingsOpen) setSettingsOpen(false);
          if (showKeyboardHelp) setShowKeyboardHelp(false);
          if (showSetGenerator) setShowSetGenerator(false);
        },
        description: 'Close dialogs',
      },
      // Tab navigation
      {
        key: '1',
        handler: () => {
          if (isTyping()) return;
          setActiveTab('prepare');
        },
        description: 'Go to Prepare tab',
      },
      {
        key: '2',
        handler: () => {
          if (isTyping()) return;
          setActiveTab('analyze');
        },
        description: 'Go to Analyze tab',
      },
      {
        key: '3',
        handler: () => {
          if (isTyping()) return;
          setActiveTab('discover');
        },
        description: 'Go to Discover tab',
      },
      {
        key: '4',
        handler: () => {
          if (isTyping()) return;
          setActiveTab('visualize');
        },
        description: 'Go to Visualize tab',
      },
      {
        key: '5',
        handler: () => {
          if (isTyping()) return;
          setActiveTab('uvr5');
        },
        description: 'Go to UVR5 tab',
      },
      // Set generator
      {
        key: 'g',
        ctrl: true,
        handler: () => tracks.length >= 2 && setShowSetGenerator(true),
        description: 'Generate set',
      },
      // ✅ FIXED: Playback controls - don't trigger when typing
      {
        key: ' ',
        handler: (e) => {
          // Don't trigger if user is typing in an input field
          if (isTyping()) return;
          
          e.preventDefault();
          togglePlayPause();
        },
        description: 'Play/Pause',
      },
      {
        key: 's',
        ctrl: true,
        handler: (e) => {
          e.preventDefault();
          stop();
        },
        description: 'Stop playback',
      },
      {
        key: 'ArrowUp',
        handler: () => {
          if (isTyping()) return;
          setVolume(Math.min(1, volume + 0.1));
        },
        description: 'Volume up',
      },
      {
        key: 'ArrowDown',
        handler: () => {
          if (isTyping()) return;
          setVolume(Math.max(0, volume - 0.1));
        },
        description: 'Volume down',
      },
    ],
    true
  );

  const handleRestoreSession = () => {
    if (savedLibrary) {
      addTracksFromSaved(savedLibrary.tracks);
      setShowRestoreBanner(false);
      setActiveTab('analyze');
    }
  };

  const handleDismissRestore = () => {
    setShowRestoreBanner(false);
    clearLibrary();
    setSavedLibrary(null);
  };

  const handleImport = (library: SavedLibrary) => {
    addTracksFromSaved(library.tracks);
    setActiveTab('analyze');
  };

  const handleClearAll = () => {
    clearAllTracks();
    clearLibrary();
  };

  const handleAutoSaveToggle = () => {
    setAutoSave(!autoSave);
  };

  const handleBPMRangeClick = (min: number, max: number) => {
    setBpmRange({ min, max });
    setActiveTab('analyze');
  };

  const handleKeySelect = (key: string) => {
    setFilterKey(key);
    setActiveTab('analyze');
  };

  const handleMashupClick = (mashup: MashupCandidate) => {
    setActiveTab('discover');
    setMashupCategoryFilter('all');

    const mashupIndex = filteredMashups.findIndex(
      (m) =>
        (m.track1.id === mashup.track1.id &&
          m.track2.id === mashup.track2.id) ||
        (m.track1.id === mashup.track2.id && m.track2.id === mashup.track1.id)
    );

    if (mashupIndex >= 12) {
      setShowAllMashups(true);
    }
  };

  const handleAnalysisPreferencesChange = (
    prefs: Partial<typeof analysisPreferences>
  ) => {
    setAnalysisPreferences((prev) => ({ ...prev, ...prefs }));
  };

  const filteredTracks = getFilteredTracks();
  const filteredMashups = getFilteredMashups();
  const uniqueKeys = getUniqueKeys();
  const trackBPMRange = getTrackBPMRange();

  const analyzedTracks = tracks.filter((t) => t && !t.isAnalyzing && !t.error);
  const analyzingCount = tracks.filter((t) => t && t.isAnalyzing).length;

  const queueStats = getQueueStats();
  const workerStats = queueStats
    ? {
        total: 8,
        busy: queueStats.processing,
        available: 8 - queueStats.processing,
        queued: queueStats.pending,
      }
    : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors pb-24">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2.5 rounded-xl shadow-lg">
                <Music2 className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Mashup Analyzer
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Perfect Match DJ Algorithm
                  {analyzedTracks.length > 0 && ` • ${analyzedTracks.length} tracks`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {analyzedTracks.length >= 2 && (
                <button
                  onClick={() => setShowSetGenerator(true)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                  title="Auto-Generate Set (Ctrl+G)"
                >
                  <Music2 size={16} />
                  <span className="hidden sm:inline">Generate Set</span>
                </button>
              )}

              {playbackState.isPlaying && (
                <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    {playbackState.mode === 'single' ? 'Playing' : 'Mixing'}
                  </span>
                </div>
              )}

              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all group relative"
                title="Settings (Cmd/Ctrl + ,)"
              >
                <Settings
                  className="text-gray-600 dark:text-gray-400 group-hover:rotate-90 transition-transform duration-300"
                  size={20}
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        trackCount={analyzedTracks.length}
        mashupCount={filteredMashups.length}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {showRestoreBanner && savedLibrary && activeTab === 'prepare' && (
          <div className="mb-8">
            <RestoreSession
              savedLibrary={savedLibrary}
              onRestore={handleRestoreSession}
              onDismiss={handleDismissRestore}
            />
          </div>
        )}

        {tracks.length > 0 && activeTab === 'prepare' && (
          <div className="mb-8">
            <SessionManager
              tracks={tracks}
              autoSave={autoSave}
              onAutoSaveToggle={handleAutoSaveToggle}
              lastSaved={lastSaved}
              hasUnsavedChanges={hasUnsavedChanges}
              onManualSave={manualSave}
              onImport={handleImport}
              onClearAll={handleClearAll}
            />
          </div>
        )}

        <div className="relative">
          {activeTab === 'prepare' && (
            <PrepareTab
              onFilesAdded={addTracks}
              isProcessing={isProcessing}
              analyzingCount={analyzingCount}
              uploadQueue={uploadQueue}
              workerStats={workerStats}
              onCancel={cancelAnalysis}
            />
          )}

          {activeTab === 'analyze' && (
            <AnalyzeTab
              tracks={tracks}
              onRemove={removeTrack}
              sortBy={sortBy}
              onSortChange={setSortBy}
              filterKey={filterKey}
              onFilterChange={setFilterKey}
              bpmRange={bpmRange}
              onBpmRangeChange={setBpmRange}
              trackBPMRange={trackBPMRange}
              availableKeys={uniqueKeys}
              filteredTracks={filteredTracks}
            />
          )}

          {activeTab === 'discover' && (
            <DiscoverTab
              tracks={tracks}
              mashupCandidates={mashupCandidates}
              onCalculateMashups={calculateMashups}
              bpmRange={bpmRange}
              onBPMRangeChange={setBpmRange}
              trackBPMRange={trackBPMRange}
              bpmTolerance={bpmTolerance}
              onBPMToleranceChange={setBpmTolerance}
            />
          )}

          {activeTab === 'visualize' && (
            <VisualizeTab
              tracks={tracks}
              mashups={mashupCandidates}
              bpmRange={bpmRange}
              onBpmRangeClick={handleBPMRangeClick}
              selectedKey={filterKey !== 'all' ? filterKey : undefined}
              onKeySelect={handleKeySelect}
              onMashupClick={handleMashupClick}
            />
          )}

          {activeTab === 'uvr5' && <UVR5Tab />}
        </div>
      </main>

      <footer className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
        <p>
          All processing happens in your browser. Your files never leave your
          device.
        </p>
        <div className="mt-2 flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={() => setShowKeyboardHelp(true)}
            className="text-xs hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Keyboard Shortcuts (
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
              ?
            </kbd>
            )
          </button>
          <span className="text-xs">•</span>
          <span className="text-xs">
            Press{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
              1-5
            </kbd>{' '}
            to switch tabs
          </span>
          <span className="text-xs">•</span>
          <span className="text-xs">
            Press{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
              Space
            </kbd>{' '}
            to play/pause
          </span>
          <span className="text-xs">•</span>
          <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
            🎯 Perfect Match Algorithm Active
          </span>
        </div>
      </footer>

      <PersistentPlayer />

      <SetGeneratorModal
        isOpen={showSetGenerator}
        onClose={() => setShowSetGenerator(false)}
        tracks={analyzedTracks}
        onPlayTrack={playSingleTrack}
      />

      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        analysisPreferences={analysisPreferences}
        onAnalysisPreferencesChange={handleAnalysisPreferencesChange}
      />
    </div>
  );
}

export default App;