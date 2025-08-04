'use client';

/**
 * Frontend error reporting utility
 * Captures client-side errors and sends them to the backend error logging system
 */

export interface FrontendErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorReport {
  type: 'UI' | 'API' | 'AGENT' | 'SYSTEM';
  message: string;
  stack?: string;
  context: FrontendErrorContext;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

class ErrorReporter {
  private static instance: ErrorReporter;
  private errorQueue: ErrorReport[] = [];
  private isOnline: boolean = true;
  private userId?: string;
  private sessionId?: string;

  private constructor() {
    this.setupGlobalErrorHandlers();
    this.setupNetworkMonitoring();
    this.sessionId = this.generateSessionId();
  }

  public static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  /**
   * Report an error to the backend logging system
   */
  async reportError(
    error: Error | string,
    context: FrontendErrorContext = {},
    type: ErrorReport['type'] = 'UI'
  ): Promise<string | null> {
    const errorReport: ErrorReport = {
      type,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      context: {
        ...context,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        timestamp: new Date().toISOString(),
        userId: this.userId,
        sessionId: this.sessionId
      },
      severity: this.determineSeverity(error, type, context)
    };

    // Add to queue for offline support
    this.errorQueue.push(errorReport);

    // Try to send immediately if online
    if (this.isOnline) {
      return await this.sendErrorReport(errorReport);
    }

    return null;
  }

  /**
   * Report API errors specifically
   */
  async reportAPIError(
    error: Error,
    endpoint: string,
    method: string,
    statusCode?: number
  ): Promise<string | null> {
    return this.reportError(error, {
      action: `${method} ${endpoint}`,
      additionalData: { statusCode }
    }, 'API');
  }

  /**
   * Report agent-related errors
   */
  async reportAgentError(
    error: Error,
    agentId: string,
    input?: string
  ): Promise<string | null> {
    return this.reportError(error, {
      component: `agent-${agentId}`,
      action: 'agent_processing',
      additionalData: { agentId, input: input?.substring(0, 100) }
    }, 'AGENT');
  }

  /**
   * Report component errors (for use in error boundaries)
   */
  async reportComponentError(
    error: Error,
    componentName: string,
    props?: Record<string, any>
  ): Promise<string | null> {
    return this.reportError(error, {
      component: componentName,
      action: 'component_render',
      additionalData: { props: this.sanitizeProps(props) }
    }, 'UI');
  }

  /**
   * Set user context for error reporting
   */
  setUserContext(userId: string): void {
    this.userId = userId;
  }

  /**
   * Add user feedback to an error
   */
  async addUserFeedback(
    errorId: string,
    feedback: string,
    helpful: boolean
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/errors/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          errorId,
          feedback,
          helpful,
          timestamp: new Date().toISOString()
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send error feedback:', error);
      return false;
    }
  }

  /**
   * Clear error queue (useful for testing)
   */
  clearErrorQueue(): void {
    this.errorQueue = [];
  }

  /**
   * Get pending errors count
   */
  getPendingErrorsCount(): number {
    return this.errorQueue.length;
  }

  private async sendErrorReport(errorReport: ErrorReport): Promise<string | null> {
    try {
      const response = await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorReport)
      });

      if (response.ok) {
        const result = await response.json();
        // Remove from queue on successful send
        const index = this.errorQueue.indexOf(errorReport);
        if (index > -1) {
          this.errorQueue.splice(index, 1);
        }
        return result.errorId;
      } else {
        console.error('Failed to send error report:', response.statusText);
        return null;
      }
    } catch (error) {
      console.error('Error sending error report:', error);
      return null;
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Only setup handlers on client side
    if (typeof window === 'undefined') return;
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        {
          action: 'unhandled_promise_rejection',
          additionalData: { reason: event.reason }
        },
        'SYSTEM'
      );
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError(
        new Error(event.message),
        {
          component: event.filename,
          action: 'global_error',
          additionalData: {
            line: event.lineno,
            column: event.colno,
            filename: event.filename
          }
        },
        'SYSTEM'
      );
    });

    // Handle resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        const target = event.target as HTMLElement;
        this.reportError(
          new Error(`Resource loading failed: ${target.tagName}`),
          {
            action: 'resource_load_error',
            additionalData: {
              tagName: target.tagName,
              src: (target as any).src || (target as any).href
            }
          },
          'UI'
        );
      }
    }, true);
  }

  private setupNetworkMonitoring(): void {
    // Only setup network monitoring on client side
    if (typeof window === 'undefined') return;
    
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushErrorQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    this.isOnline = navigator.onLine;
  }

  private async flushErrorQueue(): Promise<void> {
    if (!this.isOnline || this.errorQueue.length === 0) return;

    // Send all queued errors
    const errors = [...this.errorQueue];
    for (const error of errors) {
      await this.sendErrorReport(error);
    }
  }

  private determineSeverity(
    error: Error | string,
    type: ErrorReport['type'],
    context: FrontendErrorContext
  ): ErrorReport['severity'] {
    const message = typeof error === 'string' ? error : error.message;

    // Critical errors
    if (type === 'SYSTEM' || message.includes('Cannot read property') || message.includes('is not a function')) {
      return 'CRITICAL';
    }

    // High severity for agent failures and API errors
    if (type === 'AGENT' || type === 'API') {
      return 'HIGH';
    }

    // Medium for component errors
    if (type === 'UI' && context.component) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private sanitizeProps(props?: Record<string, any>): Record<string, any> | undefined {
    if (!props) return undefined;

    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(props)) {
      // Skip functions and large objects
      if (typeof value === 'function') {
        sanitized[key] = '[Function]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = '[Object]';
      } else if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = value.substring(0, 100) + '...';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private generateSessionId(): string {
    // Generate a proper UUID v4 format
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Export singleton instance
export const errorReporter = ErrorReporter.getInstance();

// Convenience functions
export const reportError = (error: Error | string, context?: FrontendErrorContext, type?: ErrorReport['type']) =>
  errorReporter.reportError(error, context, type);

export const reportAPIError = (error: Error, endpoint: string, method: string, statusCode?: number) =>
  errorReporter.reportAPIError(error, endpoint, method, statusCode);

export const reportAgentError = (error: Error, agentId: string, input?: string) =>
  errorReporter.reportAgentError(error, agentId, input);

export const reportComponentError = (error: Error, componentName: string, props?: Record<string, any>) =>
  errorReporter.reportComponentError(error, componentName, props);