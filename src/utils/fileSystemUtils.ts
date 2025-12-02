// src/utils/fileSystemUtils.ts
// iOS/Safari folder upload compatibility utilities

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

/**
 * Detect if the current platform is iOS (iPhone/iPad)
 */
export function isIOS(): boolean {
  // Check for iOS devices
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';
  
  // Check for iPhone, iPad, iPod
  const isAppleDevice = /iphone|ipad|ipod/.test(userAgent) || 
                        /iphone|ipad|ipod/.test(platform);
  
  // Check for iPad on iOS 13+ (reports as MacIntel)
  const isIPadOS = platform === 'macintel' && navigator.maxTouchPoints > 1;
  
  return isAppleDevice || isIPadOS;
}

/**
 * Detect if the current browser is Safari
 */
export function isSafari(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  return /^((?!chrome|android).)*safari/i.test(userAgent);
}

/**
 * Check if drag-and-drop is fully supported (not on iOS/Safari)
 */
export function supportsDragAndDrop(): boolean {
  return !isIOS();
}

// ============================================================================
// AUDIO FILE DETECTION
// ============================================================================

/**
 * Check if a file is an audio file
 */
function isAudioFile(file: File): boolean {
  if (!file || !file.name) return false;
  
  const audioExtensions = [
    '.mp3', '.wav', '.flac', '.m4a', '.aac',
    '.ogg', '.wma', '.aiff', '.alac', '.opus'
  ];

  const fileName = file.name.toLowerCase();
  return (
    file.type.startsWith('audio/') ||
    audioExtensions.some(ext => fileName.endsWith(ext))
  );
}

// ============================================================================
// FILE READER WITH TIMEOUT
// ============================================================================

/**
 * Promise-wrapped FileReader with timeout support (for iOS throttling)
 */
function readFileWithTimeout(fileEntry: any, timeoutMs: number = 10000): Promise<File | null> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('File read timeout'));
    }, timeoutMs);

    try {
      fileEntry.file(
        (file: File) => {
          clearTimeout(timer);
          resolve(file);
        },
        (error: any) => {
          clearTimeout(timer);
          console.error('Error reading file:', error);
          resolve(null);
        }
      );
    } catch (error) {
      clearTimeout(timer);
      console.error('Exception in readFileWithTimeout:', error);
      resolve(null);
    }
  });
}

// ============================================================================
// PATH SYNTHESIS FOR SAFARI
// ============================================================================

/**
 * Synthesize webkitRelativePath for Safari when it's missing
 */
function synthesizePath(file: File, basePath: string = ''): File {
  // If file already has a valid path, keep it
  if (file.webkitRelativePath && file.webkitRelativePath !== '') {
    return file;
  }

  // Synthesize path: basePath/filename
  const syntheticPath = basePath ? `${basePath}/${file.name}` : file.name;
  
  Object.defineProperty(file, 'webkitRelativePath', {
    value: syntheticPath,
    writable: false,
    configurable: true,
  });

  return file;
}

// ============================================================================
// DIRECTORY ENTRY RECURSION (Drag-and-Drop API)
// ============================================================================

/**
 * Recursively read all files from a directory entry with progress tracking
 */
async function readDirectoryEntry(
  dirEntry: any,
  currentPath: string,
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
        const file = await readFileWithTimeout(entry);

        if (file && isAudioFile(file)) {
          // Set webkitRelativePath with the full path
          const fullPath = `${path}/${file.name}`;
          
          Object.defineProperty(file, 'webkitRelativePath', {
            value: fullPath,
            writable: false,
            configurable: true,
          });

          allFiles.push(file);
        }
      } catch (error) {
        console.warn('Failed to read file entry:', entry.name, error);
      }

      processedCount++;
      onProgress(processedCount, totalEstimate);

      // Yield every 10 files using requestAnimationFrame for smoother UI
      if (processedCount % 10 === 0) {
        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
      }
    } else if (entry.isDirectory) {
      try {
        const entries = await readDirectoryEntries(entry);
        
        // Add subdirectory entries with updated path
        const subPath = `${path}/${entry.name}`;
        queue.push(...entries.map(e => ({ entry: e, path: subPath })));
        
        totalEstimate += entries.length;
        onProgress(processedCount, totalEstimate);
      } catch (error) {
        console.warn('Failed to read directory:', entry.name, error);
      }

      // Yield after each directory
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    }
  }

  return allFiles;
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

// ============================================================================
// PUBLIC API: UNIFIED FOLDER PROCESSING
// ============================================================================

export interface FolderProcessOptions {
  onProgress?: (current: number, total: number) => void;
  useFallback?: boolean; // Set to true when using iOS/Safari fallback mode
}

/**
 * Process dropped items (files and folders) from drag-and-drop
 * Handles both FileSystemEntry API and FileList fallback
 */
export async function processDroppedItems(
  dataTransfer: DataTransfer,
  options: FolderProcessOptions = {}
): Promise<File[]> {
  const { onProgress, useFallback } = options;
  const items = dataTransfer.items;
  const files = dataTransfer.files;
  const allFiles: File[] = [];

  console.log(`📁 Processing dropped items (iOS fallback: ${useFallback ? 'YES' : 'NO'})`);
  console.log(`Items available: ${items?.length || 0}, Files available: ${files?.length || 0}`);

  // Try to use FileSystemEntry API first (modern browsers, desktop)
  if (!useFallback && items && items.length > 0) {
    const entries: any[] = [];
    
    // Capture entries synchronously
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          entries.push(entry);
        }
      }
    }

    console.log(`Captured ${entries.length} entries from drop`);

    // Process entries asynchronously
    for (const entry of entries) {
      if (entry.isDirectory) {
        console.log('📁 Scanning folder:', entry.name);
        const folderFiles = await readDirectoryEntry(
          entry,
          entry.name,
          (current, total) => {
            onProgress?.(current, total);
          }
        );
        allFiles.push(...folderFiles);
        console.log(`✅ Found ${folderFiles.length} audio files in "${entry.name}"`);
      } else if (entry.isFile) {
        const file = await readFileWithTimeout(entry);
        if (file && isAudioFile(file)) {
          // For individual files, set path to just the filename
          synthesizePath(file, '');
          allFiles.push(file);
        }
      }
    }
  }

  // Fallback: Use FileList (Safari/iOS or if FileSystemEntry API failed)
  if (allFiles.length === 0 && files && files.length > 0) {
    console.log('Using FileList fallback');
    const fileArray = await processFileList(files, options);
    allFiles.push(...fileArray);
  }

  console.log(`📦 Total audio files processed: ${allFiles.length}`);
  return allFiles;
}

/**
 * Process files from FileList (file input or iOS fallback)
 * Synthesizes folder paths when webkitRelativePath is missing (Safari bug)
 */
export async function processFileList(
  fileList: FileList,
  options: FolderProcessOptions = {}
): Promise<File[]> {
  const { onProgress } = options;
  const files = Array.from(fileList);
  const audioFiles: File[] = [];
  
  console.log(`📄 Processing FileList: ${files.length} files`);

  // Group files by their folder path to extract folder structure
  const folderMap = new Map<string, string>();
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Progress update with requestAnimationFrame yield
    if (i % 10 === 0) {
      onProgress?.(i, files.length);
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    }

    if (!isAudioFile(file)) {
      continue;
    }

    // Synthesize webkitRelativePath if missing (Safari bug)
    if (!file.webkitRelativePath || file.webkitRelativePath === '') {
      // Try to infer folder structure from file name or use a default
      const syntheticPath = file.name;
      Object.defineProperty(file, 'webkitRelativePath', {
        value: syntheticPath,
        writable: false,
        configurable: true,
      });
      console.log(`⚠️ Synthesized path for Safari: ${syntheticPath}`);
    }

    audioFiles.push(file);
  }

  // Final progress update
  onProgress?.(files.length, files.length);

  console.log(`✅ Found ${audioFiles.length} audio files from FileList`);
  return audioFiles;
}

/**
 * Process files from file input button (handles both single files and folders)
 */
export async function processFileInput(
  files: FileList,
  options: FolderProcessOptions = {}
): Promise<File[]> {
  console.log(`🔘 Processing file input: ${files.length} files`);
  return processFileList(files, options);
}
