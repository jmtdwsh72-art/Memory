# Error Logging and Recovery System

This document describes the comprehensive error logging and recovery system implemented in the Memory Agent project.

## Overview

The error logging system provides:
- Structured error logging with categorization and severity levels
- Frontend error boundaries and automatic recovery mechanisms
- Backend error handling with context sanitization
- Admin tools for error inspection and management
- GDPR and CCPA compliant data handling
- Real-time error notifications for critical issues

## Architecture

### Components

1. **ErrorLogger Utility** (`src/utils/error-logger.ts`)
   - Central error logging service
   - Configurable sanitization and privacy controls
   - File-based storage with automatic rotation
   - Supabase integration for centralized storage

2. **Frontend Error Boundary** (`frontend/components/error-boundary.tsx`)
   - React error boundaries for component error catching
   - Automatic error reporting to backend
   - User-friendly error display with retry mechanisms

3. **Error Recovery UX** (`frontend/components/error-recovery.tsx`)
   - Interactive error recovery interface
   - Network status monitoring
   - User feedback collection
   - Automatic retry with exponential backoff

4. **Admin Panel** (`frontend/components/error-admin-panel.tsx`)
   - Error statistics and trends
   - Error filtering and search
   - Detailed error inspection
   - Export capabilities for analysis

5. **API Endpoints** (`src/routes/error-routes.ts`)
   - `/api/errors/report` - Error reporting from frontend
   - `/api/errors/feedback` - User feedback submission
   - `/api/errors/stats` - Error statistics
   - `/api/errors/:id` - Individual error details

## Error Categories

- **UI**: Frontend component and user interface errors
- **API**: HTTP request and response errors
- **AGENT**: AI agent processing errors
- **MEMORY**: Memory storage and retrieval errors
- **TTS**: Text-to-speech service errors
- **TRANSCRIPTION**: Speech-to-text service errors
- **SYSTEM**: Core system and infrastructure errors

## Severity Levels

- **LOW**: Minor issues that don't affect functionality
- **MEDIUM**: Issues that may impact user experience
- **HIGH**: Significant errors affecting core features
- **CRITICAL**: System-breaking errors requiring immediate attention

## Configuration

### Environment Variables

```bash
# Enable/disable error logging
ERROR_LOGGING_ENABLED=true

# Log level (debug, info, warn, error)
ERROR_LOG_LEVEL=debug

# Retention settings
ERROR_RETENTION_DAYS=30
ERROR_MAX_FILES=10
ERROR_MAX_FILE_SIZE=10485760

# Privacy and security
ERROR_SANITIZE_DATA=true
ERROR_REDACT_SENSITIVE=true
ERROR_HASH_USER_IDS=true
ERROR_MAX_CONTEXT_LENGTH=5000

# Reporting settings
ERROR_FRONTEND_REPORTING=true
ERROR_BACKEND_REPORTING=true
ERROR_SUPABASE_LOGGING=false
ERROR_RATE_LIMIT_PER_HOUR=100

# Compliance
ERROR_GDPR_COMPLIANT=true
ERROR_CCPA_COMPLIANT=true
ERROR_DATA_MINIMIZATION=true
ERROR_ANONYMIZE_AFTER_DAYS=90

# Notifications (optional)
ERROR_CRITICAL_EMAIL=admin@example.com
ERROR_CRITICAL_WEBHOOK=https://hooks.slack.com/webhook
ERROR_DAILY_REPORT_EMAIL=reports@example.com
```

### Configuration Options

#### Privacy Settings

- **ERROR_SANITIZE_DATA**: Remove or redact personal information
- **ERROR_REDACT_SENSITIVE**: Hide API keys, tokens, and credentials
- **ERROR_HASH_USER_IDS**: Hash user identifiers for privacy
- **ERROR_MAX_CONTEXT_LENGTH**: Limit context length to prevent data leakage

#### Compliance Settings

- **ERROR_GDPR_COMPLIANT**: Enable GDPR compliance features
- **ERROR_CCPA_COMPLIANT**: Enable CCPA compliance features
- **ERROR_DATA_MINIMIZATION**: Reduce collected data to minimum necessary
- **ERROR_ANONYMIZE_AFTER_DAYS**: Automatically anonymize old errors

## Usage

### Backend Error Logging

```typescript
import { logAgentError, logAPIError, logMemoryError } from '../utils/error-logger';

// Log agent-specific errors
await logAgentError('research', error, {
  input: userQuery,
  userId: sessionId,
  operation: 'query_processing'
});

// Log API errors
await logAPIError(error, {
  endpoint: '/api/agent/research',
  method: 'POST',
  statusCode: 500
});

// Log memory errors
await logMemoryError(error, {
  agentId: 'research',
  operation: 'memory_retrieval'
});
```

### Frontend Error Reporting

```typescript
import { reportError, reportAPIError, reportComponentError } from '@/lib/error-reporter';

// Report general errors
await reportError(error, {
  component: 'ChatInterface',
  action: 'send_message'
});

// Report API errors
await reportAPIError(error, '/api/agent/research', 'POST', 500);

// Report component errors (automatic in error boundaries)
await reportComponentError(error, 'MessageBubble', props);
```

### Error Boundaries

```tsx
import ErrorBoundary, { ChatErrorBoundary, AgentErrorBoundary } from '@/components/error-boundary';

// General error boundary
<ErrorBoundary componentName="MyComponent">
  <MyComponent />
</ErrorBoundary>

// Specialized chat error boundary
<ChatErrorBoundary>
  <ChatInterface />
</ChatErrorBoundary>

// Agent-specific error boundary
<AgentErrorBoundary agentId="research">
  <AgentComponent />
</AgentErrorBoundary>
```

### Error Recovery

```tsx
import { useAgentRequestWithRecovery } from '@/hooks/use-agent-request';
import { ErrorRecovery } from '@/components/error-recovery';

function MyComponent() {
  const agentRequest = useAgentRequestWithRecovery({
    maxRetries: 3,
    retryDelay: 1000
  });

  return (
    <div>
      {agentRequest.showErrorRecovery && agentRequest.error && (
        <ErrorRecovery
          error={agentRequest.error}
          onRetry={agentRequest.handleRetry}
          onDismiss={agentRequest.handleDismissError}
          context="Sending message to agent"
          maxRetries={3}
        />
      )}
    </div>
  );
}
```

## Privacy and Compliance

### Data Sanitization

The system automatically sanitizes error logs to remove:
- API keys and authentication tokens
- Email addresses and personal identifiers
- Credit card numbers and SSN formats
- Passwords and secrets
- Long context strings (configurable limit)

### GDPR Compliance

- User consent for error logging (implied through usage)
- Data minimization - only necessary error data is collected
- Right to erasure - errors can be deleted or anonymized
- Data portability - errors can be exported
- Automatic anonymization after configurable period

### CCPA Compliance

- Transparent data collection practices
- User rights to opt-out of error logging
- Data deletion capabilities
- Non-discrimination for privacy choices

## Security Considerations

### Rate Limiting

- Frontend error reporting is rate-limited per user/session
- Backend endpoints include rate limiting middleware
- Prevents abuse and spam of error logging system

### Access Controls

- Admin panel requires development environment or proper authentication
- Error details include sanitized data only
- Sensitive information is automatically redacted

### Data Storage

- Errors stored locally with file rotation
- Optional Supabase integration for centralized storage
- Automatic cleanup of old error files
- Configurable retention periods

## Monitoring and Alerting

### Critical Error Notifications

- Email notifications for critical errors
- Webhook integrations (Slack, Discord, etc.)
- Configurable notification thresholds

### Error Statistics

- Real-time error counts and trends
- Error categorization and analysis
- Agent-specific error tracking
- Performance impact metrics

## Best Practices

### Error Handling

1. Always wrap async operations in try/catch blocks
2. Use specific error types for different categories
3. Include relevant context without sensitive data
4. Provide meaningful error messages for users

### Privacy

1. Never log sensitive user data
2. Use hashed identifiers instead of raw user IDs
3. Implement data retention policies
4. Regular audit of logged data

### Performance

1. Avoid logging in hot paths
2. Use async logging to prevent blocking
3. Implement proper rate limiting
4. Monitor log file sizes

### Testing

1. Test error boundaries with error scenarios
2. Verify error reporting functionality
3. Test recovery mechanisms
4. Validate privacy safeguards

## Troubleshooting

### Common Issues

1. **Errors not appearing in logs**
   - Check ERROR_LOGGING_ENABLED setting
   - Verify logs directory permissions
   - Check rate limiting settings

2. **High memory usage**
   - Reduce ERROR_MAX_CONTEXT_LENGTH
   - Increase log rotation frequency
   - Enable data minimization

3. **Missing error details**
   - Check privacy settings
   - Verify sanitization configuration
   - Review compliance settings

### Debug Mode

Set `ERROR_LOG_LEVEL=debug` to enable verbose logging and additional debug information.

## Future Enhancements

- Machine learning for error pattern detection
- Automated error resolution suggestions
- Integration with external monitoring services
- Advanced analytics and reporting
- Real-time error dashboards