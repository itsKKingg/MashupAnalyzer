import { Clock, CheckCircle, XCircle, Loader, Zap, Timer, X } from 'lucide-react';
import { QueueItem } from '../utils/queueManager';
import { useState, useEffect } from 'react';

interface UploadProgressProps {
  queue: QueueItem[];
  workerStats?: {
    total: number;
    busy: number;
    available: number;
    queued: number;
  };
  onCancel?: () => void; // 🆕 NEW!
}

export function UploadProgress({ queue, workerStats, onCancel }: UploadProgressProps) {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [avgTimePerFile, setAvgTimePerFile] = useState<number | null>(null);

  const pending = queue.filter(item => item.status === 'pending').length;
  const processing = queue.filter(item => item.status === 'processing').length;
  const completed = queue.filter(item => item.status === 'completed').length;
  const failed = queue.filter(item => item.status === 'failed').length;
  const total = queue.length;

  // Track start time
  useEffect(() => {
    if (startTime === null && total > 0) {
      setStartTime(Date.now());
    }
  }, [total]);

  // Calculate average time per file
  useEffect(() => {
    if (completed > 0 && startTime) {
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      const avg = elapsed / completed;
      setAvgTimePerFile(avg);
    }
  }, [completed, startTime]);

  // Calculate ETA
  const calculateETA = () => {
    if (!avgTimePerFile || pending + processing === 0) return null;
    
    const remainingFiles = pending + processing;
    const estimatedSeconds = Math.ceil(remainingFiles * avgTimePerFile);
    
    if (estimatedSeconds < 60) {
      return `~${estimatedSeconds}s`;
    } else if (estimatedSeconds < 3600) {
      const mins = Math.ceil(estimatedSeconds / 60);
      return `~${mins}m`;
    } else {
      const hours = Math.floor(estimatedSeconds / 3600);
      const mins = Math.ceil((estimatedSeconds % 3600) / 60);
      return `~${hours}h ${mins}m`;
    }
  };

  const handleQuickCancel = () => {
    const inProgress = pending + processing;
    
    if (inProgress === 0 || !onCancel) return;

    const confirmed = window.confirm(
      `Cancel ${inProgress} remaining file${inProgress !== 1 ? 's' : ''}?`
    );

    if (confirmed) {
      onCancel();
    }
  };

  if (queue.length === 0) return null;

  const overallProgress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const eta = calculateETA();
  const processingItems = queue.filter(item => item.status === 'processing');
  const canCancel = (pending + processing) > 0 && onCancel;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Analysis Progress
            </h3>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>
                {completed} / {total} completed
              </span>
              {eta && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Timer size={12} />
                    <span>ETA: {eta}</span>
                  </div>
                </>
              )}
              {avgTimePerFile && (
                <>
                  <span>•</span>
                  <span>Avg: {avgTimePerFile.toFixed(1)}s/file</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Worker Status */}
            {workerStats && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Zap className="text-blue-600 dark:text-blue-400" size={16} />
                <div className="text-xs">
                  <span className="font-semibold text-blue-700 dark:text-blue-300">
                    {workerStats.busy}/{workerStats.total}
                  </span>
                  <span className="text-blue-600 dark:text-blue-400 ml-1">
                    workers
                  </span>
                </div>
              </div>
            )}

            {/* 🆕 Quick Cancel Button */}
            {canCancel && (
              <button
                onClick={handleQuickCancel}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors group"
                title="Cancel analysis"
              >
                <X 
                  size={18} 
                  className="text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" 
                />
              </button>
            )}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-white drop-shadow-md">
              {overallProgress}%
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-yellow-600 dark:text-yellow-400">
              <Clock size={14} />
              <span className="text-sm font-semibold">{pending}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Pending</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
              <Loader size={14} className="animate-spin" />
              <span className="text-sm font-semibold">{processing}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Processing</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle size={14} />
              <span className="text-sm font-semibold">{completed}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Done</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400">
              <XCircle size={14} />
              <span className="text-sm font-semibold">{failed}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Failed</div>
          </div>
        </div>
      </div>

      {/* Currently Processing Files */}
      {processingItems.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-800">
          <div className="px-4 py-2">
            <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">
              🔥 Currently Processing ({processingItems.length})
            </div>
            <div className="space-y-2">
              {processingItems.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-5 h-5 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {item.file.name}
                    </div>
                    <div className="mt-0.5">
                      <div className="h-1 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 min-w-[35px] text-right">
                    {item.progress}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Queue Items (pending files) */}
      {pending > 0 && (
        <div className="max-h-48 overflow-y-auto">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/30">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              ⏳ Waiting in Queue ({pending})
            </div>
          </div>
          {queue
            .filter(item => item.status === 'pending')
            .slice(0, 8)
            .map(item => (
              <div
                key={item.id}
                className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <Clock className="text-gray-400 flex-shrink-0" size={14} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {item.file.name}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    Waiting...
                  </div>
                </div>
              </div>
            ))}
          
          {pending > 8 && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 text-center border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                + {pending - 8} more files in queue
              </p>
            </div>
          )}
        </div>
      )}

      {/* Failed Items */}
      {failed > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 border-t border-red-100 dark:border-red-800">
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-300">
              <XCircle size={14} />
              <span>{failed} file{failed !== 1 ? 's' : ''} failed</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}