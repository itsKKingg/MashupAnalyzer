import { useCallback, useState } from 'react';
import { FolderPlus } from 'lucide-react';

interface FolderDropZoneProps {
  onFolderAdded: (files: File[], folderName?: string) => void;
  isProcessing: boolean;
}

export function FolderDropZone({ onFolderAdded, isProcessing }: FolderDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setIsScanning(true);
      setScanProgress(0);

      // Small delay to let UI update
      await new Promise(resolve => setTimeout(resolve, 50));

      const items = e.dataTransfer.items;
      if (!items) {
        setIsScanning(false);
        return;
      }

      const allFiles: File[] = [];
      let folderName: string | undefined;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry?.();
          if (entry) {
            if (entry.isDirectory) {
              folderName = entry.name;
              const files = await scanDirectoryAsync(entry, (current, total) => {
                setScanProgress(Math.round((current / Math.max(total, 1)) * 100));
              });
              allFiles.push(...files);
            } else {
              const file = item.getAsFile();
              if (file && isAudioFile(file)) {
                allFiles.push(file);
              }
            }
          }
        }
      }

      setIsScanning(false);
      setScanProgress(0);

      if (allFiles.length > 0) {
        onFolderAdded(allFiles, folderName);
      }
    },
    [onFolderAdded]
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      const audioFiles = files.filter(isAudioFile);
      
      if (audioFiles.length > 0) {
        setIsScanning(true);
        setScanProgress(0);
        
        // Extract folder name from first file's path
        let folderName: string | undefined;
        if (audioFiles[0].webkitRelativePath) {
          const pathParts = audioFiles[0].webkitRelativePath.split('/');
          folderName = pathParts[0];
        }
        
        // Simulate scanning progress for visual feedback
        for (let i = 0; i <= 100; i += 20) {
          setScanProgress(i);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        setIsScanning(false);
        setScanProgress(0);
        onFolderAdded(audioFiles, folderName);
      }
      
      // Reset input
      e.target.value = '';
    },
    [onFolderAdded]
  );

  const disabled = isProcessing || isScanning;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative
        flex-shrink-0 w-80 h-full min-h-[400px] flex flex-col items-center justify-center
        border-2 border-dashed rounded-xl transition-all
        ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-105'
            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Hide label during drag to allow drop events through */}
      {!isScanning && !disabled && !isDragging && (
        <label className="absolute inset-0 w-full h-full cursor-pointer z-10">
          <input
            type="file"
            /* @ts-ignore - webkitdirectory is non-standard but widely supported */
            webkitdirectory=""
            directory=""
            multiple
            onChange={handleFileInput}
            className="hidden"
            title="Click to select folder or drag folder here"
          />
        </label>
      )}

      <div className="p-6 text-center pointer-events-none z-20 relative">
        {isScanning ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 border-4 border-indigo-200 dark:border-indigo-800 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-600 dark:border-indigo-400 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Scanning Folder...
            </h3>
            <div className="w-full max-w-xs mx-auto mb-2">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {scanProgress}% complete
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
              <FolderPlus className="text-indigo-600 dark:text-indigo-400" size={32} />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Add Folder
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              Drop a folder here or click to browse
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// Helper: Async directory scanner with progress (non-blocking)
async function scanDirectoryAsync(
  entry: any,
  onProgress: (current: number, total: number) => void
): Promise<File[]> {
  const allFiles: File[] = [];
  const queue: any[] = [entry];
  let processedCount = 0;
  let totalEstimate = 1;

  while (queue.length > 0) {
    const currentEntry = queue.shift();

    if (currentEntry.isFile) {
      const file = await new Promise<File | null>((resolve) => {
        currentEntry.file((f: File) => resolve(f), () => resolve(null));
      });

      if (file && isAudioFile(file)) {
        allFiles.push(file);
      }

      processedCount++;
      onProgress(processedCount, totalEstimate);

      // Yield to browser every 10 files
      if (processedCount % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    } else if (currentEntry.isDirectory) {
      const entries = await readDirectoryEntries(currentEntry);
      queue.push(...entries);
      totalEstimate += entries.length;
      onProgress(processedCount, totalEstimate);
    }
  }

  return allFiles;
}

// Helper: Read directory entries (async)
function readDirectoryEntries(dirEntry: any): Promise<any[]> {
  return new Promise((resolve) => {
    const dirReader = dirEntry.createReader();
    const entries: any[] = [];

    const readBatch = () => {
      dirReader.readEntries(
        (batch: any[]) => {
          if (batch.length === 0) {
            resolve(entries);
          } else {
            entries.push(...batch);
            readBatch(); // Continue reading
          }
        },
        () => resolve(entries) // Error: return what we have
      );
    };

    readBatch();
  });
}

// Helper: Check if file is audio
function isAudioFile(file: File): boolean {
  return (
    file.type.startsWith('audio/') ||
    /\.(mp3|wav|m4a|flac|ogg|aac|wma|aiff|alac)$/i.test(file.name)
  );
}