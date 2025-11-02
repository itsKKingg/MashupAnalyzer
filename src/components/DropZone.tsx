// src/components/DropZone.tsx
// ✅ UPDATED: Only the scanDirectoryEntry function needs changes

import { useCallback, useState } from 'react';
import { Upload, FolderOpen } from 'lucide-react';

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  isProcessing: boolean;
}

export function DropZone({ onFilesAdded, isProcessing }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 1 });

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (isScanning || isProcessing) {
        console.log('Already processing, ignoring drop');
        return;
      }

      console.log('Drop detected, starting scan...');

      // CRITICAL: Access DataTransfer IMMEDIATELY before any await
      const items = e.dataTransfer?.items;
      const files = e.dataTransfer?.files;

      console.log('Items available:', items?.length || 0);
      console.log('Files available:', files?.length || 0);

      // Convert to entries array SYNCHRONOUSLY
      const entries: any[] = [];
      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === 'file') {
            const entry = item.webkitGetAsEntry?.();
            if (entry) {
              entries.push(entry);
              console.log(
                `Entry ${i}: ${entry.name}, isDirectory: ${entry.isDirectory}`
              );
            }
          }
        }
      }

      console.log(`Captured ${entries.length} entries before async processing`);

      // NOW we can go async
      setIsScanning(true);
      setScanProgress({ current: 0, total: 1 });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const allFiles: File[] = [];

      if (entries.length > 0) {
        // Process entries (supports folders)
        console.log(`Processing ${entries.length} entries...`);

        for (const entry of entries) {
          if (entry.isDirectory) {
            console.log('📁 Scanning folder:', entry.name);
            // ✅ Pass the root folder name as the base path
            const folderFiles = await scanDirectoryEntry(
              entry,
              entry.name, // ✅ NEW: Pass folder name as base path
              (current, total) => {
                setScanProgress({ current, total });
              }
            );
            allFiles.push(...folderFiles);
            console.log(`✅ Found ${folderFiles.length} files in "${entry.name}"`);
          } else if (entry.isFile) {
            const file = await getFileFromEntry(entry);
            if (file && isAudioFile(file)) {
              // ✅ For individual files, set path to just the filename
              Object.defineProperty(file, 'webkitRelativePath', {
                value: file.name,
                writable: false,
                configurable: true,
              });
              allFiles.push(file);
            }
          }
        }
      } else if (files && files.length > 0) {
        // Fallback: direct files only
        console.log('Fallback: using files array');
        const fileArray = Array.from(files).filter(isAudioFile);
        allFiles.push(...fileArray);
      } else {
        console.warn('No items or files detected in drop event');
      }

      // Filter out any null/undefined values before passing
      const validFiles = allFiles.filter((file): file is File => {
        if (!file) {
          console.warn('Null file detected, filtering out');
          return false;
        }
        if (!(file instanceof File)) {
          console.warn('Invalid file object, filtering out:', file);
          return false;
        }
        if (!file.name || file.size === undefined) {
          console.warn('File missing name or size, filtering out:', file);
          return false;
        }
        return true;
      });

      console.log(`✅ Scan complete. Found ${validFiles.length} valid audio files`);

      setIsScanning(false);
      setScanProgress({ current: 0, total: 1 });

      if (validFiles.length > 0) {
        onFilesAdded(validFiles);
      } else {
        console.warn('No valid audio files found');
      }
    },
    [onFilesAdded, isScanning, isProcessing]
  );

  const handleFileClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (isProcessing || isScanning) return;

      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'audio/*';

      input.onchange = (event: Event) => {
        const target = event.target as HTMLInputElement;
        const files = target.files ? Array.from(target.files) : [];
        const audioFiles = files.filter((f): f is File => 
          f !== null && f !== undefined && isAudioFile(f)
        );

        if (audioFiles.length > 0) {
          onFilesAdded(audioFiles);
        }
      };

      input.click();
    },
    [onFilesAdded, isProcessing, isScanning]
  );

  const handleFolderClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (isProcessing || isScanning) return;

      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'audio/*';

      // Enable folder selection
      (input as any).webkitdirectory = true;
      (input as any).directory = true;

      input.onchange = (event: Event) => {
        const target = event.target as HTMLInputElement;
        const files = target.files ? Array.from(target.files) : [];
        const audioFiles = files.filter((f): f is File => 
          f !== null && f !== undefined && isAudioFile(f)
        );

        console.log(
          `Folder selected via button: ${audioFiles.length} audio files found`
        );

        if (audioFiles.length > 0) {
          onFilesAdded(audioFiles);
        }
      };

      input.click();
    },
    [onFilesAdded, isProcessing, isScanning]
  );

  const progressPercent = Math.round(
    (scanProgress.current / Math.max(scanProgress.total, 1)) * 100
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300
        ${
          isDragging
            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-[1.02] shadow-lg'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
        }
        ${isProcessing || isScanning ? 'opacity-50' : 'cursor-pointer'}
      `}
    >
      {isScanning ? (
        // Scanning State
        <>
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 dark:border-blue-400 rounded-full border-t-transparent animate-spin"></div>
          </div>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Scanning Folders...
          </h3>

          {/* Progress Bar */}
          <div className="max-w-xs mx-auto mb-3">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400">
            Found {scanProgress.current} audio files • {progressPercent}%
          </p>
        </>
      ) : (
        // Default State
        <>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Upload className="text-blue-600 dark:text-blue-400" size={32} />
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <FolderOpen
                className="text-purple-600 dark:text-purple-400"
                size={32}
              />
            </div>
          </div>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Drop files or folders here
          </h3>

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            or click to browse your library
          </p>

          {/* Buttons */}
          <div className="flex gap-3 justify-center mb-6">
            <button
              onClick={handleFileClick}
              disabled={isProcessing || isScanning}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={16} />
              Choose Files
            </button>

            <button
              onClick={handleFolderClick}
              disabled={isProcessing || isScanning}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FolderOpen size={16} />
              Choose Folder
            </button>
          </div>

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Supports:
              </span>{' '}
              MP3, WAV, M4A, FLAC, OGG, AAC, WMA, AIFF
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              💡 Drag & drop folders or use "Choose Folder" button to upload
              entire folders
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * ✅ UPDATED: Scan directory entry recursively WITH PATH TRACKING
 */
async function scanDirectoryEntry(
  dirEntry: any,
  currentPath: string, // ✅ NEW: Track the current path
  onProgress: (current: number, total: number) => void
): Promise<File[]> {
  const allFiles: File[] = [];
  const queue: Array<{ entry: any; path: string }> = [{ entry: dirEntry, path: currentPath }];
  let processedCount = 0;
  let totalEstimate = 1;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const { entry, path } = current;

    if (entry.isFile) {
      try {
        const file = await getFileFromEntry(entry);

        if (file && isAudioFile(file)) {
          // ✅ NEW: Set webkitRelativePath with the full path
          const fullPath = `${path}/${file.name}`;
          
          Object.defineProperty(file, 'webkitRelativePath', {
            value: fullPath,
            writable: false,
            configurable: true,
          });

          allFiles.push(file);
          console.log('📄 Found audio file:', fullPath);
        }
      } catch (error) {
        console.warn('Failed to read file entry:', entry.name, error);
      }

      processedCount++;
      onProgress(processedCount, totalEstimate);

      // Yield every 10 files
      if (processedCount % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } else if (entry.isDirectory) {
      try {
        const entries = await readDirectoryEntries(entry);
        console.log(
          `📁 Directory "${entry.name}" contains ${entries.length} entries`
        );

        // ✅ NEW: Add subdirectory entries with updated path
        const subPath = `${path}/${entry.name}`;
        queue.push(...entries.map(e => ({ entry: e, path: subPath })));
        
        totalEstimate += entries.length;
        onProgress(processedCount, totalEstimate);
      } catch (error) {
        console.warn('Failed to read directory:', entry.name, error);
      }

      // Yield after each directory
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return allFiles;
}

/**
 * Get File from FileSystemFileEntry
 */
function getFileFromEntry(fileEntry: any): Promise<File | null> {
  return new Promise((resolve) => {
    try {
      fileEntry.file(
        (file: File) => resolve(file),
        (error: any) => {
          console.error('Error reading file:', error);
          resolve(null);
        }
      );
    } catch (error) {
      console.error('Exception in getFileFromEntry:', error);
      resolve(null);
    }
  });
}

/**
 * Read directory entries (handles pagination)
 */
function readDirectoryEntries(dirEntry: any): Promise<any[]> {
  return new Promise((resolve) => {
    try {
      const dirReader = dirEntry.createReader();
      const entries: any[] = [];

      const readBatch = () => {
        dirReader.readEntries(
          (batch: any[]) => {
            if (batch.length === 0) {
              resolve(entries);
            } else {
              entries.push(...batch);
              readBatch(); // Continue reading (pagination)
            }
          },
          (error: any) => {
            console.error('Error reading directory:', error);
            resolve(entries); // Return what we have
          }
        );
      };

      readBatch();
    } catch (error) {
      console.error('Exception in readDirectoryEntries:', error);
      resolve([]);
    }
  });
}

/**
 * Check if file is audio
 */
function isAudioFile(file: File): boolean {
  if (!file || !file.name) return false;
  
  return (
    file.type.startsWith('audio/') ||
    /\.(mp3|wav|m4a|flac|ogg|aac|wma|aiff|alac)$/i.test(file.name)
  );
}