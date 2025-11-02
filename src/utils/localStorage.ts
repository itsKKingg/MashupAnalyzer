import { Track } from '../types/track';

const STORAGE_KEY = 'mashup-analyzer-library';
const SETTINGS_KEY = 'mashup-analyzer-settings';

export interface SavedTrack {
  id: string;
  name: string;
  fileName: string;
  bpm: number;
  key: string;
  duration: number;
}

export interface SavedLibrary {
  tracks: SavedTrack[];
  savedAt: number;
  version: string;
}

export interface AppSettings {
  autoSave: boolean;
  lastSession: number;
}

// Convert Track to SavedTrack (remove File and audioUrl)
export function trackToSavedTrack(track: Track): SavedTrack {
  return {
    id: track.id,
    name: track.name,
    fileName: track.file.name,
    bpm: track.bpm,
    key: track.key,
    duration: track.duration,
  };
}

// Save library to localStorage
export function saveLibrary(tracks: Track[]): boolean {
  try {
    const analyzedTracks = tracks.filter(t => !t.isAnalyzing && !t.error && t.bpm > 0);
    
    const library: SavedLibrary = {
      tracks: analyzedTracks.map(trackToSavedTrack),
      savedAt: Date.now(),
      version: '1.0',
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
    return true;
  } catch (error) {
    console.error('Failed to save library:', error);
    return false;
  }
}

// Load library from localStorage
export function loadLibrary(): SavedLibrary | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;

    const library: SavedLibrary = JSON.parse(data);
    
    // Validate structure
    if (!library.tracks || !Array.isArray(library.tracks)) {
      return null;
    }

    return library;
  } catch (error) {
    console.error('Failed to load library:', error);
    return null;
  }
}

// Clear saved library
export function clearLibrary(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Export library as downloadable JSON
export function exportLibraryAsJSON(tracks: Track[]): void {
  const analyzedTracks = tracks.filter(t => !t.isAnalyzing && !t.error && t.bpm > 0);
  
  const library: SavedLibrary = {
    tracks: analyzedTracks.map(trackToSavedTrack),
    savedAt: Date.now(),
    version: '1.0',
  };

  const blob = new Blob([JSON.stringify(library, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mashup-library-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import library from JSON file
export function importLibraryFromJSON(file: File): Promise<SavedLibrary> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result as string;
        const library: SavedLibrary = JSON.parse(data);

        // Validate structure
        if (!library.tracks || !Array.isArray(library.tracks)) {
          reject(new Error('Invalid library file format'));
          return;
        }

        // Validate each track has required fields
        const isValid = library.tracks.every(
          t => t.name && typeof t.bpm === 'number' && t.key && typeof t.duration === 'number'
        );

        if (!isValid) {
          reject(new Error('Library file contains invalid track data'));
          return;
        }

        resolve(library);
      } catch (error) {
        reject(new Error('Failed to parse library file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Settings management
export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadSettings(): AppSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) {
      return { autoSave: true, lastSession: 0 };
    }
    return JSON.parse(data);
  } catch {
    return { autoSave: true, lastSession: 0 };
  }
}

// Get formatted last saved time
export function getLastSavedTime(): string | null {
  const library = loadLibrary();
  if (!library) return null;

  const date = new Date(library.savedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}