// src/utils/browserDetection.ts
// ✅ NEW: Centralized browser/feature detection utility

/**
 * Detect if running on iOS (iPhone, iPad, iPod)
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Detect if running on Safari (desktop or mobile)
 */
export function isSafari(): boolean {
  const ua = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(ua) || isIOS();
}

/**
 * Check if autoplay is likely blocked
 * Note: This is a best-effort check, actual autoplay policy depends on browser and user settings
 */
export function isAutoplayBlocked(): boolean {
  return isIOS() || isSafari();
}

/**
 * Get user-friendly error message for autoplay failures
 */
export function getAutoplayErrorMessage(): string {
  if (isIOS()) {
    return 'Audio playback requires a user interaction on iOS. Please tap the play button again.';
  }
  if (isSafari()) {
    return 'Audio playback requires a user interaction in Safari. Please click the play button again.';
  }
  return 'Audio playback failed. Your browser may be blocking autoplay. Please enable autoplay in your browser settings.';
}

