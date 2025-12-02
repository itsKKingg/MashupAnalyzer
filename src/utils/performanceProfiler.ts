// src/utils/performanceProfiler.ts
// Comprehensive performance profiling for audio analysis pipeline

export interface PerformanceMetrics {
  // Per-file metrics
  totalTime: number;
  cacheCheckTime: number;
  metadataExtractionTime: number;
  audioDecodingTime: number;
  workerInitTime: number;
  workerAnalysisTime: number;
  cacheWriteTime: number;
  
  // Cache hits
  cacheHit: boolean;
  cacheSource?: 'memory' | 'indexeddb' | 'none';
  
  // Worker stats
  workerQueueTime: number;
  workerCount: number;
  workerUtilization: number;
  
  // File info
  fileName: string;
  fileSize: number;
  duration: number;
  mode: string;
}

export interface AggregatedMetrics {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  cacheHits: number;
  cacheHitRate: number;
  
  // Average times (ms)
  avgTotalTime: number;
  avgCacheCheckTime: number;
  avgMetadataExtractionTime: number;
  avgAudioDecodingTime: number;
  avgWorkerInitTime: number;
  avgWorkerAnalysisTime: number;
  avgCacheWriteTime: number;
  avgWorkerQueueTime: number;
  
  // Min/Max
  minTotalTime: number;
  maxTotalTime: number;
  
  // Worker stats
  avgWorkerUtilization: number;
  maxConcurrentWorkers: number;
  
  // Environment
  environment: 'local' | 'deployed' | 'unknown';
  userAgent: string;
  cores: number;
  memory?: number;
  
  // Timing breakdown (percentage)
  breakdown: {
    cacheCheck: number;
    metadataExtraction: number;
    audioDecoding: number;
    workerInit: number;
    workerAnalysis: number;
    cacheWrite: number;
    other: number;
  };
}

class PerformanceProfiler {
  private enabled: boolean = true; // Enable by default for debugging
  private metrics: PerformanceMetrics[] = [];
  private activeTimers: Map<string, number> = new Map();
  
  // Environment detection
  private environment: 'local' | 'deployed' | 'unknown';
  
  constructor() {
    this.environment = this.detectEnvironment();
    console.log(`📊 Performance Profiler initialized (${this.environment})`);
  }
  
  private detectEnvironment(): 'local' | 'deployed' | 'unknown' {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'local';
    } else if (hostname.includes('vercel.app') || hostname.includes('netlify.app') || hostname.includes('github.io')) {
      return 'deployed';
    }
    return 'unknown';
  }
  
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    console.log(`📊 Performance profiling ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  isEnabled(): boolean {
    return this.enabled;
  }
  
  startTimer(key: string): void {
    if (!this.enabled) return;
    this.activeTimers.set(key, performance.now());
  }
  
  endTimer(key: string): number {
    if (!this.enabled) return 0;
    const start = this.activeTimers.get(key);
    if (start === undefined) {
      console.warn(`⚠️ Timer ${key} was not started`);
      return 0;
    }
    const duration = performance.now() - start;
    this.activeTimers.delete(key);
    return duration;
  }
  
  recordMetrics(metrics: PerformanceMetrics): void {
    if (!this.enabled) return;
    this.metrics.push(metrics);
    
    // Log individual file metrics
    const cacheStatus = metrics.cacheHit ? `✅ CACHE HIT (${metrics.cacheSource})` : '❌ CACHE MISS';
    console.log(`📊 [${metrics.fileName}] ${cacheStatus}`);
    console.log(`   Total: ${metrics.totalTime.toFixed(0)}ms | Decode: ${metrics.audioDecodingTime.toFixed(0)}ms | Analysis: ${metrics.workerAnalysisTime.toFixed(0)}ms`);
  }
  
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }
  
  getAggregatedMetrics(): AggregatedMetrics {
    if (this.metrics.length === 0) {
      return this.getEmptyAggregatedMetrics();
    }
    
    const totalFiles = this.metrics.length;
    const completedFiles = this.metrics.filter(m => m.totalTime > 0).length;
    const failedFiles = totalFiles - completedFiles;
    const cacheHits = this.metrics.filter(m => m.cacheHit).length;
    
    // Calculate averages
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const avg = (arr: number[]) => arr.length > 0 ? sum(arr) / arr.length : 0;
    
    const totalTimes = this.metrics.map(m => m.totalTime);
    const avgTotalTime = avg(totalTimes);
    const avgCacheCheckTime = avg(this.metrics.map(m => m.cacheCheckTime));
    const avgMetadataExtractionTime = avg(this.metrics.map(m => m.metadataExtractionTime));
    const avgAudioDecodingTime = avg(this.metrics.map(m => m.audioDecodingTime));
    const avgWorkerInitTime = avg(this.metrics.map(m => m.workerInitTime));
    const avgWorkerAnalysisTime = avg(this.metrics.map(m => m.workerAnalysisTime));
    const avgCacheWriteTime = avg(this.metrics.map(m => m.cacheWriteTime));
    const avgWorkerQueueTime = avg(this.metrics.map(m => m.workerQueueTime));
    
    // Calculate breakdown percentages
    const totalAvgTime = avgCacheCheckTime + avgMetadataExtractionTime + avgAudioDecodingTime + 
                        avgWorkerInitTime + avgWorkerAnalysisTime + avgCacheWriteTime;
    
    const breakdown = {
      cacheCheck: (avgCacheCheckTime / totalAvgTime) * 100 || 0,
      metadataExtraction: (avgMetadataExtractionTime / totalAvgTime) * 100 || 0,
      audioDecoding: (avgAudioDecodingTime / totalAvgTime) * 100 || 0,
      workerInit: (avgWorkerInitTime / totalAvgTime) * 100 || 0,
      workerAnalysis: (avgWorkerAnalysisTime / totalAvgTime) * 100 || 0,
      cacheWrite: (avgCacheWriteTime / totalAvgTime) * 100 || 0,
      other: 0,
    };
    
    breakdown.other = 100 - (breakdown.cacheCheck + breakdown.metadataExtraction + 
                             breakdown.audioDecoding + breakdown.workerInit + 
                             breakdown.workerAnalysis + breakdown.cacheWrite);
    
    return {
      totalFiles,
      completedFiles,
      failedFiles,
      cacheHits,
      cacheHitRate: (cacheHits / totalFiles) * 100,
      
      avgTotalTime,
      avgCacheCheckTime,
      avgMetadataExtractionTime,
      avgAudioDecodingTime,
      avgWorkerInitTime,
      avgWorkerAnalysisTime,
      avgCacheWriteTime,
      avgWorkerQueueTime,
      
      minTotalTime: Math.min(...totalTimes),
      maxTotalTime: Math.max(...totalTimes),
      
      avgWorkerUtilization: avg(this.metrics.map(m => m.workerUtilization)),
      maxConcurrentWorkers: Math.max(...this.metrics.map(m => m.workerCount)),
      
      environment: this.environment,
      userAgent: navigator.userAgent,
      cores: navigator.hardwareConcurrency || 0,
      memory: (performance as any).memory?.jsHeapSizeLimit,
      
      breakdown,
    };
  }
  
  private getEmptyAggregatedMetrics(): AggregatedMetrics {
    return {
      totalFiles: 0,
      completedFiles: 0,
      failedFiles: 0,
      cacheHits: 0,
      cacheHitRate: 0,
      avgTotalTime: 0,
      avgCacheCheckTime: 0,
      avgMetadataExtractionTime: 0,
      avgAudioDecodingTime: 0,
      avgWorkerInitTime: 0,
      avgWorkerAnalysisTime: 0,
      avgCacheWriteTime: 0,
      avgWorkerQueueTime: 0,
      minTotalTime: 0,
      maxTotalTime: 0,
      avgWorkerUtilization: 0,
      maxConcurrentWorkers: 0,
      environment: this.environment,
      userAgent: navigator.userAgent,
      cores: navigator.hardwareConcurrency || 0,
      memory: (performance as any).memory?.jsHeapSizeLimit,
      breakdown: {
        cacheCheck: 0,
        metadataExtraction: 0,
        audioDecoding: 0,
        workerInit: 0,
        workerAnalysis: 0,
        cacheWrite: 0,
        other: 0,
      },
    };
  }
  
  printSummary(): void {
    if (!this.enabled || this.metrics.length === 0) {
      console.log('📊 No performance metrics recorded');
      return;
    }
    
    const agg = this.getAggregatedMetrics();
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 PERFORMANCE PROFILING SUMMARY');
    console.log('='.repeat(80));
    console.log(`Environment: ${agg.environment.toUpperCase()}`);
    console.log(`CPU Cores: ${agg.cores}`);
    console.log(`Memory Limit: ${agg.memory ? (agg.memory / 1e9).toFixed(2) + ' GB' : 'Unknown'}`);
    console.log(`User Agent: ${agg.userAgent.substring(0, 60)}...`);
    console.log('-'.repeat(80));
    console.log(`Total Files: ${agg.totalFiles}`);
    console.log(`Completed: ${agg.completedFiles} | Failed: ${agg.failedFiles}`);
    console.log(`Cache Hits: ${agg.cacheHits} (${agg.cacheHitRate.toFixed(1)}%)`);
    console.log('-'.repeat(80));
    console.log('TIMING BREAKDOWN (Average per file):');
    console.log(`  Total Time:           ${agg.avgTotalTime.toFixed(0)}ms`);
    console.log(`  Cache Check:          ${agg.avgCacheCheckTime.toFixed(0)}ms (${agg.breakdown.cacheCheck.toFixed(1)}%)`);
    console.log(`  Metadata Extraction:  ${agg.avgMetadataExtractionTime.toFixed(0)}ms (${agg.breakdown.metadataExtraction.toFixed(1)}%)`);
    console.log(`  Audio Decoding:       ${agg.avgAudioDecodingTime.toFixed(0)}ms (${agg.breakdown.audioDecoding.toFixed(1)}%)`);
    console.log(`  Worker Init:          ${agg.avgWorkerInitTime.toFixed(0)}ms (${agg.breakdown.workerInit.toFixed(1)}%)`);
    console.log(`  Worker Analysis:      ${agg.avgWorkerAnalysisTime.toFixed(0)}ms (${agg.breakdown.workerAnalysis.toFixed(1)}%)`);
    console.log(`  Cache Write:          ${agg.avgCacheWriteTime.toFixed(0)}ms (${agg.breakdown.cacheWrite.toFixed(1)}%)`);
    console.log(`  Other/Overhead:       ${((agg.avgTotalTime - agg.avgCacheCheckTime - agg.avgMetadataExtractionTime - agg.avgAudioDecodingTime - agg.avgWorkerInitTime - agg.avgWorkerAnalysisTime - agg.avgCacheWriteTime)).toFixed(0)}ms (${agg.breakdown.other.toFixed(1)}%)`);
    console.log('-'.repeat(80));
    console.log('WORKER STATS:');
    console.log(`  Max Concurrent Workers: ${agg.maxConcurrentWorkers}`);
    console.log(`  Avg Worker Utilization: ${agg.avgWorkerUtilization.toFixed(1)}%`);
    console.log(`  Avg Queue Time:         ${agg.avgWorkerQueueTime.toFixed(0)}ms`);
    console.log('-'.repeat(80));
    console.log('PERFORMANCE RANGE:');
    console.log(`  Fastest File: ${agg.minTotalTime.toFixed(0)}ms`);
    console.log(`  Slowest File: ${agg.maxTotalTime.toFixed(0)}ms`);
    console.log('='.repeat(80) + '\n');
  }
  
  exportMetrics(): string {
    const agg = this.getAggregatedMetrics();
    return JSON.stringify({
      summary: agg,
      detailedMetrics: this.metrics,
      timestamp: new Date().toISOString(),
    }, null, 2);
  }
  
  reset(): void {
    this.metrics = [];
    this.activeTimers.clear();
    console.log('📊 Performance metrics reset');
  }
}

// Singleton instance
let profilerInstance: PerformanceProfiler | null = null;

export function getPerformanceProfiler(): PerformanceProfiler {
  if (!profilerInstance) {
    profilerInstance = new PerformanceProfiler();
  }
  return profilerInstance;
}

export function resetPerformanceProfiler(): void {
  if (profilerInstance) {
    profilerInstance.reset();
  }
}
