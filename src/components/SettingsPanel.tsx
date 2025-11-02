// src/components/SettingsPanel.tsx
// ✅ UPDATED: Added Time-Stretch Engine selector

import { useState, useEffect } from 'react';
import {
  X,
  Moon,
  Sun,
  Monitor,
  Volume2,
  Database,
  Info,
  Eye,
  Microscope,
  Trash2,
  RefreshCw,
  HardDrive,
  Zap,
} from 'lucide-react';
import { useDisplayPreferences } from '../hooks/useDisplayPreferences';
import { usePlayback } from '../contexts/PlaybackContext';
import { 
  getIndexedDBStats, 
  cleanupOldCache 
} from '../utils/indexedDB';
import { 
  clearAnalysisCache,
  getCacheSize
} from '../utils/fileHash';
import type { AnalysisMode, SegmentDensity, BeatStorage } from '../types/track';
import type { TimeStretchEngine } from '../types/audioEngine';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  analysisPreferences?: {
    mode: AnalysisMode;
    segmentDensity: SegmentDensity;
    beatStorage: BeatStorage;
  };
  onAnalysisPreferencesChange?: (prefs: {
    mode?: AnalysisMode;
    segmentDensity?: SegmentDensity;
    beatStorage?: BeatStorage;
  }) => void;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  autoSave: boolean;
  defaultVolume: number;
  autoPlayOnSelect: boolean;
  enableAnimations: boolean;
  maxTracksDisplay: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'auto',
  autoSave: true,
  defaultVolume: 70,
  autoPlayOnSelect: false,
  enableAnimations: true,
  maxTracksDisplay: 200,
};

export function SettingsPanel({
  isOpen,
  onClose,
  analysisPreferences,
  onAnalysisPreferencesChange,
}: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const { preferences, updatePreference } = useDisplayPreferences();
  const { timeStretchEngine, setTimeStretchEngine } = usePlayback();
  
  // Cache management state
  const [cacheStats, setCacheStats] = useState({
    memory: 0,
    indexedDB: 0,
    lastCleanup: null as string | null,
  });
  const [isLoadingCache, setIsLoadingCache] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('app-settings');
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('app-settings', JSON.stringify(settings));
    applyTheme(settings.theme);
  }, [settings]);

  // Load cache stats when panel opens
  useEffect(() => {
    if (isOpen) {
      loadCacheStats();
    }
  }, [isOpen]);

  const applyTheme = (theme: 'light' | 'dark' | 'auto') => {
    const root = document.documentElement;

    if (theme === 'auto') {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  };

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    if (confirm('Reset all settings to defaults?')) {
      setSettings(DEFAULT_SETTINGS);
    }
  };

  // Cache Management Functions
  const loadCacheStats = async () => {
    setIsLoadingCache(true);
    try {
      const memorySize = getCacheSize();
      const dbStats = await getIndexedDBStats();
      const lastCleanup = localStorage.getItem('cache-last-cleanup');

      setCacheStats({
        memory: memorySize,
        indexedDB: dbStats.count,
        lastCleanup,
      });
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    } finally {
      setIsLoadingCache(false);
    }
  };

  const handleClearAllCache = async () => {
    if (!confirm('Clear all cached analysis data? This cannot be undone.')) {
      return;
    }

    setIsLoadingCache(true);
    try {
      await clearAnalysisCache();
      await loadCacheStats();
      alert('Cache cleared successfully!');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache. Check console for details.');
    } finally {
      setIsLoadingCache(false);
    }
  };

  const handleCleanupOldCache = async () => {
    setIsLoadingCache(true);
    try {
      const daysOld = 30;
      const removed = await cleanupOldCache(daysOld);
      
      const now = new Date().toISOString();
      localStorage.setItem('cache-last-cleanup', now);
      
      await loadCacheStats();
      alert(`Cleaned up ${removed} entries older than ${daysOld} days.`);
    } catch (error) {
      console.error('Failed to cleanup cache:', error);
      alert('Failed to cleanup cache. Check console for details.');
    } finally {
      setIsLoadingCache(false);
    }
  };

  const formatRelativeTime = (isoString: string | null): string => {
    if (!isoString) return 'Never';
    
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity" 
        onClick={onClose} 
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Settings
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Appearance */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Monitor size={18} />
              Appearance
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['light', 'dark', 'auto'] as const).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => updateSetting('theme', theme)}
                      className={`
                        flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
                        ${
                          settings.theme === theme
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      {theme === 'light' && <Sun size={20} />}
                      {theme === 'dark' && <Moon size={20} />}
                      {theme === 'auto' && <Monitor size={20} />}
                      <span className="text-xs font-medium capitalize">
                        {theme}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Animations
                  </span>
                  <button
                    onClick={() =>
                      updateSetting(
                        'enableAnimations',
                        !settings.enableAnimations
                      )
                    }
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      ${
                        settings.enableAnimations
                          ? 'bg-blue-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${
                          settings.enableAnimations
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }
                      `}
                    />
                  </button>
                </label>
              </div>
            </div>
          </section>

          {/* Display Preferences */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Eye size={18} />
              Display Preferences
            </h3>

            <div className="space-y-4">
              {/* BPM Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  BPM Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['rounded', 'precise', 'hz'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updatePreference('bpmMode', mode)}
                      className={`
                        px-3 py-2 text-sm rounded-lg border-2 transition-all font-medium
                        ${
                          preferences.bpmMode === mode
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                        }
                      `}
                    >
                      {mode === 'rounded' && '128'}
                      {mode === 'precise' && '128.47'}
                      {mode === 'hz' && '2.13 Hz'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Key Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Key Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['standard', 'camelot', 'unicode'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updatePreference('keyMode', mode)}
                      className={`
                        px-3 py-2 text-sm rounded-lg border-2 transition-all font-medium
                        ${
                          preferences.keyMode === mode
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                        }
                      `}
                    >
                      {mode === 'standard' && 'Am / G'}
                      {mode === 'camelot' && '8A / 9B'}
                      {mode === 'unicode' && 'A♭m'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accidental Style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Accidental Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['sharp', 'flat'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => updatePreference('accidentalStyle', style)}
                      className={`
                        px-3 py-2 text-sm rounded-lg border-2 transition-all font-medium
                        ${
                          preferences.accidentalStyle === style
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                        }
                      `}
                    >
                      {style === 'sharp' && '♯ (C#, F#)'}
                      {style === 'flat' && '♭ (Db, Gb)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confidence Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confidence Display
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['bar', 'badge', 'percent', 'hidden'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updatePreference('confidenceMode', mode)}
                      className={`
                        px-3 py-2 text-sm rounded-lg border-2 transition-all font-medium capitalize
                        ${
                          preferences.confidenceMode === mode
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                        }
                      `}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Analysis Performance */}
          {analysisPreferences && onAnalysisPreferencesChange && (
            <section className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Microscope size={18} />
                Analysis Performance
              </h3>

              <div className="space-y-4">
                {/* Analysis Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Analysis Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['quick', 'full', 'high-precision'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => onAnalysisPreferencesChange({ mode })}
                        className={`
                          px-3 py-2 text-xs rounded-lg border-2 transition-all font-medium
                          ${
                            analysisPreferences.mode === mode
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                          }
                        `}
                      >
                        {mode === 'quick' && (
                          <div className="text-center">
                            <div className="font-bold">Quick</div>
                            <div className="text-xs opacity-70">~15s</div>
                          </div>
                        )}
                        {mode === 'full' && (
                          <div className="text-center">
                            <div className="font-bold">Full</div>
                            <div className="text-xs opacity-70">~30s</div>
                          </div>
                        )}
                        {mode === 'high-precision' && (
                          <div className="text-center">
                            <div className="font-bold">Precision</div>
                            <div className="text-xs opacity-70">~45s</div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {analysisPreferences.mode === 'quick' && '⚡ Fastest - Analyzes middle 15s (good for most tracks)'}
                    {analysisPreferences.mode === 'full' && '⚖️ Balanced - Analyzes first 30s (recommended)'}
                    {analysisPreferences.mode === 'high-precision' && '🎯 Slowest - Analyzes first 45s (most accurate)'}
                  </p>
                </div>

                {/* Segment Density */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Segment Detail
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['light', 'standard', 'detailed'] as const).map((density) => (
                      <button
                        key={density}
                        onClick={() => onAnalysisPreferencesChange({ segmentDensity: density })}
                        className={`
                          px-3 py-2 text-sm rounded-lg border-2 transition-all font-medium capitalize
                          ${
                            analysisPreferences.segmentDensity === density
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                          }
                        `}
                      >
                        {density}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Higher detail = slower analysis but better segment breakdown
                  </p>
                </div>

                {/* Beat Storage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Beat Data Storage
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['none', 'count', 'full'] as const).map((storage) => (
                      <button
                        key={storage}
                        onClick={() => onAnalysisPreferencesChange({ beatStorage: storage })}
                        className={`
                          px-3 py-2 text-sm rounded-lg border-2 transition-all font-medium capitalize
                          ${
                            analysisPreferences.beatStorage === storage
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                          }
                        `}
                      >
                        {storage}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {analysisPreferences.beatStorage === 'none' && '💾 Smallest memory - No beat positions saved'}
                    {analysisPreferences.beatStorage === 'count' && '⚖️ Balanced - Only beat count (recommended)'}
                    {analysisPreferences.beatStorage === 'full' && '📊 Largest memory - Full beat position array'}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ✅ NEW: Time-Stretch Engine */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Zap size={18} />
              Time-Stretch Engine
            </h3>

            <div className="space-y-3">
              {[
                {
                  value: 'soundtouch',
                  label: '🎯 SoundTouch.js',
                  desc: 'Best quality, industry standard',
                  badge: 'Recommended',
                  badgeColor: 'bg-green-500',
                  pros: ['Pitch-preserving time-stretch', 'Professional quality (SOLA algorithm)', 'Small bundle size (50KB)'],
                  cons: ['No seeking during playback', 'Slight processing delay on load'],
                },
                {
                  value: 'tone',
                  label: '🎹 Tone.js',
                  desc: 'Good quality, reliable backup',
                  badge: 'Stable',
                  badgeColor: 'bg-blue-500',
                  pros: ['Pitch-preserving time-stretch', 'Good quality', 'Stable and tested'],
                  cons: ['Larger bundle (200KB)', 'No seeking during playback'],
                },
                {
                  value: 'none',
                  label: '⚡ Simple (No Time-Stretch)',
                  desc: 'Fast, supports seeking',
                  badge: 'Fast',
                  badgeColor: 'bg-purple-500',
                  pros: ['Seeking works everywhere', 'Instant playback', 'Lightweight (0KB)', 'No processing delay'],
                  cons: ['Pitch changes with tempo', 'Not suitable for precise BPM matching'],
                },
              ].map((engine) => (
                <button
                  key={engine.value}
                  onClick={() => setTimeStretchEngine(engine.value as TimeStretchEngine)}
                  className={`
                    w-full p-4 rounded-lg text-left transition-all border-2
                    ${timeStretchEngine === engine.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                      {engine.label}
                    </div>
                    <span className={`px-2 py-0.5 ${engine.badgeColor} text-white text-xs rounded-full font-medium`}>
                      {engine.badge}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    {engine.desc}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="font-medium text-green-600 dark:text-green-400 mb-1">
                        ✓ Advantages:
                      </div>
                      {engine.pros.map((pro) => (
                        <div key={pro} className="text-gray-500 dark:text-gray-400 mb-0.5 text-xs">
                          • {pro}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="font-medium text-orange-600 dark:text-orange-400 mb-1">
                        ⚠️ Limitations:
                      </div>
                      {engine.cons.map((con) => (
                        <div key={con} className="text-gray-500 dark:text-gray-400 mb-0.5 text-xs">
                          • {con}
                        </div>
                      ))}
                    </div>
                  </div>

                  {timeStretchEngine === engine.value && (
                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                      <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                        ✓ Currently Active
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <Zap className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={14} />
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>💡 Recommendation:</strong> Use <strong>SoundTouch.js</strong> for professional-quality 
                  mashup previews with pitch-locked BPM sync. Switch to <strong>Simple</strong> if you need seeking 
                  support or instant playback without processing delay.
                </div>
              </div>
            </div>
          </section>

          {/* Audio Playback */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Volume2 size={18} />
              Audio Playback
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Volume: {settings.defaultVolume}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.defaultVolume}
                  onChange={(e) =>
                    updateSetting('defaultVolume', Number(e.target.value))
                  }
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Auto-play on Select
                  </span>
                  <button
                    onClick={() =>
                      updateSetting(
                        'autoPlayOnSelect',
                        !settings.autoPlayOnSelect
                      )
                    }
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      ${
                        settings.autoPlayOnSelect
                          ? 'bg-blue-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${
                          settings.autoPlayOnSelect
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }
                      `}
                    />
                  </button>
                </label>
              </div>
            </div>
          </section>

          {/* Library Management */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Database size={18} />
              Library Management
            </h3>

            <div className="space-y-4">
              <div>
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Auto-save Library
                  </span>
                  <button
                    onClick={() =>
                      updateSetting('autoSave', !settings.autoSave)
                    }
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      ${
                        settings.autoSave
                          ? 'bg-blue-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${settings.autoSave ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Tracks to Display
                </label>
                <select
                  value={settings.maxTracksDisplay}
                  onChange={(e) =>
                    updateSetting('maxTracksDisplay', Number(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                  <option value="500">500</option>
                  <option value="999999">Unlimited</option>
                </select>
              </div>
            </div>
          </section>

          {/* Cache Management */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <HardDrive size={18} />
              Cache Management
            </h3>

            <div className="space-y-4">
              {/* Cache Stats */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                      Memory Cache
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {isLoadingCache ? '...' : cacheStats.memory}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      files cached
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                      IndexedDB Cache
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {isLoadingCache ? '...' : cacheStats.indexedDB}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      persistent entries
                    </div>
                  </div>
                </div>

                {cacheStats.lastCleanup && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Last cleanup: {formatRelativeTime(cacheStats.lastCleanup)}
                    </div>
                  </div>
                )}
              </div>

              {/* Cache Actions */}
              <div className="space-y-2">
                <button
                  onClick={loadCacheStats}
                  disabled={isLoadingCache}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={16} className={isLoadingCache ? 'animate-spin' : ''} />
                  Refresh Stats
                </button>

                <button
                  onClick={handleCleanupOldCache}
                  disabled={isLoadingCache}
                  className="w-full px-4 py-2 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Database size={16} />
                  Cleanup Old (&gt;30d)
                </button>

                <button
                  onClick={handleClearAllCache}
                  disabled={isLoadingCache}
                  className="w-full px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={16} />
                  Clear All Cache
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                💡 Cached analyses load instantly. Clear cache if you&apos;ve re-encoded files or want fresh results.
              </p>
            </div>
          </section>

          {/* About */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Info size={18} />
              About
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-400">
              <p className="mb-2">
                <strong>Mashup Analyzer</strong>
              </p>
              <p className="mb-2">Version 2.0.0</p>
              <p>
                Analyze audio files, discover mashup combinations, and create
                perfect remixes.
              </p>
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={resetSettings}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Reset to Defaults
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function useSettings(): AppSettings {
  const saved = localStorage.getItem('app-settings');
  if (saved) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
}