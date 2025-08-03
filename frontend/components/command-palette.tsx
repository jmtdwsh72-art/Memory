'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Command,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  Bot,
  Settings,
  Zap,
  Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCommandPalette, type Command as CommandType, type CommandGroup } from '@/hooks/use-command-palette';
import { useKeyboardShortcuts } from '@/hooks/use-command-palette';

interface CommandPaletteProps {
  className?: string;
}

export function CommandPalette({ className }: CommandPaletteProps) {
  const {
    isOpen,
    filteredCommands,
    selectedIndex,
    searchQuery,
    closePalette,
    setSearchQuery,
    setSelectedIndex,
    executeSelectedCommand,
    navigateUp,
    navigateDown
  } = useCommandPalette();

  const { formatShortcut } = useKeyboardShortcuts();
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const commandListRef = React.useRef<HTMLDivElement>(null);

  // Focus search input when palette opens
  React.useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          closePalette();
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigateDown();
          break;
        case 'ArrowUp':
          e.preventDefault();
          navigateUp();
          break;
        case 'Enter':
          e.preventDefault();
          executeSelectedCommand();
          break;
        default:
          // Focus search input if typing
          if (e.key.length === 1 && searchInputRef.current) {
            searchInputRef.current.focus();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closePalette, navigateDown, navigateUp, executeSelectedCommand]);

  // Scroll selected item into view
  React.useEffect(() => {
    if (commandListRef.current) {
      const selectedElement = commandListRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  // Group commands by category
  const groupedCommands = React.useMemo(() => {
    const groups: CommandGroup[] = [
      { id: 'agents', label: 'Agents', icon: 'Bot', commands: [] },
      { id: 'settings', label: 'Settings', icon: 'Settings', commands: [] },
      { id: 'utilities', label: 'Utilities', icon: 'Zap', commands: [] },
      { id: 'navigation', label: 'Navigation', icon: 'Hash', commands: [] }
    ];

    // Group filtered commands by category
    filteredCommands.forEach(command => {
      const group = groups.find(g => g.id === command.group);
      if (group) {
        group.commands.push(command);
      }
    });

    // Return only groups that have commands
    return groups.filter(group => group.commands.length > 0);
  }, [filteredCommands]);

  const getIconForGroup = (groupIcon: string) => {
    switch (groupIcon) {
      case 'Bot': return <Bot className="h-4 w-4" />;
      case 'Settings': return <Settings className="h-4 w-4" />;
      case 'Zap': return <Zap className="h-4 w-4" />;
      case 'Hash': return <Hash className="h-4 w-4" />;
      default: return <Command className="h-4 w-4" />;
    }
  };

  // Calculate the actual index in the filtered commands list
  const getCommandIndex = (groupIndex: number, commandIndex: number): number => {
    let totalIndex = 0;
    for (let i = 0; i < groupIndex; i++) {
      totalIndex += groupedCommands[i].commands.length;
    }
    return totalIndex + commandIndex;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
        onClick={closePalette}
      >
        <div className="flex min-h-full items-start justify-center p-4 pt-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden',
              className
            )}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Command Palette"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Type a command or search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-card-foreground placeholder:text-muted-foreground outline-none text-lg"
                autoComplete="off"
                spellCheck="false"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <kbd className="px-2 py-1 bg-muted rounded border">ESC</kbd>
                <span>to close</span>
              </div>
            </div>

            {/* Commands List */}
            <div 
              ref={commandListRef}
              className="max-h-96 overflow-y-auto"
            >
              {groupedCommands.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p>No commands found</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              ) : (
                <div className="py-2">
                  {groupedCommands.map((group, groupIndex) => (
                    <div key={group.id}>
                      {/* Group Header */}
                      <div className="px-4 py-2 flex items-center gap-2">
                        {getIconForGroup(group.icon)}
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {group.label}
                        </span>
                      </div>

                      {/* Group Commands */}
                      {group.commands.map((command, commandIndex) => {
                        const actualIndex = getCommandIndex(groupIndex, commandIndex);
                        const isSelected = actualIndex === selectedIndex;

                        return (
                          <motion.button
                            key={command.id}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                              'hover:bg-accent/50',
                              isSelected && 'bg-accent text-accent-foreground',
                              command.disabled && 'opacity-50 cursor-not-allowed'
                            )}
                            onClick={() => {
                              setSelectedIndex(actualIndex);
                              executeSelectedCommand();
                            }}
                            disabled={command.disabled}
                            whileHover={{ x: isSelected ? 0 : 2 }}
                            animate={isSelected ? { x: 4 } : { x: 0 }}
                            transition={{ type: 'tween', duration: 0.1 }}
                          >
                            <div className="flex-1">
                              <div className="font-medium">{command.label}</div>
                              {command.description && (
                                <div className="text-sm text-muted-foreground">
                                  {command.description}
                                </div>
                              )}
                            </div>
                            
                            {command.shortcut && (
                              <div className="flex items-center gap-1">
                                {command.shortcut.split('+').map((key, i) => (
                                  <React.Fragment key={i}>
                                    {i > 0 && <span className="text-muted-foreground">+</span>}
                                    <kbd className="px-2 py-1 bg-muted rounded text-xs border">
                                      {formatShortcut(key)}
                                    </kbd>
                                  </React.Fragment>
                                ))}
                              </div>
                            )}

                            {isSelected && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-1 text-xs text-muted-foreground"
                              >
                                <CornerDownLeft className="h-3 w-3" />
                              </motion.div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {groupedCommands.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <ArrowUp className="h-3 w-3" />
                    <ArrowDown className="h-3 w-3" />
                    <span>to navigate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CornerDownLeft className="h-3 w-3" />
                    <span>to select</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}