// src/hooks/useKeyboardShortcuts.ts
// ✅ FIXED: Properly handles input fields - shortcuts don't interfere with typing

import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: (event: KeyboardEvent) => void;
  description: string;
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // ✅ Check if user is typing in an input field
      const activeElement = document.activeElement;
      const tagName = activeElement?.tagName?.toLowerCase();
      const isContentEditable = (activeElement as HTMLElement)?.isContentEditable;
      
      const isTypingInInput =
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        isContentEditable === true;

      // If user is typing, only allow Ctrl/Cmd shortcuts (like Ctrl+S)
      if (isTypingInInput) {
        // Allow only modifier key combinations
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
          return; // Let the input field handle the key
        }
      }

      // Process shortcuts
      for (const shortcut of shortcuts) {
        const keyMatches =
          event.key.toLowerCase() === shortcut.key.toLowerCase();
        
        const ctrlMatches = shortcut.ctrl
          ? event.ctrlKey || event.metaKey
          : true;
        
        const shiftMatches = shortcut.shift
          ? event.shiftKey
          : true;
        
        const altMatches = shortcut.alt
          ? event.altKey
          : true;

        // Check if all modifiers match as expected
        const modifiersMatch =
          (shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey) &&
          (shortcut.shift ? event.shiftKey : !event.shiftKey) &&
          (shortcut.alt ? event.altKey : !event.altKey);

        if (keyMatches && modifiersMatch) {
          // Don't trigger non-modifier shortcuts while typing
          if (isTypingInInput && !shortcut.ctrl && !shortcut.alt) {
            return;
          }
          
          shortcut.handler(event);
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, enabled]);
}