# Performance Profiling Guide

This document explains how to use the performance profiling system to debug slow audio analysis on deployed vs local environments.

## Overview

The performance profiler tracks detailed timing information throughout the audio analysis pipeline to identify bottlenecks. It measures:

1. **Cache Operations**: Time spent checking and writing to memory/IndexedDB caches
2. **Metadata Extraction**: Time to extract ID3 tags and metadata from audio files
3. **Audio Decoding**: Time for Web Audio API to decode audio data
4. **Worker Initialization**: Time to initialize Web Workers and load WASM
5. **Worker Analysis**: Time spent in actual Essentia WASM analysis
6. **Worker Utilization**: How efficiently the worker pool is being used

## Features

- ✅ Automatic profiling of every analyzed file
- ✅ Aggregated statistics with averages, min/max, and percentages
- ✅ Environment detection (local vs deployed)
- ✅ Real-time UI dashboard in Analyze tab
- ✅ Console API for debugging
- ✅ JSON export for comparison
- ✅ Per-worker performance breakdown

## Using the Profiler

### 1. UI Dashboard

The **Analyze** tab shows a performance metrics panel with:

- Total files analyzed
- Cache hit rate
- Average analysis time
- Worker utilization
- Detailed time breakdown (expandable)

Click **Details** to see:
- Time breakdown by phase (with percentages)
- Performance range (fastest/slowest file)
- System information

### 2. Browser Console API

The profiler is exposed globally as `window.profiler`:

```javascript
// Print detailed summary to console
profiler.print()

// Export metrics to JSON file
profiler.export()

// Reset all metrics
profiler.reset()

// Enable/disable profiling
profiler.enable()
profiler.disable()

// Get raw metrics object
profiler.getMetrics()
```

### 3. Console Logs

During analysis, you'll see detailed logs:

**Per-file metrics:**
```
📊 [song.mp3] ✅ CACHE HIT (memory)
   Total: 150ms | Decode: 0ms | Analysis: 0ms
```

**Worker metrics:**
```
[Worker] ✅ Essentia WASM initialized in 250ms
[Worker] ⏱️  Analysis breakdown: preprocess=50ms, rhythm=200ms, key=150ms, spectral=30ms, total=450ms
```

**Cache metrics:**
```
⚡ Memory cache hit for: song.mp3 (2.5ms)
💾 IndexedDB cache hit for: song.mp3 (15.3ms)
❌ Cache miss for: song.mp3 (18.7ms)
```

**Final summary:**
```
================================================================================
📊 PERFORMANCE PROFILING SUMMARY
================================================================================
Environment: DEPLOYED
CPU Cores: 4
Memory Limit: 4.00 GB
User Agent: Mozilla/5.0...
--------------------------------------------------------------------------------
Total Files: 50
Completed: 50 | Failed: 0
Cache Hits: 10 (20.0%)
--------------------------------------------------------------------------------
TIMING BREAKDOWN (Average per file):
  Total Time:           5234ms
  Cache Check:          15ms (0.3%)
  Metadata Extraction:  120ms (2.3%)
  Audio Decoding:       850ms (16.2%)
  Worker Init:          0ms (0.0%)
  Worker Analysis:      4100ms (78.3%)
  Cache Write:          45ms (0.9%)
  Other/Overhead:       104ms (2.0%)
--------------------------------------------------------------------------------
WORKER STATS:
  Max Concurrent Workers: 4
  Avg Worker Utilization: 85.3%
  Avg Queue Time:         125ms
--------------------------------------------------------------------------------
PERFORMANCE RANGE:
  Fastest File: 3200ms
  Slowest File: 8500ms
================================================================================
```

## Comparing Local vs Deployed

### Step 1: Collect Local Metrics

1. Run locally (`npm run dev`)
2. Upload and analyze a batch of files
3. Wait for analysis to complete
4. Run `profiler.export()` in console
5. Save the downloaded JSON file as `local-metrics.json`

### Step 2: Collect Deployed Metrics

1. Deploy to production
2. Upload and analyze the **same batch of files**
3. Wait for analysis to complete
4. Run `profiler.export()` in console
5. Save the downloaded JSON file as `deployed-metrics.json`

### Step 3: Compare Metrics

Compare the two JSON files side-by-side:

**Key metrics to compare:**

| Metric | What to Look For |
|--------|------------------|
| `avgTotalTime` | Overall slowdown factor |
| `avgAudioDecodingTime` | CPU-bound decoding performance |
| `avgWorkerAnalysisTime` | WASM analysis performance |
| `avgWorkerInitTime` | Worker/WASM initialization overhead |
| `avgCacheCheckTime` / `avgCacheWriteTime` | IndexedDB performance |
| `breakdown.*` | Which phase takes the most time (%) |
| `maxConcurrentWorkers` | Are workers being created? |
| `avgWorkerUtilization` | Are workers staying busy? |

### Step 4: Identify Bottleneck

**Common bottlenecks:**

1. **Worker Analysis >> Local**
   - WASM performance difference
   - CPU throttling on deployed server
   - Network latency loading WASM files

2. **Audio Decoding >> Local**
   - CPU throttling
   - Different audio codec support

3. **Worker Init >> 0ms Local, >> 0ms Deployed**
   - WASM bundle not loading
   - Network latency fetching WASM
   - CORS issues

4. **Cache Write >> Local**
   - IndexedDB quota limits
   - Slower disk I/O on deployed

5. **Low Worker Utilization**
   - Queue bottleneck
   - Worker crashes/failures

## Debugging Specific Issues

### WASM Not Loading

Check browser console for:
```
[Worker] ❌ Essentia init failed: EssentiaExtractor not found
```

**Fix:** Verify WASM files are in `/public/essentia/`

### Workers Not Initializing

Check if `maxConcurrentWorkers` is 0:
```javascript
profiler.getMetrics().maxConcurrentWorkers
```

**Fix:** Check worker creation errors in console

### Cache Not Working

Check cache hit rate:
```javascript
profiler.getMetrics().cacheHitRate
```

If 0%, check:
- IndexedDB quota
- File hash consistency
- Cache validation logic

### Slow Audio Decoding

If `avgAudioDecodingTime` is high (>1000ms):
- Check audio file format (WAV vs MP3 vs FLAC)
- Check file size
- Check CPU throttling

## Advanced: Worker-Level Profiling

The worker itself logs detailed timing:

```javascript
// In worker console logs:
[Worker] ✅ Essentia WASM initialized in 250ms
[Worker] ⏱️  Analysis breakdown:
  - preprocess: 50ms (downsampling, slicing)
  - rhythm: 200ms (BPM detection via Essentia)
  - key: 150ms (key detection via Essentia)
  - spectral: 30ms (energy, spectral features)
  - segments: 20ms (segment creation)
  - total: 450ms
```

This helps identify if the slowdown is in:
- **Rhythm detection** (BPM) - most expensive
- **Key detection** - second most expensive
- **Preprocessing** - audio manipulation

## Tips for Optimization

1. **Enable caching** - Reduces repeat analysis
2. **Use Quick mode** - Analyzes only 15 seconds
3. **Reduce worker count** - If CPU is bottleneck, fewer workers may be faster
4. **Preload WASM** - Ensure WASM bundles are cached
5. **Use smaller audio files** - Less data to decode

## Environment Detection

The profiler automatically detects:

- `local`: localhost or 127.0.0.1
- `deployed`: vercel.app, netlify.app, github.io
- `unknown`: other domains

This is shown in the summary and UI.

## Disabling Profiling

If profiling adds overhead:

```javascript
profiler.disable()
```

Or set in code:
```typescript
getPerformanceProfiler().setEnabled(false)
```

## Support

For issues or questions, check:
1. Browser console for error messages
2. Network tab for WASM loading failures
3. Performance tab for CPU/memory issues
4. IndexedDB storage inspector for cache issues
