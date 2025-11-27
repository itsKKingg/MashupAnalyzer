// src/utils/musicMetadata.ts
// ✅ FIXED: Extract metadata from audio files (now with dynamic imports)

import { Buffer } from 'buffer';

// ✅ FIXED: Dynamic import for code splitting
let musicMetadataModule: typeof import('music-metadata') | null = null;

async function loadMusicMetadata(): Promise<typeof import('music-metadata')> {
  if (!musicMetadataModule) {
    try {
      musicMetadataModule = await import('music-metadata');
      return musicMetadataModule;
    } catch (error) {
      console.error('Failed to load music-metadata:', error);
      throw new Error('Metadata extraction failed to load. Please refresh the page.');
    }
  }
  return musicMetadataModule;
}

export interface ExtendedMetadata {
  // From file
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  genre?: string[];
  albumArt?: string; // Base64 data URL
  
  // From file tags (if DJ software already tagged it)
  bpmTag?: number;
  keyTag?: string;
  
  // From MusicBrainz API
  mbid?: string; // MusicBrainz ID
  mbGenre?: string[];
  mbRating?: number;
}

/**
 * Extract metadata from audio file
 */
export async function extractMetadata(file: File): Promise<ExtendedMetadata> {
  try {
    // ✅ FIXED: Dynamically load music-metadata
    const { parseBuffer } = await loadMusicMetadata();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const metadata = await parseBuffer(buffer);
    
    const result: ExtendedMetadata = {
      title: metadata.common.title,
      artist: metadata.common.artist,
      album: metadata.common.album,
      year: metadata.common.year,
      genre: metadata.common.genre,
    };
    
    // Extract album art
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      const base64 = btoa(
        new Uint8Array(picture.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      result.albumArt = `data:${picture.format};base64,${base64}`;
    }
    
    // Check for BPM tag (set by DJ software)
    if (metadata.native) {
      // Try different tag formats
      const allTags = Object.values(metadata.native).flat();
      
      const bpmTag = allTags.find(tag => 
        tag.id === 'TBPM' || tag.id === 'BPM' || tag.id === 'bpm'
      );
      if (bpmTag && bpmTag.value) {
        result.bpmTag = parseFloat(bpmTag.value.toString());
      }
      
      // Some software stores key
      const keyTag = allTags.find(tag => 
        tag.id === 'TKEY' || tag.id === 'KEY' || tag.id === 'key'
      );
      if (keyTag && keyTag.value) {
        result.keyTag = keyTag.value.toString();
      }
    }
    
    console.log('📀 Metadata extracted:', result);
    return result;
    
  } catch (error) {
    console.error('Failed to extract metadata:', error);
    return {};
  }
}

/**
 * Lookup track on MusicBrainz API
 * Free, open API - rate limit: 1 req/sec
 */
export async function lookupMusicBrainz(
  title: string, 
  artist?: string
): Promise<Partial<ExtendedMetadata>> {
  try {
    // Build query
    const query = artist 
      ? `recording:"${title}" AND artist:"${artist}"`
      : `recording:"${title}"`;
    
    const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MashupAnalyzer/1.0 (contact@example.com)',
      },
    });
    
    if (!response.ok) {
      console.warn('MusicBrainz lookup failed:', response.status);
      return {};
    }
    
    const data = await response.json();
    
    if (data.recordings && data.recordings.length > 0) {
      const recording = data.recordings[0];
      
      return {
        mbid: recording.id,
        mbGenre: recording.tags?.map((t: any) => t.name) || [],
        mbRating: recording.score || 0,
      };
    }
    
    return {};
    
  } catch (error) {
    console.error('MusicBrainz API error:', error);
    return {};
  }
}

/**
 * Rate-limited MusicBrainz lookup (respects 1 req/sec limit)
 */
let lastMBRequest = 0;
const MB_RATE_LIMIT = 1000; // 1 second between requests

export async function lookupMusicBrainzThrottled(
  title: string,
  artist?: string
): Promise<Partial<ExtendedMetadata>> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastMBRequest;
  
  if (timeSinceLastRequest < MB_RATE_LIMIT) {
    // Wait before making request
    await new Promise(resolve => 
      setTimeout(resolve, MB_RATE_LIMIT - timeSinceLastRequest)
    );
  }
  
  lastMBRequest = Date.now();
  return lookupMusicBrainz(title, artist);
}