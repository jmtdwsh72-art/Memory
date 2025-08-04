'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { useCommandPalette } from '@/hooks/use-command-palette';
import { createCommands, type CommandFactoryProps } from '@/lib/commands';
import { CommandPalette } from './command-palette';

interface CommandPaletteIntegrationProps {
  // App state
  activeAgent: string;
  isMemoryOpen: boolean;
  isLogsOpen: boolean;
  isSettingsOpen: boolean;
  isSidebarOpen: boolean;
  
  // App actions
  onAgentSelect: (agentId: string) => void;
  onOpenMemory: () => void;
  onOpenLogs: () => void;
  onOpenSettings: () => void;
  onClearChat: () => void;
  onToggleSidebar: () => void;
  onNavigateToDashboard?: () => void;
  
  // Voice state
  isVoiceMuted?: boolean;
  onToggleVoiceMute?: () => void;
}

export function CommandPaletteIntegration(props: CommandPaletteIntegrationProps) {
  const { theme, setTheme } = useTheme();
  const { updateCommands } = useCommandPalette();

  // Get voice mute state from localStorage if not provided
  const [voiceMuted, setVoiceMuted] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const muted = localStorage.getItem('tts-muted') === 'true';
      setVoiceMuted(muted);
      
      const handleMuteChange = (event: CustomEvent) => {
        setVoiceMuted(event.detail.muted);
      };
      
      window.addEventListener('tts-mute-change' as any, handleMuteChange);
      return () => window.removeEventListener('tts-mute-change' as any, handleMuteChange);
    }
  }, []);

  // Handle theme toggle
  const handleToggleTheme = React.useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Handle voice mute toggle
  const handleToggleVoiceMute = React.useCallback(() => {
    if (props.onToggleVoiceMute) {
      props.onToggleVoiceMute();
    } else {
      // Fallback to direct localStorage manipulation
      const newMuteState = !voiceMuted;
      setVoiceMuted(newMuteState);
      localStorage.setItem('tts-muted', String(newMuteState));
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('tts-mute-change', { 
        detail: { muted: newMuteState } 
      }));
    }
  }, [props.onToggleVoiceMute, voiceMuted]);

  // Create command factory props
  const commandProps = React.useMemo((): CommandFactoryProps => ({
    // Agent functions
    onAgentSelect: props.onAgentSelect,
    activeAgent: props.activeAgent,
    
    // Panel functions
    onOpenMemory: props.onOpenMemory,
    onOpenLogs: props.onOpenLogs,
    onOpenSettings: props.onOpenSettings,
    
    // Chat functions
    onClearChat: props.onClearChat,
    onToggleSidebar: props.onToggleSidebar,
    
    // Navigation functions
    onNavigateToDashboard: props.onNavigateToDashboard,
    
    // Theme functions
    onToggleTheme: handleToggleTheme,
    
    // Voice functions
    onToggleVoiceMute: handleToggleVoiceMute,
    isVoiceMuted: props.isVoiceMuted ?? voiceMuted,
    
    // Panel states
    isMemoryOpen: props.isMemoryOpen,
    isLogsOpen: props.isLogsOpen,
    isSettingsOpen: props.isSettingsOpen,
    isSidebarOpen: props.isSidebarOpen,
    
    // Theme state
    theme: theme as 'light' | 'dark'
  }), [
    props.onAgentSelect,
    props.activeAgent,
    props.onOpenMemory,
    props.onOpenLogs,
    props.onOpenSettings,
    props.onClearChat,
    props.onToggleSidebar,
    props.isMemoryOpen,
    props.isLogsOpen,
    props.isSettingsOpen,
    props.isSidebarOpen,
    props.isVoiceMuted,
    handleToggleTheme,
    handleToggleVoiceMute,
    voiceMuted,
    theme
  ]);

  // Update commands when props change
  React.useEffect(() => {
    const commands = createCommands(commandProps);
    updateCommands(commands);
  }, [commandProps, updateCommands]);

  // Register keyboard shortcuts for direct commands
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input field or command palette is open
      const activeElement = document.activeElement;
      const isInputField = activeElement?.tagName === 'INPUT' || 
                         activeElement?.tagName === 'TEXTAREA' ||
                         (activeElement as HTMLElement)?.contentEditable === 'true';
      
      if (isInputField) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;

      if (modifierKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            props.onAgentSelect('router');
            break;
          case '2':
            event.preventDefault();
            props.onAgentSelect('research');
            break;
          case '3':
            event.preventDefault();
            props.onAgentSelect('creative');
            break;
          case '4':
            event.preventDefault();
            props.onAgentSelect('automation');
            break;
          case 'b':
            event.preventDefault();
            props.onToggleSidebar();
            break;
          case 'm':
            if (event.shiftKey) {
              event.preventDefault();
              props.onOpenMemory();
            } else {
              event.preventDefault();
              handleToggleVoiceMute();
            }
            break;
          case 'l':
            if (event.shiftKey) {
              event.preventDefault();
              props.onOpenLogs();
            }
            break;
          case ',':
            event.preventDefault();
            props.onOpenSettings();
            break;
          case 't':
            if (event.shiftKey) {
              event.preventDefault();
              handleToggleTheme();
            }
            break;
          case 'x':
            if (event.shiftKey) {
              event.preventDefault();
              if (window.confirm('Are you sure you want to clear the current chat?')) {
                props.onClearChat();
              }
            }
            break;
          case 'ArrowUp':
            event.preventDefault();
            const chatContainer = document.querySelector('[data-chat-container]');
            if (chatContainer) {
              chatContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
            break;
          case 'ArrowDown':
            event.preventDefault();
            const chatContainer2 = document.querySelector('[data-chat-container]');
            if (chatContainer2) {
              chatContainer2.scrollTo({ 
                top: chatContainer2.scrollHeight, 
                behavior: 'smooth' 
              });
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    props.onAgentSelect,
    props.onToggleSidebar,
    props.onOpenMemory,
    props.onOpenLogs,
    props.onOpenSettings,
    props.onClearChat,
    handleToggleTheme,
    handleToggleVoiceMute
  ]);

  return <CommandPalette />;
}

// Provider component that wraps the entire app
export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}