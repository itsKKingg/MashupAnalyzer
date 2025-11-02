// src/utils/sharedAudioContext.ts

let sharedContext: AudioContext | null = null;

/**
 * Get or create the shared AudioContext (singleton pattern)
 * Prevents memory leaks from creating multiple contexts
 */
export function getSharedAudioContext(): AudioContext {
  if (!sharedContext || sharedContext.state === 'closed') {
    sharedContext = new AudioContext();
    console.log('✅ Created shared AudioContext');
  }
  return sharedContext;
}

/**
 * Close the shared AudioContext (call on app unmount)
 */
export function closeSharedAudioContext(): void {
  if (sharedContext && sharedContext.state !== 'closed') {
    sharedContext.close();
    sharedContext = null;
    console.log('🔒 Closed shared AudioContext');
  }
}