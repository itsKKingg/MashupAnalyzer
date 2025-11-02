// src/types/audioEngine.ts
export type TimeStretchEngine = 'soundtouch' | 'tone' | 'none';

export interface TimeStretchInfo {
  engine: TimeStretchEngine;
  track1Rate: number;
  track2Rate: number;
  targetBPM: number;
  quality: 'perfect' | 'good' | 'basic';
}