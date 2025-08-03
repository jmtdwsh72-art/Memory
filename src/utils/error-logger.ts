import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { errorConfig } from '../config/error-config';

// Error types for categorization
export type ErrorType = 'API' | 'AGENT' | 'UI' | 'MEMORY' | 'TTS' | 'TRANSCRIPTION' | 'SYSTEM';

// Error severity levels
export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Structured error log entry
export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  type: ErrorType;
  severity: ErrorSeverity;
  agentId?: string;
  userId?: string;
  message: string;
  stack?: string;
  context: {
    input?: string;
    output?: string;
    memoryUsed?: string[];
    userAgent?: string;
    url?: string;
    sessionId?: string;
    requestId?: string;
  };
  metadata: {
    environment: string;
    version: string;
    nodeVersion: string;
  };
  resolved: boolean;
  userFeedback?: {
    message: string;
    timestamp: string;
    helpful: boolean;
  };
}

// Error statistics for monitoring
export interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<ErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByAgent: Record<string, number>;
  recentErrors: ErrorLogEntry[];
  topErrors: { message: string; count: number }[];
}

class ErrorLogger {
  private logsDir: string;
  private maxLogFileSize: number;
  private maxLogFiles: number;
  private tokenLimit: number;
  private rateLimiter: Map<string, number[]> = new Map();

  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs', 'errors');
    this.maxLogFileSize = errorConfig.retention.maxFileSize;
    this.maxLogFiles = errorConfig.retention.maxFiles;
    this.tokenLimit = errorConfig.privacy.maxContextLength;
    this.ensureLogsDirectory();
  }

  // Ensure logs directory exists
  private ensureLogsDirectory(): void {
    try {
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }
  }

  // Generate unique error ID
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Sanitize sensitive information from context
  private sanitizeContext(context: any): any {
    if (!errorConfig.privacy.sanitizePersonalData) {
      return context;
    }

    const sanitized = { ...context };
    
    // Remove or redact sensitive fields
    if (sanitized.input && sanitized.input.length > this.tokenLimit) {
      sanitized.input = sanitized.input.substring(0, this.tokenLimit) + '... [REDACTED]';
    }
    
    if (sanitized.output && sanitized.output.length > this.tokenLimit) {
      sanitized.output = sanitized.output.substring(0, this.tokenLimit) + '... [REDACTED]';
    }

    // Hash user IDs if configured
    if (errorConfig.privacy.hashUserIds && sanitized.userId) {
      sanitized.userId = this.hashValue(sanitized.userId);
    }

    // Remove potential sensitive patterns if configured
    if (errorConfig.privacy.redactSensitiveFields) {
      const sensitivePatterns = [
        /api[_-]?key[_-]?[a-zA-Z0-9]+/gi,
        /token[_-]?[a-zA-Z0-9]+/gi,
        /password[_-]?[a-zA-Z0-9]+/gi,
        /secret[_-]?[a-zA-Z0-9]+/gi,
        /bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, // Email addresses
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/gi, // Credit card numbers
        /\b\d{3}-\d{2}-\d{4}\b/gi, // SSN format
      ];

      Object.keys(sanitized).forEach(key => {
        if (typeof sanitized[key] === 'string') {
          sensitivePatterns.forEach(pattern => {
            sanitized[key] = sanitized[key].replace(pattern, '[REDACTED]');
          });
        }
      });
    }

    // Apply data minimization if configured
    if (errorConfig.compliance.dataMinimization) {
      // Remove potentially unnecessary fields
      delete sanitized.userAgent;
      delete sanitized.ip;
      
      // Limit memoryUsed array length
      if (sanitized.memoryUsed && Array.isArray(sanitized.memoryUsed) && sanitized.memoryUsed.length > 5) {
        sanitized.memoryUsed = sanitized.memoryUsed.slice(0, 5);
      }
    }

    return sanitized;
  }

  // Determine error severity based on type and context
  private determineSeverity(type: ErrorType, error: Error, context: any): ErrorSeverity {
    // Critical errors that affect core functionality
    if (type === 'SYSTEM' || type === 'MEMORY') {
      return 'CRITICAL';
    }

    // High severity for agent failures
    if (type === 'AGENT' && error.message.toLowerCase().includes('timeout')) {
      return 'HIGH';
    }

    // Medium severity for API issues
    if (type === 'API' || type === 'TTS' || type === 'TRANSCRIPTION') {
      return 'MEDIUM';
    }

    // Default to low for UI errors
    return 'LOW';
  }

  // Log error to file system
  private async logToFile(errorEntry: ErrorLogEntry): Promise<void> {
    try {
      const filename = `errors_${new Date().toISOString().split('T')[0]}.jsonl`;
      const filepath = path.join(this.logsDir, filename);
      
      const logLine = JSON.stringify(errorEntry) + '\n';
      
      // Append to current day's log file
      fs.appendFileSync(filepath, logLine, 'utf8');
      
      // Rotate logs if needed
      await this.rotateLogsIfNeeded();
    } catch (error) {
      console.error('Failed to write error log:', error);
    }
  }

  // Log error to Supabase (when available)
  private async logToSupabase(errorEntry: ErrorLogEntry): Promise<void> {
    try {
      // This would be implemented when Supabase is connected
      // const { createClient } = require('@supabase/supabase-js');
      // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
      // await supabase.from('errors').insert(errorEntry);
      
      console.debug('Supabase logging not implemented yet');
    } catch (error) {
      console.error('Failed to log to Supabase:', error);
    }
  }

  // Rotate log files to prevent excessive disk usage
  private async rotateLogsIfNeeded(): Promise<void> {
    try {
      const files = fs.readdirSync(this.logsDir)
        .filter(file => file.startsWith('errors_') && file.endsWith('.jsonl'))
        .map(file => ({
          name: file,
          path: path.join(this.logsDir, file),
          stats: fs.statSync(path.join(this.logsDir, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Remove old files if we have too many
      if (files.length > this.maxLogFiles) {
        const filesToDelete = files.slice(this.maxLogFiles);
        filesToDelete.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }

      // Check if current file is too large
      if (files.length > 0 && files[0].stats.size > this.maxLogFileSize) {
        const currentFile = files[0];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archivePath = path.join(this.logsDir, `errors_archived_${timestamp}.jsonl`);
        fs.renameSync(currentFile.path, archivePath);
      }
    } catch (error) {
      console.error('Failed to rotate logs:', error);
    }
  }

  // Hash sensitive values
  private hashValue(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex').substring(0, 16);
  }

  // Check rate limiting
  private checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    // Clean old entries
    const timestamps = this.rateLimiter.get(identifier) || [];
    const recentTimestamps = timestamps.filter(ts => ts > hourAgo);
    
    if (recentTimestamps.length >= errorConfig.reporting.rateLimitPerHour) {
      return false; // Rate limit exceeded
    }
    
    // Add current timestamp
    recentTimestamps.push(now);
    this.rateLimiter.set(identifier, recentTimestamps);
    
    return true;
  }

  // Main logging method
  async log(
    type: ErrorType,
    error: Error | string,
    context: {
      agentId?: string;
      userId?: string;
      input?: string;
      output?: string;
      memoryUsed?: string[];
      userAgent?: string;
      url?: string;
      sessionId?: string;
      requestId?: string;
      ip?: string;
    } = {}
  ): Promise<string> {
    // Check if error logging is enabled
    if (!errorConfig.enabled) {
      return 'logging_disabled';
    }

    // Check rate limiting (use IP or sessionId as identifier)
    const rateLimitId = context.ip || context.sessionId || 'anonymous';
    if (!this.checkRateLimit(rateLimitId)) {
      console.warn('Error logging rate limit exceeded for:', rateLimitId);
      return 'rate_limited';
    }

    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const errorId = this.generateErrorId();
    
    const errorEntry: ErrorLogEntry = {
      id: errorId,
      timestamp: new Date().toISOString(),
      type,
      severity: this.determineSeverity(type, errorObj, context),
      agentId: context.agentId,
      userId: context.userId,
      message: errorObj.message,
      stack: errorObj.stack,
      context: this.sanitizeContext(context),
      metadata: {
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        nodeVersion: process.version
      },
      resolved: false
    };

    // Log to file system (always available)
    await this.logToFile(errorEntry);
    
    // Log to Supabase (when configured and enabled)
    if (errorConfig.reporting.enableSupabaseLogging && 
        process.env.SUPABASE_URL && 
        process.env.SUPABASE_ERRORS_TABLE) {
      await this.logToSupabase(errorEntry);
    }

    // Send critical error notifications
    if (errorEntry.severity === 'CRITICAL') {
      await this.sendCriticalErrorNotification(errorEntry);
    }

    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${type}] ${errorObj.message}`, {
        errorId,
        agentId: context.agentId,
        severity: errorEntry.severity
      });
    }

    return errorId;
  }

  // Send critical error notifications
  private async sendCriticalErrorNotification(errorEntry: ErrorLogEntry): Promise<void> {
    try {
      // Email notification
      if (errorConfig.notifications.criticalErrorsEmail) {
        // In a real implementation, this would use a service like SendGrid, AWS SES, etc.
        console.error('CRITICAL ERROR NOTIFICATION:', {
          to: errorConfig.notifications.criticalErrorsEmail,
          subject: `Critical Error in Memory Agent: ${errorEntry.message}`,
          errorId: errorEntry.id,
          timestamp: errorEntry.timestamp,
          type: errorEntry.type,
          agentId: errorEntry.agentId
        });
      }

      // Webhook notification
      if (errorConfig.notifications.criticalErrorsWebhook) {
        try {
          await fetch(errorConfig.notifications.criticalErrorsWebhook, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Memory-Agent-Error-Notifier/1.0'
            },
            body: JSON.stringify({
              level: 'critical',
              service: 'memory-agent',
              error: {
                id: errorEntry.id,
                message: errorEntry.message,
                type: errorEntry.type,
                agentId: errorEntry.agentId,
                timestamp: errorEntry.timestamp
              },
              environment: errorEntry.metadata.environment
            })
          });
        } catch (webhookError) {
          console.error('Failed to send webhook notification:', webhookError);
        }
      }
    } catch (error) {
      console.error('Failed to send critical error notification:', error);
    }
  }

  // Add user feedback to an error
  async addUserFeedback(
    errorId: string,
    feedback: {
      message: string;
      helpful: boolean;
    }
  ): Promise<boolean> {
    try {
      // For file-based storage, we would need to read, modify, and rewrite
      // For now, log as a new entry
      await this.log('SYSTEM', `User feedback for ${errorId}: ${feedback.message}`, {
        requestId: errorId
      });
      return true;
    } catch (error) {
      console.error('Failed to add user feedback:', error);
      return false;
    }
  }

  // Get error statistics
  async getErrorStats(days: number = 7): Promise<ErrorStats> {
    try {
      const stats: ErrorStats = {
        totalErrors: 0,
        errorsByType: {} as Record<ErrorType, number>,
        errorsBySeverity: {} as Record<ErrorSeverity, number>,
        errorsByAgent: {},
        recentErrors: [],
        topErrors: []
      };

      const files = fs.readdirSync(this.logsDir)
        .filter(file => file.startsWith('errors_') && file.endsWith('.jsonl'))
        .map(file => path.join(this.logsDir, file));

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const errorCounts: Record<string, number> = {};

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const errorEntry: ErrorLogEntry = JSON.parse(line);
            const errorDate = new Date(errorEntry.timestamp);

            if (errorDate >= cutoffDate) {
              stats.totalErrors++;
              
              // Count by type
              stats.errorsByType[errorEntry.type] = (stats.errorsByType[errorEntry.type] || 0) + 1;
              
              // Count by severity
              stats.errorsBySeverity[errorEntry.severity] = (stats.errorsBySeverity[errorEntry.severity] || 0) + 1;
              
              // Count by agent
              if (errorEntry.agentId) {
                stats.errorsByAgent[errorEntry.agentId] = (stats.errorsByAgent[errorEntry.agentId] || 0) + 1;
              }

              // Track error messages for top errors
              errorCounts[errorEntry.message] = (errorCounts[errorEntry.message] || 0) + 1;

              // Add to recent errors (limit to 50)
              if (stats.recentErrors.length < 50) {
                stats.recentErrors.push(errorEntry);
              }
            }
          } catch (parseError) {
            console.error('Failed to parse error log line:', parseError);
          }
        }
      }

      // Generate top errors
      stats.topErrors = Object.entries(errorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([message, count]) => ({ message, count }));

      // Sort recent errors by timestamp (newest first)
      stats.recentErrors.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return stats;
    } catch (error) {
      console.error('Failed to get error stats:', error);
      return {
        totalErrors: 0,
        errorsByType: {} as Record<ErrorType, number>,
        errorsBySeverity: {} as Record<ErrorSeverity, number>,
        errorsByAgent: {},
        recentErrors: [],
        topErrors: []
      };
    }
  }

  // Get specific error by ID
  async getError(errorId: string): Promise<ErrorLogEntry | null> {
    try {
      const files = fs.readdirSync(this.logsDir)
        .filter(file => file.startsWith('errors_') && file.endsWith('.jsonl'))
        .map(file => path.join(this.logsDir, file));

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const errorEntry: ErrorLogEntry = JSON.parse(line);
            if (errorEntry.id === errorId) {
              return errorEntry;
            }
          } catch (parseError) {
            console.error('Failed to parse error log line:', parseError);
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to get error:', error);
      return null;
    }
  }
}

// Singleton instance
export const errorLogger = new ErrorLogger();

// Utility functions for common error types
export const logAgentError = (agentId: string, error: Error, context: any) => 
  errorLogger.log('AGENT', error, { agentId, ...context });

export const logAPIError = (error: Error, context: any) => 
  errorLogger.log('API', error, context);

export const logMemoryError = (error: Error, context: any) => 
  errorLogger.log('MEMORY', error, context);

export const logTTSError = (error: Error, context: any) => 
  errorLogger.log('TTS', error, context);

export const logTranscriptionError = (error: Error, context: any) => 
  errorLogger.log('TRANSCRIPTION', error, context);

export const logUIError = (error: Error, context: any) => 
  errorLogger.log('UI', error, context);

export const logSystemError = (error: Error, context: any) => 
  errorLogger.log('SYSTEM', error, context);

// Error wrapper for async functions
export function withErrorLogging<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorType: ErrorType,
  contextProvider?: (...args: Parameters<T>) => any
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const context = contextProvider ? contextProvider(...args) : {};
      await errorLogger.log(errorType, error as Error, context);
      throw error;
    }
  }) as T;
}