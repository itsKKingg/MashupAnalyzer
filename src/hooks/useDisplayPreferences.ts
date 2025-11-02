// src/hooks/useDisplayPreferences.ts

import { useState, useEffect } from 'react';
import type {
  BPMDisplayMode,
  KeyDisplayMode,
  AccidentalStyle,
  ConfidenceDisplayMode,
} from '../utils/formatters';

export interface DisplayPreferences {
  bpmMode: BPMDisplayMode;
  keyMode: KeyDisplayMode;
  accidentalStyle: AccidentalStyle;
  confidenceMode: ConfidenceDisplayMode;
}

const DEFAULT_PREFERENCES: DisplayPreferences = {
  bpmMode: 'rounded',
  keyMode: 'standard',
  accidentalStyle: 'sharp',
  confidenceMode: 'badge',
};

const STORAGE_KEY = 'display-preferences';

export function useDisplayPreferences() {
  const [preferences, setPreferences] = useState<DisplayPreferences>(() => {
    // Load from localStorage on init
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
      } catch (error) {
        console.error('Failed to load display preferences:', error);
        return DEFAULT_PREFERENCES;
      }
    }
    return DEFAULT_PREFERENCES;
  });

  // Save to localStorage whenever preferences change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const updatePreference = <K extends keyof DisplayPreferences>(
    key: K,
    value: DisplayPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  return {
    preferences,
    updatePreference,
    resetPreferences,
  };
}