'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from '@/lib/icons';

// Lazy load the MemoryViewerPanel with loading fallback
const MemoryViewerPanel = dynamic(
  () => import('./memory-viewer-panel').then(mod => ({ default: mod.MemoryViewerPanel })),
  {
    loading: () => (
      <div className="fixed right-0 top-0 z-50 h-full w-80 bg-card border-l border-border shadow-lg flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading Memory Viewer...</span>
        </div>
      </div>
    ),
    ssr: false, // Disable SSR for this component
  }
);

interface LazyMemoryViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LazyMemoryViewer({ isOpen, onClose }: LazyMemoryViewerProps) {
  // Only render when needed
  if (!isOpen) return null;

  return <MemoryViewerPanel isOpen={isOpen} onClose={onClose} />;
}