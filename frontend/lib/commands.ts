import type { Command } from '@/hooks/use-command-palette';
import { resetOnboarding } from '@/lib/onboarding';

// Command IDs for consistency
export const COMMAND_IDS = {
  // Agents
  SWITCH_TO_ROUTER: 'switch-to-router',
  SWITCH_TO_RESEARCH: 'switch-to-research',
  SWITCH_TO_CREATIVE: 'switch-to-creative',
  SWITCH_TO_AUTOMATION: 'switch-to-automation',
  
  // Settings
  TOGGLE_THEME: 'toggle-theme',
  REPLAY_WELCOME: 'replay-welcome',
  TOGGLE_VOICE_MUTE: 'toggle-voice-mute',
  OPEN_SETTINGS: 'open-settings',
  
  // Utilities
  OPEN_MEMORY_VIEWER: 'open-memory-viewer',
  OPEN_LOGS_VIEWER: 'open-logs-viewer',
  CLEAR_CHAT: 'clear-chat',
  SCROLL_TO_TOP: 'scroll-to-top',
  SCROLL_TO_BOTTOM: 'scroll-to-bottom',
  
  // Navigation
  FOCUS_CHAT_INPUT: 'focus-chat-input',
  TOGGLE_SIDEBAR: 'toggle-sidebar',
  GO_TO_DASHBOARD: 'go-to-dashboard',
} as const;

export interface CommandFactoryProps {
  // Agent functions
  onAgentSelect?: (agentId: string) => void;
  activeAgent?: string;
  
  // Panel functions
  onOpenMemory?: () => void;
  onOpenLogs?: () => void;
  onOpenSettings?: () => void;
  
  // Chat functions
  onClearChat?: () => void;
  onToggleSidebar?: () => void;
  
  // Navigation functions
  onNavigateToDashboard?: () => void;
  
  // Theme functions
  onToggleTheme?: () => void;
  
  // Voice functions
  onToggleVoiceMute?: () => void;
  isVoiceMuted?: boolean;
  
  // Panel states
  isMemoryOpen?: boolean;
  isLogsOpen?: boolean;
  isSettingsOpen?: boolean;
  isSidebarOpen?: boolean;
  
  // Theme state
  theme?: 'light' | 'dark';
}

export function createCommands(props: CommandFactoryProps): Command[] {
  const {
    onAgentSelect,
    activeAgent,
    onOpenMemory,
    onOpenLogs,
    onOpenSettings,
    onClearChat,
    onToggleSidebar,
    onNavigateToDashboard,
    onToggleTheme,
    onToggleVoiceMute,
    isVoiceMuted,
    isMemoryOpen,
    isLogsOpen,
    isSettingsOpen,
    isSidebarOpen,
    theme
  } = props;

  const commands: Command[] = [
    // Agent Commands
    {
      id: COMMAND_IDS.SWITCH_TO_ROUTER,
      label: 'Switch to General Chat',
      description: 'Switch to the general conversation agent',
      group: 'agents',
      shortcut: '⌘+1',
      action: () => onAgentSelect?.('router'),
      disabled: activeAgent === 'router'
    },
    {
      id: COMMAND_IDS.SWITCH_TO_RESEARCH,
      label: 'Switch to Research Agent',
      description: 'Switch to the research and analysis agent',
      group: 'agents',
      shortcut: '⌘+2',
      action: () => onAgentSelect?.('research'),
      disabled: activeAgent === 'research'
    },
    {
      id: COMMAND_IDS.SWITCH_TO_CREATIVE,
      label: 'Switch to Creative Agent',
      description: 'Switch to the creative and brainstorming agent',
      group: 'agents',
      shortcut: '⌘+3',
      action: () => onAgentSelect?.('creative'),
      disabled: activeAgent === 'creative'
    },
    {
      id: COMMAND_IDS.SWITCH_TO_AUTOMATION,
      label: 'Switch to Automation Agent',
      description: 'Switch to the automation and scripting agent',
      group: 'agents',
      shortcut: '⌘+4',
      action: () => onAgentSelect?.('automation'),
      disabled: activeAgent === 'automation'
    },
    
    // Settings Commands
    {
      id: COMMAND_IDS.TOGGLE_THEME,
      label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      description: `Toggle to ${theme === 'dark' ? 'light' : 'dark'} theme`,
      group: 'settings',
      shortcut: '⌘+⇧+T',
      action: () => onToggleTheme?.()
    },
    {
      id: COMMAND_IDS.REPLAY_WELCOME,
      label: 'Replay Welcome Tour',
      description: 'Restart the onboarding experience',
      group: 'settings',
      action: () => {
        resetOnboarding();
        window.location.reload();
      }
    },
    {
      id: COMMAND_IDS.TOGGLE_VOICE_MUTE,
      label: `${isVoiceMuted ? 'Unmute' : 'Mute'} Voice Output`,
      description: `${isVoiceMuted ? 'Enable' : 'Disable'} text-to-speech`,
      group: 'settings',
      shortcut: '⌘+M',
      action: () => onToggleVoiceMute?.()
    },
    {
      id: COMMAND_IDS.OPEN_SETTINGS,
      label: 'Open Settings',
      description: 'Open the settings panel',
      group: 'settings',
      shortcut: '⌘+,',
      action: () => onOpenSettings?.(),
      disabled: isSettingsOpen
    },
    
    // Utilities Commands
    {
      id: COMMAND_IDS.OPEN_MEMORY_VIEWER,
      label: 'Open Memory Viewer',
      description: 'View agent memory and knowledge',
      group: 'utilities',
      shortcut: '⌘+⇧+M',
      action: () => onOpenMemory?.(),
      disabled: isMemoryOpen
    },
    {
      id: COMMAND_IDS.OPEN_LOGS_VIEWER,
      label: 'Open Logs Viewer',
      description: 'View agent activity logs',
      group: 'utilities',
      shortcut: '⌘+⇧+L',
      action: () => onOpenLogs?.(),
      disabled: isLogsOpen
    },
    {
      id: COMMAND_IDS.CLEAR_CHAT,
      label: 'Clear Current Chat',
      description: 'Remove all messages from the current conversation',
      group: 'utilities',
      shortcut: '⌘+⇧+X',
      action: () => {
        if (window.confirm('Are you sure you want to clear the current chat?')) {
          onClearChat?.();
        }
      }
    },
    {
      id: COMMAND_IDS.SCROLL_TO_TOP,
      label: 'Scroll to Top',
      description: 'Scroll to the beginning of the conversation',
      group: 'utilities',
      shortcut: '⌘+↑',
      action: () => {
        const chatContainer = document.querySelector('[data-chat-container]');
        if (chatContainer) {
          chatContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    },
    {
      id: COMMAND_IDS.SCROLL_TO_BOTTOM,
      label: 'Scroll to Bottom',
      description: 'Scroll to the latest message',
      group: 'utilities',
      shortcut: '⌘+↓',
      action: () => {
        const chatContainer = document.querySelector('[data-chat-container]');
        if (chatContainer) {
          chatContainer.scrollTo({ 
            top: chatContainer.scrollHeight, 
            behavior: 'smooth' 
          });
        }
      }
    },
    
    // Navigation Commands
    {
      id: COMMAND_IDS.FOCUS_CHAT_INPUT,
      label: 'Focus Chat Input',
      description: 'Jump to the message input field',
      group: 'navigation',
      shortcut: '/',
      action: () => {
        const chatInput = document.querySelector('[data-chat-input]') as HTMLElement;
        if (chatInput) {
          chatInput.focus();
        }
      }
    },
    {
      id: COMMAND_IDS.TOGGLE_SIDEBAR,
      label: `${isSidebarOpen ? 'Close' : 'Open'} Sidebar`,
      description: `${isSidebarOpen ? 'Hide' : 'Show'} the agent sidebar`,
      group: 'navigation',
      shortcut: '⌘+B',
      action: () => onToggleSidebar?.()
    },
    {
      id: COMMAND_IDS.GO_TO_DASHBOARD,
      label: 'Go to Dashboard',
      description: 'Navigate to the main dashboard',
      group: 'navigation',
      shortcut: '⌘+⇧+D',
      action: () => onNavigateToDashboard?.()
    }
  ];

  return commands.filter(cmd => !cmd.disabled);
}

// Predefined command sets for different contexts
export function getAgentCommands(
  onAgentSelect: (agentId: string) => void, 
  activeAgent: string
): Command[] {
  return createCommands({ onAgentSelect, activeAgent })
    .filter(cmd => cmd.group === 'agents');
}

export function getUtilityCommands(handlers: {
  onOpenMemory: () => void;
  onOpenLogs: () => void;
  onClearChat: () => void;
  isMemoryOpen?: boolean;
  isLogsOpen?: boolean;
}): Command[] {
  return createCommands(handlers)
    .filter(cmd => cmd.group === 'utilities');
}

export function getSettingsCommands(handlers: {
  onToggleTheme: () => void;
  onToggleVoiceMute: () => void;
  onOpenSettings: () => void;
  theme?: 'light' | 'dark';
  isVoiceMuted?: boolean;
  isSettingsOpen?: boolean;
}): Command[] {
  return createCommands(handlers)
    .filter(cmd => cmd.group === 'settings');
}