// src/utils/fileSystemUtils.ts
// ✅ Helper to read folders from drag-and-drop using FileSystemEntry API

/**
 * Recursively read all files from a directory entry
 */
async function readDirectory(
  directoryEntry: FileSystemDirectoryEntry,
  path: string = ''
): Promise<File[]> {
  const files: File[] = [];
  const reader = directoryEntry.createReader();

  return new Promise((resolve, reject) => {
    const readEntries = () => {
      reader.readEntries(async (entries) => {
        if (entries.length === 0) {
          // Done reading this directory
          resolve(files);
          return;
        }

        // Process all entries
        for (const entry of entries) {
          const fullPath = path ? `${path}/${entry.name}` : entry.name;

          if (entry.isFile) {
            // Get the file
            const file = await new Promise<File>((resolve, reject) => {
              (entry as FileSystemFileEntry).file(resolve, reject);
            });

            // Add webkitRelativePath-like property
            Object.defineProperty(file, 'webkitRelativePath', {
              value: fullPath,
              writable: false,
            });

            // Check if it's an audio file
            if (isAudioFile(file)) {
              files.push(file);
            }
          } else if (entry.isDirectory) {
            // Recursively read subdirectory
            const subFiles = await readDirectory(
              entry as FileSystemDirectoryEntry,
              fullPath
            );
            files.push(...subFiles);
          }
        }

        // Continue reading (directories might return entries in batches)
        readEntries();
      }, reject);
    };

    readEntries();
  });
}

/**
 * Check if a file is an audio file
 */
function isAudioFile(file: File): boolean {
  const audioExtensions = [
    '.mp3', '.wav', '.flac', '.m4a', '.aac',
    '.ogg', '.wma', '.aiff', '.alac', '.opus'
  ];

  const fileName = file.name.toLowerCase();
  return audioExtensions.some(ext => fileName.endsWith(ext));
}

/**
 * Process dropped items (files and folders) from drag-and-drop
 */
export async function processDroppedItems(
  dataTransfer: DataTransfer
): Promise<File[]> {
  const items = Array.from(dataTransfer.items);
  const allFiles: File[] = [];

  console.log('📁 Processing dropped items:', items.length);

  for (const item of items) {
    if (item.kind !== 'file') continue;

    const entry = item.webkitGetAsEntry();
    if (!entry) continue;

    if (entry.isFile) {
      // Single file dropped
      const file = item.getAsFile();
      if (file && isAudioFile(file)) {
        // Add a basic webkitRelativePath (just the filename)
        Object.defineProperty(file, 'webkitRelativePath', {
          value: file.name,
          writable: false,
        });
        allFiles.push(file);
        console.log('📄 File:', file.name);
      }
    } else if (entry.isDirectory) {
      // Folder dropped - recursively read it
      console.log('📁 Reading folder:', entry.name);
      const files = await readDirectory(
        entry as FileSystemDirectoryEntry,
        entry.name
      );
      allFiles.push(...files);
      console.log(`✅ Found ${files.length} audio files in "${entry.name}"`);
    }
  }

  console.log(`📦 Total files processed: ${allFiles.length}`);
  return allFiles;
}

/**
 * Fallback: Process files from FileList (when using file input)
 * This is used when drag-and-drop API isn't available
 */
export function processFileList(fileList: FileList): File[] {
  return Array.from(fileList).filter(isAudioFile);
}