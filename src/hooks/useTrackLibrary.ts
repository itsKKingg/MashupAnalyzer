// src/hooks/useTrackLibrary.ts
// ✅ UPDATED: BPM Tolerance + Perfect Match Scoring Integration

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Track,
  MashupCandidate,
  SortOption,
  FilterOption,
  MashupCategoryFilter,
  BPMRange,
  AnalysisPreferences,
  BPMTolerance,
} from '../types/track';
import {
  analyzeAudioFile,
  calculateCompatibility,
  AudioAnalysisResult,
  getAnalysisStats,
} from '../utils/audioAnalysis';
import {
  saveLibrary,
  SavedTrack,
  loadSettings,
  saveSettings,
} from '../utils/localStorage';
import { extractFolderName, extractFolderPath } from '../utils/folderUtils';
import { UploadQueue, QueueItem } from '../utils/queueManager';
import { terminateWorkerPool } from '../utils/workerPool';
import { calculateMashupsOptimized, toleranceToMaxBPM } from '../utils/mashupOptimizer';

const DEFAULT_ANALYSIS_PREFERENCES: AnalysisPreferences = {
  mode: 'full',
  segmentDensity: 'standard',
  beatStorage: 'count',
  bpmTolerance: 'normal', // ✅ NEW
};


// ============================================================================
// ENVIRONMENT DETECTION & TIMEOUTS
// ============================================================================

function detectEnvironment(): 'local' | 'deployed' | 'unknown' {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'local';
  } else if (hostname.includes('vercel.app') || hostname.includes('netlify.app') || 
             hostname.includes('github.io') || hostname.includes('pages.dev')) {
    return 'deployed';
  }
  return 'unknown';
}

function getAnalysisTimeout(fileSize: number): number {
  const environment = detectEnvironment();
  
  // Base timeouts by environment (in milliseconds)
  const BASE_TIMEOUT = environment === 'deployed' ? 300000 : 120000; // 5 min deployed, 2 min local
  
  // Dynamic adjustment based on file size
  // Add 30 seconds per 10MB for large files
  const SIZE_MB = fileSize / (1024 * 1024);
  const SIZE_BONUS = SIZE_MB > 10 ? Math.floor((SIZE_MB - 10) / 10) * 30000 : 0;
  
  const timeout = BASE_TIMEOUT + SIZE_BONUS;
  
  // Cap at 10 minutes to avoid waiting forever
  return Math.min(timeout, 600000);
}

const CONFIG = {
  DEBUG: false,
  LOG_INTERVAL: 10,
  MEMORY_LOG_INTERVAL: 60000,
  FORCE_CONCURRENCY: 4,
};

function ensureTrackProperties(track: Partial<Track>): Track {
  return {
    id: track.id ?? `${Date.now()}-${Math.random()}`,
    name: track.name ?? 'Unknown',
    file: track.file ?? new File([], 'unknown'),
    bpm: track.bpm ?? 0,
    key: track.key ?? '',
    duration: track.duration ?? 0,
    audioUrl: track.audioUrl ?? '',
    isAnalyzing: track.isAnalyzing ?? false,
    confidence: track.confidence ?? 0,
    keyConfidence: track.keyConfidence ?? 0,
    energy: track.energy ?? 0,
    danceability: track.danceability ?? 0,
    beatCount: track.beatCount ?? 0,
    error: track.error,
    genre: track.genre,
    beats: track.beats,
    analysisMode: track.analysisMode,
    analyzedDuration: track.analyzedDuration,
    folderName: track.folderName,
    folderPath: track.folderPath,
  };
}

function isValidAnalyzedTrack(track: any): track is Track {
  return (
    track !== null &&
    track !== undefined &&
    typeof track === 'object' &&
    typeof track.bpm === 'number' &&
    typeof track.key === 'string' &&
    typeof track.confidence === 'number' &&
    typeof track.energy === 'number' &&
    !track.isAnalyzing &&
    !track.error &&
    track.bpm > 0 &&
    track.key !== ''
  );
}

function filterValidTracks(tracks: any[]): Track[] {
  if (!Array.isArray(tracks)) return [];
  return tracks.filter((t): t is Track => 
    t !== null && 
    t !== undefined && 
    typeof t === 'object' &&
    t.id !== undefined
  );
}

export function useTrackLibrary() {
  // Clean corrupted localStorage
  (() => {
    try {
      const libraryData = localStorage.getItem('track-library');
      if (libraryData) {
        const parsed = JSON.parse(libraryData);
        if (Array.isArray(parsed)) {
          const hasNull = parsed.some(t => t === null || t === undefined);
          const hasMissingProps = parsed.some(t => 
            t && (
              typeof t.bpm !== 'number' ||
              typeof t.confidence !== 'number' ||
              typeof t.energy !== 'number' ||
              typeof t.beatCount !== 'number'
            )
          );
          
          if (hasNull || hasMissingProps) {
            console.warn('🔥 Corrupted library detected, clearing...');
            localStorage.removeItem('track-library');
          }
        }
      }
    } catch (e) {
      localStorage.removeItem('track-library');
    }
  })();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [mashupCandidates, setMashupCandidates] = useState<MashupCandidate[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterKey, setFilterKey] = useState<FilterOption>('all');
  const [isProcessing, setIsProcessing] = useState(false);

  const [mashupCategoryFilter, setMashupCategoryFilter] =
    useState<MashupCategoryFilter>('all');
  const [bpmRange, setBpmRange] = useState<BPMRange>({ min: 0, max: 200 });
  const [showAllMashups, setShowAllMashups] = useState(false);

  const [autoSave, setAutoSave] = useState(true);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [uploadQueue, setUploadQueue] = useState<QueueItem[]>([]);
  const queueRef = useRef<UploadQueue | null>(null);

  const [analysisPreferences, setAnalysisPreferences] = useState<AnalysisPreferences>(
    DEFAULT_ANALYSIS_PREFERENCES
  );

  // ✅ NEW: BPM Tolerance state
  const [bpmTolerance, setBpmTolerance] = useState<BPMTolerance>('normal');

  // ============================================================================
  // DATA MIGRATION
  // ============================================================================
  useEffect(() => {
    setTracks(prevTracks => {
      if (!Array.isArray(prevTracks) || prevTracks.length === 0) {
        return prevTracks;
      }

      const needsMigration = prevTracks.some(t => 
        t === null || 
        t === undefined ||
        typeof t.confidence !== 'number' ||
        typeof t.energy !== 'number' ||
        typeof t.beatCount !== 'number'
      );
      
      if (needsMigration) {
        console.log('🔧 Migrating tracks schema...');
        return filterValidTracks(prevTracks).map(t => ensureTrackProperties(t));
      }
      
      return prevTracks;
    });
  }, []);

  // ✅ ADDED: Enhanced stuck state detection with recovery
  useEffect(() => {
    const analyzingTracks = tracks.filter((t) => t && t.isAnalyzing);
    
    if (analyzingTracks.length > 0 && !isProcessing && uploadQueue.length === 0) {
      console.warn('⚠️ Detected stuck analyzing state:', analyzingTracks.length, 'tracks');
      console.warn('🔍 Analyzing tracks:', analyzingTracks.map(t => t?.name).filter(Boolean));
      
      const timer = setTimeout(() => {
        console.log('🔧 Auto-clearing stuck analyzing states...');
        
        // Clear stuck tracks and provide detailed error information
        setTracks((prev) => {
          const validPrev = filterValidTracks(prev);
          return validPrev.map((t) => {
            if (t && t.isAnalyzing) {
              console.error(`❌ Clearing stuck track: ${t.name}`);
              return {
                ...t,
                isAnalyzing: false,
                error: 'Analysis stuck - worker may have crashed. Please try re-uploading this file.'
              };
            }
            return t;
          });
        });
        
        setIsProcessing(false);
        setHasUnsavedChanges(true);
        
        // Optionally restart worker pool after stuck detection
        setTimeout(() => {
          console.log('🔄 Restarting worker pool after stuck detection...');
          terminateWorkerPool();
        }, 1000);
      }, 10000); // Increased from 5s to 10s for deployed environments

      return () => clearTimeout(timer);
    }
  }, [tracks, isProcessing, uploadQueue]);

  // ============================================================================
  // DEVICE DETECTION
  // ============================================================================

  function detectOptimalConcurrency(): number {
    if (CONFIG.FORCE_CONCURRENCY !== null) {
      return CONFIG.FORCE_CONCURRENCY;
    }

    const cores = navigator.hardwareConcurrency || 4;
    const memory = (performance as any).memory?.jsHeapSizeLimit || 0;

    if (memory > 8e9 && cores >= 8) return 4;
    if (memory > 4e9 && cores >= 4) return 3;
    return 2;
  }

  // ============================================================================
  // QUEUE INITIALIZATION
  // ============================================================================

  useEffect(() => {
    const maxConcurrent = detectOptimalConcurrency();
    const queue = new UploadQueue(maxConcurrent);

    queue.setOnUpdate((items) => {
      setUploadQueue(items);
    });

    queue.setOnItemComplete((item) => {
      if (CONFIG.DEBUG) {
        console.log(`✅ ${item.file.name}`);
      }
    });

    queueRef.current = queue;

    console.log(`🎯 Queue ready: ${maxConcurrent} workers`);

    return () => {
      queue.clear();
      terminateWorkerPool();
    };
  }, []);

  // ============================================================================
  // SETTINGS MANAGEMENT
  // ============================================================================

  useEffect(() => {
    const settings = loadSettings();
    setAutoSave(settings.autoSave);

    const savedPrefs = localStorage.getItem('analysis-preferences');
    if (savedPrefs) {
      try {
        const prefs = { ...DEFAULT_ANALYSIS_PREFERENCES, ...JSON.parse(savedPrefs) };
        setAnalysisPreferences(prefs);
        // ✅ Load BPM tolerance
        if (prefs.bpmTolerance) {
          setBpmTolerance(prefs.bpmTolerance);
        }
      } catch (e) {
        console.error('Failed to load preferences:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (autoSave && tracks.length > 0 && hasUnsavedChanges) {
      const analyzedTracks = tracks.filter(
        (t) => t && 
               !t.isAnalyzing && 
               !t.error && 
               typeof t.bpm === 'number' &&
               t.bpm > 0
      );
      if (analyzedTracks.length > 0) {
        const success = saveLibrary(tracks);
        if (success) {
          setLastSaved(Date.now());
          setHasUnsavedChanges(false);
        }
      }
    }
  }, [tracks, autoSave, hasUnsavedChanges]);

  useEffect(() => {
    saveSettings({ autoSave, lastSession: Date.now() });
  }, [autoSave]);

  useEffect(() => {
    const prefsWithTolerance = { ...analysisPreferences, bpmTolerance };
    localStorage.setItem('analysis-preferences', JSON.stringify(prefsWithTolerance));
  }, [analysisPreferences, bpmTolerance]);

  // ============================================================================
  // ADD TRACKS - MINIMAL LOGGING + TIMEOUT PROTECTION
  // ============================================================================

  const addTracks = useCallback(async (files: File[]) => {
    setTracks(prev => filterValidTracks(prev));

    if (!queueRef.current) {
      console.error('❌ Queue not initialized');
      return;
    }

    const validFiles = files.filter(f => f !== null && f !== undefined && f instanceof File);
    
    if (validFiles.length === 0) {
      console.warn('No valid files');
      return;
    }

    const modeLabel = analysisPreferences.mode === 'quick' ? 'Quick' :
                     analysisPreferences.mode === 'high-precision' ? 'High-Precision' : 'Full';
    console.log(`\n📦 Analyzing ${validFiles.length} files (${modeLabel} mode)`);
    const environment = detectEnvironment();
    const avgFileSize = validFiles.reduce((sum, f) => sum + f.size, 0) / validFiles.length;
    const estimatedTimeout = getAnalysisTimeout(avgFileSize);
    console.log(`🌍 Environment: ${environment.toUpperCase()} | Timeout: ${(estimatedTimeout / 1000).toFixed(0)}s per file`);
    setIsProcessing(true);

    const newTracks: Track[] = validFiles.map((file) => {
      try {
        const folderName = extractFolderName(file);
        const folderPath = extractFolderPath(file);
        
        return ensureTrackProperties({
          id: `${Date.now()}-${Math.random()}-${file.name}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          file,
          bpm: 0,
          key: '',
          duration: 0,
          audioUrl: URL.createObjectURL(file),
          isAnalyzing: true,
          confidence: 0,
          keyConfidence: 0,
          energy: 0,
          danceability: 0,
          beatCount: 0,
          folderName,
          folderPath,
        });
      } catch (error) {
        console.error('Failed to create track:', file?.name, error);
        return null;
      }
    }).filter((t): t is Track => t !== null);

    if (newTracks.length === 0) {
      console.warn('Failed to create tracks');
      setIsProcessing(false);
      return;
    }

    setTracks((prev) => {
      const validPrev = filterValidTracks(prev);
      return [...validPrev, ...newTracks];
    });
    
    setHasUnsavedChanges(true);

    queueRef.current.addFiles(validFiles);

    const trackMap = new Map(newTracks.map((t) => [t.file.name, t]));
    let completedCount = 0;
    let failedCount = 0;

    await queueRef.current.processAll(async (file, onProgress) => {
      const track = trackMap.get(file.name);
      if (!track) {
        console.warn(`⚠️ Track not found: ${file.name}`);
        return;
      }

      try {
        const fileSize = file.size;
        const timeoutMs = getAnalysisTimeout(fileSize);
        const analysisStartTime = performance.now();
        
        if (CONFIG.DEBUG || completedCount === 0) {
          const env = detectEnvironment();
          console.log(`⏱️ [${file.name}] Timeout: ${(timeoutMs / 1000).toFixed(0)}s (${env}, ${(fileSize / (1024 * 1024)).toFixed(1)}MB)`);
        }

        const analysisPromise = analyzeAudioFile(
          track.file,
          (progress, status) => {
            onProgress(progress);
          },
          {
            mode: analysisPreferences.mode,
            segmentDensity: analysisPreferences.segmentDensity,
            beatStorage: analysisPreferences.beatStorage,
          }
        );

        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => {
            const elapsed = ((performance.now() - analysisStartTime) / 1000).toFixed(1);
            reject(new Error(`Analysis timeout after ${elapsed}s (limit: ${(timeoutMs / 1000).toFixed(0)}s)`));
          }, timeoutMs);
        });

        const analysis = await Promise.race([analysisPromise, timeoutPromise]);
        
        // Log successful analysis time
        const analysisTime = performance.now() - analysisStartTime;
        if (CONFIG.DEBUG || analysisTime > timeoutMs * 0.7) {
          console.log(`✅ [${file.name}] Completed in ${(analysisTime / 1000).toFixed(1)}s (${((analysisTime / timeoutMs) * 100).toFixed(0)}% of timeout)`);
        }

        if (!analysis) {
          throw new Error('Analysis returned null');
        }

        if (typeof analysis.bpm !== 'number') {
          throw new Error('Analysis missing BPM');
        }

        if (typeof analysis.key !== 'string' || !analysis.key) {
          throw new Error('Analysis missing Key');
        }

        // Additional validation for deployed environments
        if (analysis.bpm <= 0 || analysis.bpm > 300) {
          throw new Error(`Invalid BPM detected: ${analysis.bpm}`);
        }

        if (!['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].some(k => analysis.key.startsWith(k))) {
          throw new Error(`Invalid key detected: ${analysis.key}`);
        }

        setTracks((prev) => {
          const validPrev = filterValidTracks(prev);
          return validPrev.map((t) => {
            if (t && t.id === track.id) {
              return ensureTrackProperties({
                ...t,
                bpm: analysis.bpm,
                key: analysis.key,
                duration: analysis.duration,
                confidence: analysis.confidence ?? 0,
                keyConfidence: analysis.keyConfidence ?? 0,
                energy: analysis.energy ?? 0,
                danceability: analysis.danceability ?? 0,
                genre: analysis.genre,
                beatCount: analysis.beatCount ?? 0,
                beats: analysis.beats,
                analysisMode: analysis.analysisMode,
                analyzedDuration: analysis.analyzedDuration,
                isAnalyzing: false,
                file: t.file,
                audioUrl: t.audioUrl,
                folderName: t.folderName,
                folderPath: t.folderPath,
              });
            }
            return t;
          });
        });

        completedCount++;
        onProgress(100);

        if (completedCount % CONFIG.LOG_INTERVAL === 0) {
          console.log(`📊 Progress: ${completedCount}/${validFiles.length} completed`);
        }

      } catch (error) {
        console.error(`❌ Failed: ${file.name}:`, error instanceof Error ? error.message : error);
        failedCount++;

        setTracks((prev) =>
          filterValidTracks(prev).map((t) =>
            t && t.id === track.id
              ? {
                  ...t,
                  isAnalyzing: false,
                  error: error instanceof Error ? error.message : 'Analysis failed',
                }
              : t
          )
        );
      }
    });

    setIsProcessing(false);
    setHasUnsavedChanges(true);

    console.log(`✅ Complete: ${completedCount} succeeded, ${failedCount} failed\n`);

    setTimeout(() => {
      queueRef.current?.removeCompleted();
    }, 3000);

  }, [analysisPreferences]);

  // ============================================================================
  // CANCEL ANALYSIS
  // ============================================================================

  const cancelAnalysis = useCallback(() => {
    console.log('🛑 Canceling analysis...');
    
    queueRef.current?.clear();
    
    setTracks((prev) => {
      const validPrev = filterValidTracks(prev);
      const analyzingTracks = validPrev.filter(t => t && t.isAnalyzing);
      
      analyzingTracks.forEach(t => {
        if (t && t.audioUrl) {
          URL.revokeObjectURL(t.audioUrl);
        }
      });
      
      return validPrev.filter(t => t && !t.isAnalyzing);
    });
    
    setIsProcessing(false);
    setHasUnsavedChanges(true);
    
    console.log('✅ Analysis canceled');
  }, []);

  // ============================================================================
  // TRACK MANAGEMENT
  // ============================================================================

  const addTracksFromSaved = useCallback((savedTracks: SavedTrack[]) => {
    const placeholderTracks: Track[] = savedTracks
      .filter(saved => saved !== null && saved !== undefined)
      .map((saved) => 
        ensureTrackProperties({
          id: saved.id,
          name: saved.name,
          file: new File([], saved.fileName),
          bpm: saved.bpm ?? 0,
          key: saved.key ?? '',
          duration: saved.duration ?? 0,
          audioUrl: '',
          isAnalyzing: false,
          error: 'Audio file not available - re-upload to preview',
          folderName: (saved as any).folderName,
          folderPath: (saved as any).folderPath,
        })
      );

    setTracks(placeholderTracks);
    setHasUnsavedChanges(false);
  }, []);

  const removeTrack = useCallback((trackId: string) => {
    setTracks((prev) => {
      const validPrev = filterValidTracks(prev);
      const track = validPrev.find((t) => t && t.id === trackId);
      if (track?.audioUrl) {
        URL.revokeObjectURL(track.audioUrl);
      }
      return validPrev.filter((t) => t && t.id !== trackId);
    });
    setHasUnsavedChanges(true);
  }, []);

  const clearAllTracks = useCallback(() => {
    const validTracks = filterValidTracks(tracks);
    validTracks.forEach((track) => {
      if (track && track.audioUrl) {
        URL.revokeObjectURL(track.audioUrl);
      }
    });
    setTracks([]);
    setMashupCandidates([]);
    setHasUnsavedChanges(true);
    queueRef.current?.clear();
    setIsProcessing(false);
  }, [tracks]);

  const manualSave = useCallback(() => {
    const success = saveLibrary(tracks);
    if (success) {
      setLastSaved(Date.now());
      setHasUnsavedChanges(false);
    }
    return success;
  }, [tracks]);

  // ============================================================================
  // MASHUP CALCULATION - ✅ WITH BPM TOLERANCE
  // ============================================================================

  const calculateMashups = useCallback(async () => {
    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      setMashupCandidates([]);
      return;
    }

    const validTracks = filterValidTracks(tracks);
    const analyzedTracks = validTracks.filter(isValidAnalyzedTrack);

    if (analyzedTracks.length < 2) {
      console.log('⚠️ Need at least 2 tracks');
      setMashupCandidates([]);
      return;
    }

    console.log(`🔍 Calculating mashups for ${analyzedTracks.length} tracks...`);
    console.log(`   BPM Tolerance: ${bpmTolerance} (±${toleranceToMaxBPM(bpmTolerance)} BPM)`);
    const startTime = Date.now();
    
    // ✅ Pass BPM tolerance to optimizer
    const candidates = await calculateMashupsOptimized(
      analyzedTracks,
      {
        maxBPMDiff: toleranceToMaxBPM(bpmTolerance),
        requireKeyCompatibility: false,
        minScore: 0.3,
        bpmTolerance, // ✅ NEW
        onProgress: (current, total) => {
          if (current % 500 === 0) {
            console.log(`  ${current}/${total} comparisons...`);
          }
        },
      }
    );

    setMashupCandidates(candidates);
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ Found ${candidates.length} mashups in ${elapsed}ms`);
  }, [tracks, bpmTolerance]);

  // ============================================================================
  // FILTERING & SORTING
  // ============================================================================

  const getFilteredTracks = useCallback(() => {
    let filtered = filterValidTracks(tracks).filter((t) => t && !t.isAnalyzing && !t.error);

    if (filterKey !== 'all') {
      filtered = filtered.filter((t) => t && t.key === filterKey);
    }

    filtered = filtered.filter(
      (t) => t && t.bpm >= bpmRange.min && t.bpm <= bpmRange.max
    );

    filtered.sort((a, b) => {
      if (!a || !b) return 0;
      
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'bpm':
          return b.bpm - a.bpm;
        case 'key':
          return a.key.localeCompare(b.key);
        case 'duration':
          return b.duration - a.duration;
        case 'energy':
          return (b.energy || 0) - (a.energy || 0);
        case 'confidence':
          return (b.confidence || 0) - (a.confidence || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [tracks, sortBy, filterKey, bpmRange]);

  const getFilteredMashups = useCallback(() => {
    let filtered = [...(mashupCandidates || [])];

    if (mashupCategoryFilter !== 'all') {
      filtered = filtered.filter((m) => m && m.category === mashupCategoryFilter);
    }

    filtered = filtered.filter((m) => {
      if (!m || !m.track1 || !m.track2) return false;
      
      const track1InRange =
        m.track1.bpm >= bpmRange.min && m.track1.bpm <= bpmRange.max;
      const track2InRange =
        m.track2.bpm >= bpmRange.min && m.track2.bpm <= bpmRange.max;
      return track1InRange && track2InRange;
    });

    return filtered;
  }, [mashupCandidates, mashupCategoryFilter, bpmRange]);

  const getUniqueKeys = useCallback(() => {
    const keys = new Set<string>();
    filterValidTracks(tracks).forEach((t) => {
      if (t && t.key && !t.isAnalyzing && !t.error) {
        keys.add(t.key);
      }
    });
    return Array.from(keys).sort();
  }, [tracks]);

  const getTrackBPMRange = useCallback((): BPMRange => {
    const analyzedTracks = filterValidTracks(tracks).filter(
      (t) => t && !t.isAnalyzing && !t.error && t.bpm > 0
    );
    if (analyzedTracks.length === 0) return { min: 0, max: 200 };

    const bpms = analyzedTracks.map((t) => t.bpm);
    return {
      min: Math.floor(Math.min(...bpms)),
      max: Math.ceil(Math.max(...bpms)),
    };
  }, [tracks]);

  // ============================================================================
  // STATISTICS
  // ============================================================================

  const getCategoryCounts = useMemo(() => {
    const candidates = mashupCandidates || [];
    
    return {
      all: candidates.length,
      excellent: candidates.filter((m) => m && m.category === 'excellent').length,
      good: candidates.filter((m) => m && m.category === 'good').length,
      fair: candidates.filter((m) => m && m.category === 'fair').length,
      poor: candidates.filter((m) => m && m.category === 'poor').length,
    };
  }, [mashupCandidates]);

  const getQueueStats = useCallback(() => {
    if (!queueRef.current) return null;

    return {
      total: queueRef.current.getTotalCount(),
      pending: queueRef.current.getPendingCount(),
      processing: queueRef.current.getProcessingCount(),
      completed: queueRef.current.getCompletedCount(),
      failed: queueRef.current.getFailedCount(),
    };
  }, []);

  // ============================================================================
  // RETURN API
  // ============================================================================

  return {
    tracks,
    addTracks,
    removeTrack,
    clearAllTracks,
    addTracksFromSaved,
    cancelAnalysis,

    mashupCandidates,
    calculateMashups,
    getFilteredMashups,
    getCategoryCounts,

    sortBy,
    setSortBy,
    filterKey,
    setFilterKey,
    getFilteredTracks,
    getUniqueKeys,
    bpmRange,
    setBpmRange,
    getTrackBPMRange,

    mashupCategoryFilter,
    setMashupCategoryFilter,
    showAllMashups,
    setShowAllMashups,

    isProcessing,
    uploadQueue,
    getQueueStats,

    autoSave,
    setAutoSave,
    lastSaved,
    hasUnsavedChanges,
    manualSave,

    analysisPreferences,
    setAnalysisPreferences,

    // ✅ NEW: BPM Tolerance
    bpmTolerance,
    setBpmTolerance,
  };
}