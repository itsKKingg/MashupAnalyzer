// src/components/PerformanceMetrics.tsx
import { useState, useEffect } from 'react';
import { Activity, Download, RotateCcw, Eye, EyeOff, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { getPerformanceProfiler, resetPerformanceProfiler, AggregatedMetrics } from '../utils/performanceProfiler';
import { getWorkerPool, terminateWorkerPool } from '../utils/workerPool';

export function PerformanceMetrics() {
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [workerStats, setWorkerStats] = useState<any>(null);

  const refreshMetrics = () => {
    const profiler = getPerformanceProfiler();
    const agg = profiler.getAggregatedMetrics();
    setMetrics(agg);
    setIsEnabled(profiler.isEnabled());
    
    // Get worker pool stats
    try {
      const workerPool = getWorkerPool();
      const stats = workerPool?.getStats();
      setWorkerStats(stats);
    } catch (e) {
      // Worker pool might not be initialized
      setWorkerStats(null);
    }
  };

  useEffect(() => {
    refreshMetrics();
    const interval = setInterval(refreshMetrics, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const handleReset = () => {
    resetPerformanceProfiler();
    refreshMetrics();
  };

  const handleExport = () => {
    const profiler = getPerformanceProfiler();
    const data = profiler.exportMetrics();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleEnabled = () => {
    const profiler = getPerformanceProfiler();
    profiler.setEnabled(!isEnabled);
    setIsEnabled(!isEnabled);
  };

  const handleRestartWorkers = () => {
    console.log('🔄 Manually restarting worker pool...');
    terminateWorkerPool();
    
    // Force re-initialization by triggering a refresh
    setTimeout(() => {
      refreshMetrics();
    }, 1000);
  };

  if (!metrics || metrics.totalFiles === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-3">
          <Activity className="text-purple-600 dark:text-purple-400" size={20} />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">Performance Profiling</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              No data yet. Upload and analyze tracks to see performance metrics.
            </p>
          </div>
          <button
            onClick={toggleEnabled}
            className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
            title={isEnabled ? 'Disable profiling' : 'Enable profiling'}
          >
            {isEnabled ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Activity className="text-purple-600 dark:text-purple-400" size={20} />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Performance Profiling</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Environment: <span className="font-medium uppercase">{metrics.environment}</span> • {metrics.cores} cores
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleEnabled}
            className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
            title={isEnabled ? 'Disable profiling' : 'Enable profiling'}
          >
            {isEnabled ? <Eye size={18} className="text-green-600" /> : <EyeOff size={18} className="text-gray-400" />}
          </button>
          <button
            onClick={handleRestartWorkers}
            className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
            title="Restart workers"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={handleReset}
            className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
            title="Reset metrics"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={handleExport}
            className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
            title="Export metrics"
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            {isExpanded ? 'Hide' : 'Details'}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400">Files</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{metrics.totalFiles}</div>
          <div className="text-xs text-green-600 dark:text-green-400">
            {metrics.completedFiles} completed
          </div>
        </div>
        
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400">Cache Hit Rate</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{metrics.cacheHitRate.toFixed(1)}%</div>
          <div className="text-xs text-purple-600 dark:text-purple-400">
            {metrics.cacheHits} hits
          </div>
        </div>
        
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400">Avg Time</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {(metrics.avgTotalTime / 1000).toFixed(1)}s
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400">
            per file
          </div>
        </div>
        
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400">Workers</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{metrics.maxConcurrentWorkers}</div>
          <div className="text-xs text-orange-600 dark:text-orange-400">
            {metrics.avgWorkerUtilization.toFixed(0)}% avg util
          </div>
          {workerStats && (
            <div className="mt-1">
              {workerStats.unhealthy > 0 ? (
                <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle size={12} />
                  {workerStats.unhealthy} unhealthy
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle size={12} />
                  All healthy
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="space-y-3 border-t border-purple-200 dark:border-purple-800 pt-3">
          {/* Time Breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Time Breakdown (avg per file)</h4>
            <div className="space-y-2">
              <TimeBreakdownBar label="Cache Check" time={metrics.avgCacheCheckTime} percentage={metrics.breakdown.cacheCheck} color="bg-blue-500" />
              <TimeBreakdownBar label="Metadata" time={metrics.avgMetadataExtractionTime} percentage={metrics.breakdown.metadataExtraction} color="bg-green-500" />
              <TimeBreakdownBar label="Audio Decode" time={metrics.avgAudioDecodingTime} percentage={metrics.breakdown.audioDecoding} color="bg-yellow-500" />
              <TimeBreakdownBar label="Worker Init" time={metrics.avgWorkerInitTime} percentage={metrics.breakdown.workerInit} color="bg-orange-500" />
              <TimeBreakdownBar label="Analysis" time={metrics.avgWorkerAnalysisTime} percentage={metrics.breakdown.workerAnalysis} color="bg-red-500" />
              <TimeBreakdownBar label="Cache Write" time={metrics.avgCacheWriteTime} percentage={metrics.breakdown.cacheWrite} color="bg-purple-500" />
            </div>
          </div>

          {/* Performance Range */}
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Performance Range</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Fastest File</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {(metrics.minTotalTime / 1000).toFixed(2)}s
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Slowest File</div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {(metrics.maxTotalTime / 1000).toFixed(2)}s
                </div>
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">System Info</h4>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <div>Environment: <span className="font-medium">{metrics.environment}</span></div>
              <div>CPU Cores: <span className="font-medium">{metrics.cores}</span></div>
              {metrics.memory && (
                <div>Memory Limit: <span className="font-medium">{(metrics.memory / 1e9).toFixed(2)} GB</span></div>
              )}
              <div className="text-[10px] break-all">UA: {metrics.userAgent}</div>
            </div>
          </div>

          {/* Worker Health Details */}
          {workerStats && (
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Worker Health</h4>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <div>Total Workers: <span className="font-medium">{workerStats.total}</span></div>
                <div>Healthy: <span className="font-medium text-green-600">{workerStats.healthy}</span></div>
                <div>Busy: <span className="font-medium text-blue-600">{workerStats.busy}</span></div>
                <div>Available: <span className="font-medium text-green-600">{workerStats.available}</span></div>
                <div>Queued Tasks: <span className="font-medium text-orange-600">{workerStats.queued}</span></div>
                <div>Total Tasks Processed: <span className="font-medium">{workerStats.totalTasks}</span></div>
                <div>Avg Restarts: <span className="font-medium">{workerStats.avgRestarts}</span></div>
                
                {workerStats.workers && workerStats.workers.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="font-medium mb-1">Individual Workers:</div>
                    {workerStats.workers.map((worker: any, i: number) => (
                      <div key={i} className="flex justify-between items-center py-1">
                        <span>Worker {worker.index}:</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            worker.healthy 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {worker.healthy ? 'Healthy' : 'Unhealthy'}
                          </span>
                          {worker.busy && (
                            <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              Busy
                            </span>
                          )}
                          <span className="text-gray-500">
                            {worker.tasks} tasks, {worker.restarts} restarts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TimeBreakdownBar({ label, time, percentage, color }: { label: string; time: number; percentage: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-gray-900 dark:text-white font-medium">
          {time.toFixed(0)}ms ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`${color} h-full transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
