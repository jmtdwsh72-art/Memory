'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, RotateCcw, Smile, AlertTriangle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resetOnboarding } from '@/lib/onboarding';
import { ErrorAdminPanel } from './error-admin-panel';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function SettingsPanel({ isOpen, onClose, className }: SettingsPanelProps) {
  const [isResetting, setIsResetting] = React.useState(false);
  const [showErrorAdmin, setShowErrorAdmin] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);

  // Check admin status (in a real app, this would be based on user roles)
  React.useEffect(() => {
    // For development, check if running in dev mode
    setIsAdmin(process.env.NODE_ENV === 'development');
  }, []);

  const handleReplayWelcomeTour = async () => {
    setIsResetting(true);
    
    try {
      // Reset onboarding state
      resetOnboarding();
      
      // Show confirmation and reload
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to reset onboarding:', error);
      setIsResetting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'fixed right-0 top-0 z-50 h-full w-80 bg-card border-l border-border shadow-lg',
              'flex flex-col',
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-card-foreground">Settings</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-accent rounded-md transition-colors"
                aria-label="Close settings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-6">
                {/* Onboarding Section */}
                <div>
                  <h3 className="text-sm font-medium text-card-foreground mb-3">
                    Welcome Tour
                  </h3>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Want to see the welcome introduction again? This will reset your onboarding state and show the Welcome Agent tutorial.
                    </p>
                    
                    <motion.button
                      onClick={handleReplayWelcomeTour}
                      disabled={isResetting}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3',
                        'bg-sky-500/10 border border-sky-200 dark:border-sky-800',
                        'text-sky-700 dark:text-sky-300 rounded-lg',
                        'hover:bg-sky-500/20 transition-all duration-200',
                        'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {isResetting ? (
                        <>
                          <motion.div
                            className="h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                          <span className="text-sm font-medium">Resetting...</span>
                        </>
                      ) : (
                        <>
                          <Smile className="h-4 w-4" />
                          <span className="text-sm font-medium">Replay Welcome Tour</span>
                          <RotateCcw className="h-4 w-4 ml-auto" />
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>

                {/* Future Settings Sections */}
                <div>
                  <h3 className="text-sm font-medium text-card-foreground mb-3">
                    Voice Settings
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Voice settings are available in the top toolbar.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-card-foreground mb-3">
                    Memory Settings
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Memory management is available through the Memory Viewer panel.
                  </p>
                </div>

                {/* Admin Section */}
                {isAdmin && (
                  <div>
                    <h3 className="text-sm font-medium text-card-foreground mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-orange-500" />
                      Administration
                    </h3>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Administrative tools for monitoring and managing the system.
                      </p>
                      
                      <motion.button
                        onClick={() => setShowErrorAdmin(true)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3',
                          'bg-red-500/10 border border-red-200 dark:border-red-800',
                          'text-red-700 dark:text-red-300 rounded-lg',
                          'hover:bg-red-500/20 transition-all duration-200',
                          'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
                        )}
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Error Management</span>
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border p-4">
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Memory Agent v1.0</div>
                <div>Built with Claude Code</div>
              </div>
            </div>
          </motion.div>
        </>
      )}
      
      {/* Error Admin Panel */}
      <ErrorAdminPanel
        isOpen={showErrorAdmin}
        onClose={() => setShowErrorAdmin(false)}
      />
    </AnimatePresence>
  );
}

// Settings toggle button component
interface SettingsToggleProps {
  onClick: () => void;
  className?: string;
}

export function SettingsToggle({ onClick, className }: SettingsToggleProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'p-2 rounded-lg transition-all duration-200 ease-out',
        'hover:bg-accent hover:shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'flex items-center gap-2 transform-gpu will-change-transform',
        className
      )}
      aria-label="Open settings"
    >
      <Settings className="h-4 w-4" />
      <span className="hidden sm:inline text-sm font-medium">Settings</span>
    </motion.button>
  );
}