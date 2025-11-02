// src/utils/folderUtils.ts
// ✅ UPDATED: Enhanced cross-folder utilities

/**
 * Extract folder name from file path
 * Examples:
 *   "My Music/House/track.mp3" → "My Music"
 *   "Downloads/track.mp3" → "Downloads"
 *   "track.mp3" → "Uncategorized"
 */
export function extractFolderName(file: File): string {
  // Try to get path from webkitRelativePath (when folder is dropped)
  const path = (file as any).webkitRelativePath || file.name;
  
  const parts = path.split('/');
  
  // If multiple parts, get the folder name (first folder)
  if (parts.length > 1) {
    return parts[0];
  }
  
  return 'Uncategorized';
}

/**
 * Extract full folder path from file
 */
export function extractFolderPath(file: File): string {
  const path = (file as any).webkitRelativePath || file.name;
  const parts = path.split('/');
  
  if (parts.length > 1) {
    // Remove filename, join the rest
    return parts.slice(0, -1).join('/');
  }
  
  return 'Uncategorized';
}

/**
 * Get unique folder names from track list
 */
export function getUniqueFolders(tracks: any[]): string[] {
  const folders = new Set<string>();
  
  tracks.forEach(track => {
    if (track?.folderName) {
      folders.add(track.folderName);
    }
  });
  
  return Array.from(folders).sort();
}

/**
 * Check if two tracks are from different folders
 */
export function isCrossFolder(track1: any, track2: any): boolean {
  if (!track1?.folderName || !track2?.folderName) return false;
  return track1.folderName !== track2.folderName;
}

/**
 * Get folder statistics from file list
 * Use this when files are dropped to show detected folders
 */
export function getFolderStats(files: File[]): Map<string, { count: number; files: string[] }> {
  const folderMap = new Map<string, { count: number; files: string[] }>();
  
  files.forEach(file => {
    const folderName = extractFolderName(file);
    
    if (!folderMap.has(folderName)) {
      folderMap.set(folderName, { count: 0, files: [] });
    }
    
    const stats = folderMap.get(folderName)!;
    stats.count++;
    stats.files.push(file.name);
  });
  
  return folderMap;
}

/**
 * Get folder color for visual distinction
 */
const FOLDER_COLORS = [
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#06B6D4', // cyan
  '#F97316', // orange
];

export function getFolderColor(folderName: string, allFolders: string[]): string {
  const index = allFolders.indexOf(folderName);
  return FOLDER_COLORS[index % FOLDER_COLORS.length];
}

/**
 * Filter mashups to only cross-folder combinations
 */
export function filterCrossFolderMashups<T extends { track1: any; track2: any }>(
  mashups: T[]
): T[] {
  return mashups.filter(m => isCrossFolder(m.track1, m.track2));
}

/**
 * Filter mashups by specific folder pair
 */
export function filterByFolderPair<T extends { track1: any; track2: any }>(
  mashups: T[],
  folder1: string | null,
  folder2: string | null
): T[] {
  if (!folder1 && !folder2) {
    return mashups;
  }

  return mashups.filter(m => {
    const f1 = m.track1.folderName || 'Uncategorized';
    const f2 = m.track2.folderName || 'Uncategorized';

    if (folder1 && folder2) {
      // Both folders specified: match either direction
      return (
        (f1 === folder1 && f2 === folder2) ||
        (f1 === folder2 && f2 === folder1)
      );
    } else if (folder1) {
      // Only folder1 specified: at least one track must be from folder1
      return f1 === folder1 || f2 === folder1;
    } else if (folder2) {
      // Only folder2 specified: at least one track must be from folder2
      return f1 === folder2 || f2 === folder2;
    }

    return true;
  });
}