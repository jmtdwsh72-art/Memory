'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Monitor, Wifi, WifiOff } from '@/lib/icons';
import { cn } from '@/lib/utils';

interface DevOverlayProps {
  isEnabled?: boolean;
}

interface SystemInfo {
  viewport: { width: number; height: number };
  userAgent: string;
  online: boolean;
  memory?: any; // Performance timing data
  connection?: any;
}

export function DevOverlay({ isEnabled = process.env.NODE_ENV === 'development' }: DevOverlayProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [systemInfo, setSystemInfo] = React.useState<SystemInfo | null>(null);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [warnings, setWarnings] = React.useState<string[]>([]);

  // Collect system information
  React.useEffect(() => {
    if (!isEnabled) return;

    const updateSystemInfo = () => {
      setSystemInfo({
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        userAgent: navigator.userAgent,
        online: navigator.onLine,
        memory: performance.getEntriesByType('navigation')[0] as any,
        connection: (navigator as any).connection,
      });
    };

    updateSystemInfo();
    window.addEventListener('resize', updateSystemInfo);
    window.addEventListener('online', updateSystemInfo);
    window.addEventListener('offline', updateSystemInfo);

    return () => {
      window.removeEventListener('resize', updateSystemInfo);
      window.removeEventListener('online', updateSystemInfo);
      window.removeEventListener('offline', updateSystemInfo);
    };
  }, [isEnabled]);

  // Capture console errors and warnings
  React.useEffect(() => {
    if (!isEnabled) return;

    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      setErrors(prev => [...prev.slice(-9), args.join(' ')]);
      originalError(...args);
    };

    console.warn = (...args) => {
      setWarnings(prev => [...prev.slice(-9), args.join(' ')]);
      originalWarn(...args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [isEnabled]);

  // Keyboard shortcut to toggle overlay
  React.useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + D
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEnabled]);

  if (!isEnabled) return null;

  return (
    <>
      {/* Floating toggle button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-4 right-4 z-50 p-3 rounded-full',
          'bg-orange-500 text-white shadow-lg',
          'hover:bg-orange-600 transition-colors',
          'opacity-50 hover:opacity-100',
          isOpen && 'hidden'
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Open Dev Overlay (Cmd+Shift+D)"
      >
        <Monitor className="h-4 w-4" />
      </motion.button>

      {/* Overlay Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            className="fixed top-0 right-0 z-50 h-full w-96 bg-black/95 text-white p-4 overflow-y-auto font-mono text-xs"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="font-bold">Dev Overlay</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* System Info */}
            {systemInfo && (
              <div className="mb-4">
                <h3 className="font-bold mb-2 text-blue-400">System Info</h3>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {systemInfo.online ? (
                      <Wifi className="h-3 w-3 text-green-400" />
                    ) : (
                      <WifiOff className="h-3 w-3 text-red-400" />
                    )}
                    <span>{systemInfo.online ? 'Online' : 'Offline'}</span>
                  </div>
                  <div>Viewport: {systemInfo.viewport.width}x{systemInfo.viewport.height}</div>
                  {systemInfo.connection && (
                    <div>
                      Connection: {systemInfo.connection.effectiveType} 
                      ({systemInfo.connection.downlink}Mbps)
                    </div>
                  )}
                  <div>
                    Browser: {systemInfo.userAgent.split(' ').slice(-2).join(' ')}
                  </div>
                </div>
              </div>
            )}

            {/* Performance */}
            <div className="mb-4">
              <h3 className="font-bold mb-2 text-green-400">Performance</h3>
              <div className="space-y-1">
                {systemInfo?.memory && (
                  <>
                    <div>Load Time: {Math.round(systemInfo.memory.loadEventEnd - systemInfo.memory.navigationStart)}ms</div>
                    <div>DOM Ready: {Math.round(systemInfo.memory.domContentLoadedEventEnd - systemInfo.memory.navigationStart)}ms</div>
                  </>
                )}
                <div>Components: React {React.version}</div>
              </div>
            </div>

            {/* Memory Agent Status */}
            <div className="mb-4">
              <h3 className="font-bold mb-2 text-purple-400">Memory Agent</h3>
              <div className="space-y-1">
                <div>Build: {process.env.NODE_ENV}</div>
                <div>API: {typeof window !== 'undefined' && window.location.origin}/api</div>
                <div>Onboarding: {localStorage.getItem('memoryAgent.onboardingComplete') || 'Not completed'}</div>
                <div>Voice: {localStorage.getItem('tts-muted') === 'true' ? 'Muted' : 'Enabled'}</div>
              </div>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold mb-2 text-red-400">
                  Errors ({errors.length})
                  <button
                    onClick={() => setErrors([])}
                    className="ml-2 text-xs bg-red-600 px-2 py-1 rounded"
                  >
                    Clear
                  </button>
                </h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {errors.map((error, i) => (
                    <div key={i} className="text-red-300 text-wrap break-words">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold mb-2 text-yellow-400">
                  Warnings ({warnings.length})
                  <button
                    onClick={() => setWarnings([])}
                    className="ml-2 text-xs bg-yellow-600 px-2 py-1 rounded"
                  >
                    Clear
                  </button>
                </h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {warnings.map((warning, i) => (
                    <div key={i} className="text-yellow-300 text-wrap break-words">
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Commands */}
            <div className="mb-4">
              <h3 className="font-bold mb-2 text-cyan-400">Dev Commands</h3>
              <div className="space-y-2">
                <button
                  onClick={() => window.location.reload()}
                  className="block w-full text-left p-2 bg-white/10 rounded hover:bg-white/20"
                >
                  Reload Page
                </button>
                <button
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="block w-full text-left p-2 bg-white/10 rounded hover:bg-white/20"
                >
                  Clear Storage & Reload
                </button>
                <button
                  onClick={() => {
                    console.log('Local Storage:', localStorage);
                    console.log('Session Storage:', sessionStorage);
                  }}
                  className="block w-full text-left p-2 bg-white/10 rounded hover:bg-white/20"
                >
                  Log Storage to Console
                </button>
              </div>
            </div>

            {/* Shortcuts */}
            <div className="text-gray-400 text-xs">
              <div>⌘+Shift+D: Toggle overlay</div>
              <div>⌘+K: Command palette</div>
              <div>⌘+R: Reload</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}