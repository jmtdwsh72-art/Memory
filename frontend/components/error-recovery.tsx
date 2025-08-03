'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, X, Send, Wifi, WifiOff } from '@/lib/icons';
import { reportError } from '@/lib/error-reporter';
import { cn } from '@/lib/utils';

interface ErrorRecoveryProps {
  error: Error;
  onRetry: () => void | Promise<void>;
  onDismiss?: () => void;
  context?: string;
  showDetails?: boolean;
  maxRetries?: number;
  className?: string;
}

interface RetryState {
  count: number;
  isRetrying: boolean;
  lastRetryTime: number | null;
}

export function ErrorRecovery({
  error,
  onRetry,
  onDismiss,
  context = '',
  showDetails = false,
  maxRetries = 3,
  className
}: ErrorRecoveryProps) {
  const [retryState, setRetryState] = React.useState<RetryState>({
    count: 0,
    isRetrying: false,
    lastRetryTime: null
  });
  const [isOnline, setIsOnline] = React.useState(true);
  const [feedback, setFeedback] = React.useState('');
  const [showFeedback, setShowFeedback] = React.useState(false);
  const [feedbackSent, setFeedbackSent] = React.useState(false);

  // Monitor network status
  React.useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const handleRetry = async () => {
    if (retryState.count >= maxRetries || retryState.isRetrying) return;

    setRetryState(prev => ({
      ...prev,
      isRetrying: true,
      lastRetryTime: Date.now()
    }));

    try {
      await onRetry();
      
      // Reset retry count on successful retry
      setRetryState(prev => ({
        ...prev,
        count: 0,
        isRetrying: false
      }));
    } catch (retryError) {
      setRetryState(prev => ({
        ...prev,
        count: prev.count + 1,
        isRetrying: false
      }));

      // Report retry failure
      if (retryError instanceof Error) {
        await reportError(retryError, {
          component: 'ErrorRecovery',
          action: 'retry_failed',
          additionalData: {
            originalError: error.message,
            retryCount: retryState.count + 1,
            context
          }
        });
      }
    }
  };

  const handleSendFeedback = async () => {
    if (!feedback.trim()) return;

    try {
      // Report the error with user feedback
      await reportError(error, {
        component: 'ErrorRecovery',
        action: 'user_feedback',
        additionalData: {
          feedback: feedback.trim(),
          context,
          retryCount: retryState.count
        }
      });

      setFeedbackSent(true);
      setShowFeedback(false);
      
      setTimeout(() => {
        setFeedbackSent(false);
      }, 3000);
    } catch (feedbackError) {
      console.error('Failed to send feedback:', feedbackError);
    }
  };

  const canRetry = retryState.count < maxRetries && !retryState.isRetrying;
  const timeSinceLastRetry = retryState.lastRetryTime ? Date.now() - retryState.lastRetryTime : null;
  const cooldownRemaining = timeSinceLastRetry && timeSinceLastRetry < 5000 ? 5000 - timeSinceLastRetry : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className={cn(
        'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4',
        'shadow-sm relative',
        className
      )}
    >
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
          aria-label="Dismiss error"
        >
          <X className="h-3 w-3 text-red-600 dark:text-red-400" />
        </button>
      )}

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Error header */}
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Something went wrong
            </h3>
            {!isOnline && (
              <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                <WifiOff className="h-3 w-3" />
                <span>Offline</span>
              </div>
            )}
          </div>

          {/* Error message */}
          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
            {error.message || 'An unexpected error occurred'}
            {context && (
              <span className="block text-xs text-red-600 dark:text-red-400 mt-1">
                Context: {context}
              </span>
            )}
          </p>

          {/* Network status warning */}
          {!isOnline && (
            <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-700 dark:text-red-300">
              <div className="flex items-center gap-1 mb-1">
                <WifiOff className="h-3 w-3" />
                <span className="font-medium">No internet connection</span>
              </div>
              <p>Please check your connection and try again.</p>
            </div>
          )}

          {/* Error details */}
          {showDetails && error.stack && (
            <details className="mb-3">
              <summary className="cursor-pointer text-xs font-medium text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200">
                Technical Details
              </summary>
              <pre className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 p-2 rounded overflow-x-auto">
                {error.stack}
              </pre>
            </details>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            {canRetry && isOnline && (
              <button
                onClick={handleRetry}
                disabled={retryState.isRetrying || cooldownRemaining > 0}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded',
                  'bg-blue-600 hover:bg-blue-700 text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
                )}
              >
                <RefreshCw className={cn('h-3 w-3', retryState.isRetrying && 'animate-spin')} />
                {retryState.isRetrying ? 'Retrying...' : 
                 cooldownRemaining > 0 ? `Wait ${Math.ceil(cooldownRemaining / 1000)}s` :
                 `Try Again ${retryState.count > 0 ? `(${retryState.count}/${maxRetries})` : ''}`}
              </button>
            )}

            {!showFeedback && !feedbackSent && (
              <button
                onClick={() => setShowFeedback(true)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded',
                  'bg-gray-600 hover:bg-gray-700 text-white',
                  'transition-colors duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1'
                )}
              >
                <Send className="h-3 w-3" />
                Report Issue
              </button>
            )}

            {isOnline && (
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Wifi className="h-3 w-3" />
                <span>Online</span>
              </div>
            )}
          </div>

          {/* Retry limit reached */}
          {retryState.count >= maxRetries && (
            <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-700 dark:text-red-300">
              <p className="font-medium mb-1">Maximum retry attempts reached</p>
              <p>Please refresh the page or contact support if the problem persists.</p>
            </div>
          )}

          {/* Feedback form */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-red-200 dark:border-red-800 pt-3 mt-3"
              >
                <p className="text-xs text-red-700 dark:text-red-300 mb-2">
                  Help us improve by describing what you were doing when this error occurred:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="What were you trying to do?"
                    className={cn(
                      'flex-1 px-2 py-1 text-xs border rounded',
                      'border-red-300 dark:border-red-700',
                      'bg-white dark:bg-red-950/50',
                      'text-red-900 dark:text-red-100',
                      'placeholder-red-500 dark:placeholder-red-400',
                      'focus:outline-none focus:ring-1 focus:ring-red-500'
                    )}
                    maxLength={200}
                  />
                  <button
                    onClick={handleSendFeedback}
                    disabled={!feedback.trim()}
                    className={cn(
                      'px-2 py-1 text-xs rounded',
                      'bg-red-600 hover:bg-red-700 text-white',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'transition-colors duration-200'
                    )}
                  >
                    Send
                  </button>
                  <button
                    onClick={() => setShowFeedback(false)}
                    className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feedback confirmation */}
          <AnimatePresence>
            {feedbackSent && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-3 p-2 bg-green-100 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded text-xs text-green-700 dark:text-green-300"
              >
                <p className="font-medium">Thank you for your feedback!</p>
                <p>We'll investigate this issue and work on improvements.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// Hook to use error recovery in components
export function useErrorRecovery() {
  const [error, setError] = React.useState<Error | null>(null);
  const [retryFunction, setRetryFunction] = React.useState<(() => void | Promise<void>) | null>(null);

  const showError = React.useCallback((error: Error, retryFn?: () => void | Promise<void>) => {
    setError(error);
    if (retryFn) {
      setRetryFunction(() => retryFn);
    }
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
    setRetryFunction(null);
  }, []);

  const retryWithFunction = React.useCallback(async () => {
    if (retryFunction) {
      try {
        await retryFunction();
        clearError();
      } catch (error) {
        // Error will be handled by the retry mechanism
        throw error;
      }
    }
  }, [retryFunction, clearError]);

  return {
    error,
    showError,
    clearError,
    retry: retryWithFunction,
    ErrorComponent: error ? (
      <ErrorRecovery
        error={error}
        onRetry={retryWithFunction}
        onDismiss={clearError}
        showDetails={process.env.NODE_ENV === 'development'}
      />
    ) : null
  };
}