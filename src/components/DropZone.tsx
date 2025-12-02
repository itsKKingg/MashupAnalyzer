// src/components/DropZone.tsx
// iOS/Safari compatible folder upload with fallback picker mode

import { useCallback, useState, useEffect } from 'react';
import { Upload, FolderOpen, Smartphone } from 'lucide-react';
import {
  isIOS,
  supportsDragAndDrop,
  processDroppedItems,
  processFileInput,
} from '../utils/fileSystemUtils';

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  isProcessing: boolean;
}

export function DropZone({ onFilesAdded, isProcessing }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 1 });
  const [isiOSDevice, setIsiOSDevice] = useState(false);
  const [dragSupported, setDragSupported] = useState(true);

  useEffect(() => {
    const ios = isIOS();
    const dragOk = supportsDragAndDrop();
    setIsiOSDevice(ios);
    setDragSupported(dragOk);
    
    if (ios) {
      console.log('🍎 iOS device detected - using fallback picker mode');
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!dragSupported) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, [dragSupported]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!dragSupported) return;
    e.preventDefault();
    e.stopPropagation();
  }, [dragSupported]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!dragSupported) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, [dragSupported]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      if (!dragSupported) return;
      
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (isScanning || isProcessing) {
        console.log('Already processing, ignoring drop');
        return;
      }

      console.log('Drop detected, starting scan...');

      const dataTransfer = e.dataTransfer;
      if (!dataTransfer) {
        console.warn('No dataTransfer available');
        return;
      }

      setIsScanning(true);
      setScanProgress({ current: 0, total: 1 });

      try {
        const files = await processDroppedItems(dataTransfer, {
          onProgress: (current, total) => {
            setScanProgress({ current, total });
          },
          useFallback: isiOSDevice,
        });

        console.log(`✅ Scan complete. Found ${files.length} valid audio files`);

        if (files.length > 0) {
          onFilesAdded(files);
        } else {
          console.warn('No valid audio files found');
        }
      } catch (error) {
        console.error('Error processing dropped items:', error);
      } finally {
        setIsScanning(false);
        setScanProgress({ current: 0, total: 1 });
      }
    },
    [onFilesAdded, isScanning, isProcessing, dragSupported, isiOSDevice]
  );

  const handleFileClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();

      if (isProcessing || isScanning) return;

      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'audio/*';

      input.onchange = async (event: Event) => {
        const target = event.target as HTMLInputElement;
        const files = target.files;
        
        if (!files || files.length === 0) return;

        console.log(`📁 File input: ${files.length} files selected`);
        
        setIsScanning(true);
        setScanProgress({ current: 0, total: files.length });

        try {
          const audioFiles = await processFileInput(files, {
            onProgress: (current, total) => {
              setScanProgress({ current, total });
            },
          });

          console.log(`✅ Found ${audioFiles.length} audio files`);

          if (audioFiles.length > 0) {
            onFilesAdded(audioFiles);
          }
        } catch (error) {
          console.error('Error processing file input:', error);
        } finally {
          setIsScanning(false);
          setScanProgress({ current: 0, total: 1 });
        }
      };

      input.click();
    },
    [onFilesAdded, isProcessing, isScanning]
  );

  const handleFolderClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();

      if (isProcessing || isScanning) return;

      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'audio/*';

      // Enable folder selection
      (input as any).webkitdirectory = true;
      (input as any).directory = true;

      input.onchange = async (event: Event) => {
        const target = event.target as HTMLInputElement;
        const files = target.files;
        
        if (!files || files.length === 0) return;

        console.log(`📁 Folder input: ${files.length} files selected (iOS fallback: ${isiOSDevice ? 'YES' : 'NO'})`);
        
        setIsScanning(true);
        setScanProgress({ current: 0, total: files.length });

        try {
          const audioFiles = await processFileInput(files, {
            onProgress: (current, total) => {
              setScanProgress({ current, total });
            },
          });

          console.log(`✅ Found ${audioFiles.length} audio files from folder`);

          if (audioFiles.length > 0) {
            onFilesAdded(audioFiles);
          }
        } catch (error) {
          console.error('Error processing folder input:', error);
        } finally {
          setIsScanning(false);
          setScanProgress({ current: 0, total: 1 });
        }
      };

      input.click();
    },
    [onFilesAdded, isProcessing, isScanning, isiOSDevice]
  );

  const progressPercent = Math.round(
    (scanProgress.current / Math.max(scanProgress.total, 1)) * 100
  );

  return (
    <div
      onDragEnter={dragSupported ? handleDragEnter : undefined}
      onDragOver={dragSupported ? handleDragOver : undefined}
      onDragLeave={dragSupported ? handleDragLeave : undefined}
      onDrop={dragSupported ? handleDrop : undefined}
      className={`
        relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300
        ${
          isDragging && dragSupported
            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-[1.02] shadow-lg'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
        }
        ${isProcessing || isScanning ? 'opacity-50' : dragSupported ? 'cursor-pointer' : ''}
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
            {isiOSDevice ? 'Processing Files...' : 'Scanning Folders...'}
          </h3>

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
            {isiOSDevice ? (
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Smartphone className="text-blue-600 dark:text-blue-400" size={32} />
              </div>
            ) : (
              <>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Upload className="text-blue-600 dark:text-blue-400" size={32} />
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                  <FolderOpen
                    className="text-purple-600 dark:text-purple-400"
                    size={32}
                  />
                </div>
              </>
            )}
          </div>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {isiOSDevice 
              ? 'Tap to choose files or folders'
              : 'Drop files or folders here'
            }
          </h3>

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {isiOSDevice 
              ? 'Use the buttons below to select your audio library'
              : 'or click to browse your library'
            }
          </p>

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
            {isiOSDevice ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                🍎 iOS/Safari mode: Tap "Choose Folder" to select a folder with all subfolders included
              </p>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                💡 Drag & drop folders or use "Choose Folder" button to upload entire folders
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
