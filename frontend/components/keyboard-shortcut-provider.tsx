'use client';

import * as React from 'react';
import { useCommandPalette, useKeyboardShortcuts } from '@/hooks/use-command-palette';

interface KeyboardShortcutProviderProps {
  children: React.ReactNode;
}

export function KeyboardShortcutProvider({ children }: KeyboardShortcutProviderProps) {
  const { togglePalette } = useCommandPalette();
  const { getModifierKey } = useKeyboardShortcuts();

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux) to toggle command palette
      if (event.key === 'k' && event[getModifierKey()]) {
        event.preventDefault();
        event.stopPropagation();
        togglePalette();
        return;
      }

      // Additional global shortcuts can be added here
      // For example, specific agent switching shortcuts
      if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
          case '1':
          case '2':
          case '3':
          case '4':
            // These will be handled by the command palette system
            // when commands are registered
            break;
          
          case '/':
            // Focus chat input
            if (!event.shiftKey) {
              event.preventDefault();
              const chatInput = document.querySelector('[data-chat-input]') as HTMLElement;
              if (chatInput) {
                chatInput.focus();
              }
            }
            break;
            
          default:
            break;
        }
      }

      // Handle standalone shortcuts
      if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        switch (event.key) {
          case '/':
            // Only focus chat input if not in an input field
            const activeElement = document.activeElement;
            const isInputField = activeElement?.tagName === 'INPUT' || 
                               activeElement?.tagName === 'TEXTAREA' ||
                               (activeElement as HTMLElement)?.contentEditable === 'true';
            
            if (!isInputField) {
              event.preventDefault();
              const chatInput = document.querySelector('[data-chat-input]') as HTMLElement;
              if (chatInput) {
                chatInput.focus();
              }
            }
            break;
            
          default:
            break;
        }
      }
    };

    // Attach to document to catch all keyboard events
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [togglePalette, getModifierKey]);

  return <>{children}</>;
}

// Hook to register keyboard shortcuts for specific commands
export function useRegisterShortcuts(shortcuts: Record<string, () => void>) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input field
      const activeElement = document.activeElement;
      const isInputField = activeElement?.tagName === 'INPUT' || 
                         activeElement?.tagName === 'TEXTAREA' ||
                         (activeElement as HTMLElement)?.contentEditable === 'true';
      
      if (isInputField) return;

      // Build shortcut key
      const modifiers = [];
      if (event.metaKey) modifiers.push('meta');
      if (event.ctrlKey) modifiers.push('ctrl');
      if (event.altKey) modifiers.push('alt');
      if (event.shiftKey) modifiers.push('shift');
      modifiers.push(event.key.toLowerCase());
      
      const shortcutKey = modifiers.join('+');
      
      // Check if this shortcut is registered
      if (shortcuts[shortcutKey]) {
        event.preventDefault();
        shortcuts[shortcutKey]();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Helper to format shortcuts for display
export function formatShortcutDisplay(shortcut: string): string {
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  return shortcut
    .split('+')
    .map(key => {
      switch (key.toLowerCase()) {
        case 'meta':
        case 'cmd':
          return isMac ? '⌘' : 'Ctrl';
        case 'ctrl':
          return isMac ? '⌃' : 'Ctrl';
        case 'alt':
          return isMac ? '⌥' : 'Alt';
        case 'shift':
          return isMac ? '⇧' : 'Shift';
        case 'arrowup':
          return '↑';
        case 'arrowdown':
          return '↓';
        case 'arrowleft':
          return '←';
        case 'arrowright':
          return '→';
        default:
          return key.toUpperCase();
      }
    })
    .join(isMac ? '' : '+');
}