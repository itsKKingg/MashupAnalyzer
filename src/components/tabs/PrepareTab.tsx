import { Upload, FolderOpen, Clock, XCircle } from 'lucide-react';
import { DropZone } from '../DropZone';
import { UploadProgress } from '../UploadProgress';
import { QueueItem } from '../../utils/queueManager';

interface PrepareTabProps {
  onFilesAdded: (files: File[]) => void;
  isProcessing: boolean;
  analyzingCount: number;
  queuedCount?: number;
  uploadQueue?: QueueItem[];
  workerStats?: {
    total: number;
    busy: number;
    available: number;
    queued: number;
  };
  onCancel?: () => void; // 🆕 NEW!
}

export function PrepareTab({
  onFilesAdded,
  isProcessing,
  analyzingCount,
  queuedCount = 0,
  uploadQueue = [],
  workerStats,
  onCancel, // 🆕 NEW!
}: PrepareTabProps) {
  const handleCancel = () => {
    const totalInProgress = uploadQueue.filter(
      item => item.status === 'pending' || item.status === 'processing'
    ).length;

    if (totalInProgress === 0) return;

    const confirmed = window.confirm(
      `Cancel analysis of ${totalInProgress} file${totalInProgress !== 1 ? 's' : ''}?\n\n` +
      `All in-progress and queued tracks will be removed.`
    );

    if (confirmed && onCancel) {
      onCancel();
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Section */}
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
          <Upload className="text-white" size={32} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Upload Your Music
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Drag and drop audio files or entire folders to analyze BPM, musical
          keys, and discover perfect mashup combinations
        </p>
      </div>

      {/* Drop Zone */}
      <DropZone onFilesAdded={onFilesAdded} isProcessing={isProcessing} />

      {/* 🆕 Cancel Button (visible during processing) */}
      {isProcessing && uploadQueue.length > 0 && onCancel && (
        <div className="flex justify-center">
          <button
            onClick={handleCancel}
            className="group px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <XCircle size={20} className="group-hover:rotate-90 transition-transform duration-200" />
            <span>Cancel Analysis</span>
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {uploadQueue.length > 0 && (
        <UploadProgress 
          queue={uploadQueue} 
          workerStats={workerStats}
          onCancel={onCancel} // 🆕 Pass cancel handler
        />
      )}

      {/* Processing Status */}
      {analyzingCount > 0 && uploadQueue.length === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                <Clock
                  className="text-blue-600 dark:text-blue-400 animate-spin"
                  size={24}
                />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Analyzing Tracks...
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Processing {analyzingCount} track
                {analyzingCount !== 1 ? 's' : ''}
                {queuedCount > 0 && ` • ${queuedCount} in queue`}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {analyzingCount}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                active
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-3">
            <Upload className="text-green-600 dark:text-green-400" size={20} />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Drag & Drop
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Drop individual files or entire folders with your music library
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-3">
            <FolderOpen
              className="text-purple-600 dark:text-purple-400"
              size={20}
            />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Bulk Upload
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Upload hundreds of tracks at once - we'll process them in batches
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-3">
            <Clock className="text-blue-600 dark:text-blue-400" size={20} />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Auto-Analysis
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Automatic BPM and key detection for every track you upload
          </p>
        </div>
      </div>

      {/* Supported Formats */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          <span className="font-medium text-gray-900 dark:text-white">
            Supported formats:
          </span>{' '}
          MP3, WAV, M4A, FLAC, OGG, AAC, WMA, AIFF
        </p>
      </div>
    </div>
  );
}