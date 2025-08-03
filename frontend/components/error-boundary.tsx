'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCw, Home, Send } from '@/lib/icons';
import { reportComponentError } from '@/lib/error-reporter';
import { cn } from '@/lib/utils';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showErrorDetails?: boolean;
  componentName?: string;
}

interface ErrorFallbackProps {
  error: Error | null;
  errorId: string | null;
  retryCount: number;
  onRetry: () => void;
  onReport: () => void;
  showDetails: boolean;
  componentName?: string;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  async componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const componentName = this.props.componentName || 'UnknownComponent';
    
    try {
      // Report error to backend
      const errorId = await reportComponentError(error, componentName, {
        componentStack: errorInfo.componentStack,
        errorBoundary: componentName
      });

      this.setState({ errorId });

      // Call custom error handler if provided
      if (this.props.onError) {
        this.props.onError(error, errorInfo);
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }

    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    const { retryCount } = this.state;
    const maxRetries = 3;

    if (retryCount < maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorId: null,
        retryCount: retryCount + 1
      });

      // Auto-reset retry count after 5 minutes
      if (this.retryTimeoutId) {
        clearTimeout(this.retryTimeoutId);
      }
      
      this.retryTimeoutId = setTimeout(() => {
        this.setState({ retryCount: 0 });
      }, 5 * 60 * 1000);
    }
  };

  handleReport = async () => {
    const { error, errorId } = this.state;
    
    if (error && errorId) {
      // This could trigger a user feedback dialog
      const feedback = prompt('Please describe what you were doing when this error occurred:');
      
      if (feedback) {
        try {
          const { errorReporter } = await import('@/lib/error-reporter');
          await errorReporter.addUserFeedback(errorId, feedback, false);
          alert('Thank you for your feedback! We\'ll investigate this issue.');
        } catch (error) {
          console.error('Failed to send feedback:', error);
          alert('Failed to send feedback. Please try again later.');
        }
      }
    }
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorId={this.state.errorId}
          retryCount={this.state.retryCount}
          onRetry={this.handleRetry}
          onReport={this.handleReport}
          showDetails={this.props.showErrorDetails ?? false}
          componentName={this.props.componentName}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
function DefaultErrorFallback({
  error,
  errorId,
  retryCount,
  onRetry,
  onReport,
  showDetails,
  componentName
}: ErrorFallbackProps) {
  const maxRetries = 3;
  const canRetry = retryCount < maxRetries;

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
            Something went wrong
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400">
            {componentName ? `Error in ${componentName}` : 'An unexpected error occurred'}
          </p>
        </div>
      </div>

      {showDetails && error && (
        <div className="w-full max-w-md mb-4">
          <details className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
            <summary className="cursor-pointer text-sm font-medium text-red-700 dark:text-red-300">
              Error Details
            </summary>
            <pre className="mt-2 text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
              {error.message}
              {error.stack && '\n\n' + error.stack}
            </pre>
          </details>
        </div>
      )}

      {errorId && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
          Error ID: {errorId}
        </p>
      )}

      <div className="flex gap-3">
        {canRetry && (
          <button
            onClick={onRetry}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg',
              'bg-blue-600 hover:bg-blue-700 text-white',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            )}
          >
            <RefreshCw className="h-4 w-4" />
            Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
          </button>
        )}

        <button
          onClick={onReport}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg',
            'bg-gray-600 hover:bg-gray-700 text-white',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
          )}
        >
          <Send className="h-4 w-4" />
          Report Issue
        </button>

        <button
          onClick={() => window.location.href = '/'}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg',
            'bg-green-600 hover:bg-green-700 text-white',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
          )}
        >
          <Home className="h-4 w-4" />
          Go Home
        </button>
      </div>

      {!canRetry && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-4 text-center">
          Maximum retry attempts reached. Please refresh the page or contact support.
        </p>
      )}
    </div>
  );
}

// Specialized error boundary for chat components
export function ChatErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      componentName="ChatInterface"
      showErrorDetails={process.env.NODE_ENV === 'development'}
      fallback={ChatErrorFallback}
    >
      {children}
    </ErrorBoundary>
  );
}

function ChatErrorFallback({ onRetry, onReport }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
      <AlertTriangle className="h-6 w-6 text-red-500 mb-3" />
      <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
        Chat Error
      </h3>
      <p className="text-xs text-red-600 dark:text-red-400 mb-4 text-center">
        The chat interface encountered an error. Your conversation history is safe.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onRetry}
          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          Retry
        </button>
        <button
          onClick={onReport}
          className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
        >
          Report
        </button>
      </div>
    </div>
  );
}

// Specialized error boundary for agent components
export function AgentErrorBoundary({ 
  children, 
  agentId 
}: { 
  children: React.ReactNode; 
  agentId: string;
}) {
  return (
    <ErrorBoundary
      componentName={`Agent-${agentId}`}
      showErrorDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;