import { create } from 'zustand';

export interface Command {
  id: string;
  label: string;
  description?: string;
  group: 'agents' | 'settings' | 'utilities' | 'navigation';
  icon?: string;
  shortcut?: string;
  action: () => void | Promise<void>;
  disabled?: boolean;
}

export interface CommandGroup {
  id: string;
  label: string;
  icon: string;
  commands: Command[];
}

interface CommandPaletteState {
  isOpen: boolean;
  commands: Command[];
  filteredCommands: Command[];
  selectedIndex: number;
  searchQuery: string;
  
  // Actions
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
  setSearchQuery: (query: string) => void;
  setSelectedIndex: (index: number) => void;
  executeCommand: (command: Command) => void;
  executeSelectedCommand: () => void;
  navigateUp: () => void;
  navigateDown: () => void;
  registerCommand: (command: Command) => void;
  unregisterCommand: (commandId: string) => void;
  updateCommands: (commands: Command[]) => void;
}

// Fuzzy search function
function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true;
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Simple fuzzy matching - checks if all characters in query appear in order
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  
  return queryIndex === queryLower.length;
}

// Fuzzy search with scoring
function fuzzySearch(commands: Command[], query: string): Command[] {
  if (!query.trim()) return commands;
  
  return commands
    .filter(command => 
      fuzzyMatch(query, command.label) || 
      (command.description && fuzzyMatch(query, command.description))
    )
    .sort((a, b) => {
      // Prefer exact matches in label
      const aExact = a.label.toLowerCase().includes(query.toLowerCase());
      const bExact = b.label.toLowerCase().includes(query.toLowerCase());
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Prefer matches at the beginning
      const aStartsWith = a.label.toLowerCase().startsWith(query.toLowerCase());
      const bStartsWith = b.label.toLowerCase().startsWith(query.toLowerCase());
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      return 0;
    });
}

export const useCommandPalette = create<CommandPaletteState>((set, get) => ({
  isOpen: false,
  commands: [],
  filteredCommands: [],
  selectedIndex: 0,
  searchQuery: '',

  openPalette: () => {
    const state = get();
    set({
      isOpen: true,
      filteredCommands: state.commands,
      selectedIndex: 0,
      searchQuery: ''
    });
  },

  closePalette: () => {
    set({
      isOpen: false,
      searchQuery: '',
      selectedIndex: 0
    });
  },

  togglePalette: () => {
    const state = get();
    if (state.isOpen) {
      state.closePalette();
    } else {
      state.openPalette();
    }
  },

  setSearchQuery: (query: string) => {
    const state = get();
    const filteredCommands = fuzzySearch(state.commands, query);
    set({
      searchQuery: query,
      filteredCommands,
      selectedIndex: 0
    });
  },

  setSelectedIndex: (index: number) => {
    const state = get();
    const maxIndex = Math.max(0, state.filteredCommands.length - 1);
    set({
      selectedIndex: Math.max(0, Math.min(index, maxIndex))
    });
  },

  executeCommand: (command: Command) => {
    if (command.disabled) return;
    
    try {
      command.action();
      get().closePalette();
    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  },

  executeSelectedCommand: () => {
    const state = get();
    const selectedCommand = state.filteredCommands[state.selectedIndex];
    if (selectedCommand) {
      state.executeCommand(selectedCommand);
    }
  },

  navigateUp: () => {
    const state = get();
    const newIndex = state.selectedIndex > 0 
      ? state.selectedIndex - 1 
      : state.filteredCommands.length - 1;
    state.setSelectedIndex(newIndex);
  },

  navigateDown: () => {
    const state = get();
    const newIndex = state.selectedIndex < state.filteredCommands.length - 1
      ? state.selectedIndex + 1
      : 0;
    state.setSelectedIndex(newIndex);
  },

  registerCommand: (command: Command) => {
    const state = get();
    const commands = [...state.commands.filter(c => c.id !== command.id), command];
    set({
      commands,
      filteredCommands: state.searchQuery ? fuzzySearch(commands, state.searchQuery) : commands
    });
  },

  unregisterCommand: (commandId: string) => {
    const state = get();
    const commands = state.commands.filter(c => c.id !== commandId);
    set({
      commands,
      filteredCommands: state.searchQuery ? fuzzySearch(commands, state.searchQuery) : commands
    });
  },

  updateCommands: (commands: Command[]) => {
    const state = get();
    set({
      commands,
      filteredCommands: state.searchQuery ? fuzzySearch(commands, state.searchQuery) : commands
    });
  }
}));

// Helper hook to detect platform for keyboard shortcuts
export function useKeyboardShortcuts() {
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  const formatShortcut = (key: string) => {
    if (isMac) {
      return key.replace('Ctrl', '⌘').replace('Alt', '⌥').replace('Shift', '⇧');
    }
    return key;
  };

  const getModifierKey = () => isMac ? 'metaKey' : 'ctrlKey';

  return {
    isMac,
    formatShortcut,
    getModifierKey
  };
}