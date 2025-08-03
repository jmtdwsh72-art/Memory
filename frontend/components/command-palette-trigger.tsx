'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Command } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCommandPalette, useKeyboardShortcuts } from '@/hooks/use-command-palette';

interface CommandPaletteTriggerProps {
  className?: string;
  showLabel?: boolean;
}

export function CommandPaletteTrigger({ className, showLabel = true }: CommandPaletteTriggerProps) {
  const { openPalette } = useCommandPalette();
  const { formatShortcut } = useKeyboardShortcuts();

  return (
    <motion.button
      onClick={openPalette}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg',
        'bg-muted/50 border border-border/50',
        'text-muted-foreground hover:text-foreground',
        'hover:bg-muted/80 hover:border-border',
        'transition-all duration-200 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'transform-gpu will-change-transform',
        className
      )}
      title="Open command palette"
    >
      <Command className="h-4 w-4" />
      {showLabel && (
        <>
          <span className="hidden sm:inline text-sm">Search</span>
          <div className="flex items-center gap-1 ml-2">
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-background border border-border rounded">
              {formatShortcut('⌘K')}
            </kbd>
          </div>
        </>
      )}
    </motion.button>
  );
}