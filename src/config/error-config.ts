/**
 * Error logging configuration and compliance settings
 */

export interface ErrorConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  retention: {
    maxAge: number; // days
    maxFiles: number;
    maxFileSize: number; // bytes
  };
  privacy: {
    sanitizePersonalData: boolean;
    redactSensitiveFields: boolean;
    hashUserIds: boolean;
    maxContextLength: number;
  };
  reporting: {
    enableFrontendReporting: boolean;
    enableBackendReporting: boolean;
    enableSupabaseLogging: boolean;
    rateLimitPerHour: number;
  };
  compliance: {
    gdprCompliant: boolean;
    ccpaCompliant: boolean;
    dataMinimization: boolean;
    anonymizeAfterDays: number;
  };
  notifications: {
    criticalErrorsEmail?: string;
    criticalErrorsWebhook?: string;
    dailyReportEmail?: string;
  };
}

// Default configuration
export const defaultErrorConfig: ErrorConfig = {
  enabled: true,
  logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
  retention: {
    maxAge: 30, // 30 days
    maxFiles: 10,
    maxFileSize: 10 * 1024 * 1024 // 10MB
  },
  privacy: {
    sanitizePersonalData: true,
    redactSensitiveFields: true,
    hashUserIds: true,
    maxContextLength: 5000
  },
  reporting: {
    enableFrontendReporting: true,
    enableBackendReporting: true,
    enableSupabaseLogging: false, // Disabled by default until configured
    rateLimitPerHour: 100
  },
  compliance: {
    gdprCompliant: true,
    ccpaCompliant: true,
    dataMinimization: true,
    anonymizeAfterDays: 90
  },
  notifications: {
    // Will be loaded from environment variables
  }
};

// Load configuration from environment
export function loadErrorConfig(): ErrorConfig {
  const config = { ...defaultErrorConfig };

  // Override with environment variables
  if (process.env.ERROR_LOGGING_ENABLED === 'false') {
    config.enabled = false;
  }

  if (process.env.ERROR_LOG_LEVEL) {
    config.logLevel = process.env.ERROR_LOG_LEVEL as any;
  }

  if (process.env.ERROR_RETENTION_DAYS) {
    config.retention.maxAge = parseInt(process.env.ERROR_RETENTION_DAYS);
  }

  if (process.env.ERROR_MAX_FILES) {
    config.retention.maxFiles = parseInt(process.env.ERROR_MAX_FILES);
  }

  if (process.env.ERROR_MAX_FILE_SIZE) {
    config.retention.maxFileSize = parseInt(process.env.ERROR_MAX_FILE_SIZE);
  }

  if (process.env.ERROR_SANITIZE_DATA === 'false') {
    config.privacy.sanitizePersonalData = false;
  }

  if (process.env.ERROR_REDACT_SENSITIVE === 'false') {
    config.privacy.redactSensitiveFields = false;
  }

  if (process.env.ERROR_HASH_USER_IDS === 'false') {
    config.privacy.hashUserIds = false;
  }

  if (process.env.ERROR_MAX_CONTEXT_LENGTH) {
    config.privacy.maxContextLength = parseInt(process.env.ERROR_MAX_CONTEXT_LENGTH);
  }

  if (process.env.ERROR_FRONTEND_REPORTING === 'false') {
    config.reporting.enableFrontendReporting = false;
  }

  if (process.env.ERROR_BACKEND_REPORTING === 'false') {
    config.reporting.enableBackendReporting = false;
  }

  if (process.env.ERROR_SUPABASE_LOGGING === 'true') {
    config.reporting.enableSupabaseLogging = true;
  }

  if (process.env.ERROR_RATE_LIMIT_PER_HOUR) {
    config.reporting.rateLimitPerHour = parseInt(process.env.ERROR_RATE_LIMIT_PER_HOUR);
  }

  if (process.env.ERROR_GDPR_COMPLIANT === 'false') {
    config.compliance.gdprCompliant = false;
  }

  if (process.env.ERROR_CCPA_COMPLIANT === 'false') {
    config.compliance.ccpaCompliant = false;
  }

  if (process.env.ERROR_DATA_MINIMIZATION === 'false') {
    config.compliance.dataMinimization = false;
  }

  if (process.env.ERROR_ANONYMIZE_AFTER_DAYS) {
    config.compliance.anonymizeAfterDays = parseInt(process.env.ERROR_ANONYMIZE_AFTER_DAYS);
  }

  // Notification settings
  if (process.env.ERROR_CRITICAL_EMAIL) {
    config.notifications.criticalErrorsEmail = process.env.ERROR_CRITICAL_EMAIL;
  }

  if (process.env.ERROR_CRITICAL_WEBHOOK) {
    config.notifications.criticalErrorsWebhook = process.env.ERROR_CRITICAL_WEBHOOK;
  }

  if (process.env.ERROR_DAILY_REPORT_EMAIL) {
    config.notifications.dailyReportEmail = process.env.ERROR_DAILY_REPORT_EMAIL;
  }

  return config;
}

// Validate configuration
export function validateErrorConfig(config: ErrorConfig): string[] {
  const errors: string[] = [];

  if (config.retention.maxAge < 1) {
    errors.push('Retention maxAge must be at least 1 day');
  }

  if (config.retention.maxFiles < 1) {
    errors.push('Retention maxFiles must be at least 1');
  }

  if (config.retention.maxFileSize < 1024) {
    errors.push('Retention maxFileSize must be at least 1KB');
  }

  if (config.privacy.maxContextLength < 100) {
    errors.push('Privacy maxContextLength must be at least 100 characters');
  }

  if (config.reporting.rateLimitPerHour < 1) {
    errors.push('Reporting rateLimitPerHour must be at least 1');
  }

  if (config.compliance.anonymizeAfterDays < 1) {
    errors.push('Compliance anonymizeAfterDays must be at least 1 day');
  }

  // GDPR compliance checks
  if (config.compliance.gdprCompliant) {
    if (!config.privacy.sanitizePersonalData) {
      errors.push('GDPR compliance requires personal data sanitization');
    }
    if (!config.compliance.dataMinimization) {
      errors.push('GDPR compliance requires data minimization');
    }
  }

  // CCPA compliance checks
  if (config.compliance.ccpaCompliant) {
    if (!config.privacy.sanitizePersonalData) {
      errors.push('CCPA compliance requires personal data sanitization');
    }
  }

  return errors;
}

// Get current configuration
export const errorConfig = loadErrorConfig();

// Validate on load
const configErrors = validateErrorConfig(errorConfig);
if (configErrors.length > 0) {
  console.error('Error configuration validation failed:');
  configErrors.forEach(error => console.error(`  - ${error}`));
  
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Invalid error configuration detected in production');
  }
}