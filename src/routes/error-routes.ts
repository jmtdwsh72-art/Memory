import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { errorLogger } from '../utils/error-logger';
import { ApiError } from '../utils/api-types';

const router = Router();

// Validation middleware for error reports
const validateErrorReport = [
  body('type')
    .isIn(['UI', 'API', 'AGENT', 'SYSTEM'])
    .withMessage('Type must be one of: UI, API, AGENT, SYSTEM'),
  body('message')
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be a string between 1 and 1000 characters'),
  body('severity')
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .withMessage('Severity must be one of: LOW, MEDIUM, HIGH, CRITICAL'),
  body('context')
    .isObject()
    .withMessage('Context must be an object'),
  body('stack')
    .optional()
    .isString()
    .withMessage('Stack trace must be a string if provided')
];

const validateErrorFeedback = [
  body('errorId')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Error ID must be a string between 1 and 100 characters'),
  body('feedback')
    .isString()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Feedback must be a string between 1 and 2000 characters'),
  body('helpful')
    .isBoolean()
    .withMessage('Helpful must be a boolean'),
  body('timestamp')
    .isISO8601()
    .withMessage('Timestamp must be a valid ISO 8601 date')
];

/**
 * Endpoint to receive error reports from frontend
 */
router.post('/report', validateErrorReport, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const apiError: ApiError = {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString(),
        details: errors.array()
      };
      return res.status(400).json(apiError);
    }

    const { type, message, stack, context, severity } = req.body;

    // Create error object
    const error = new Error(message);
    if (stack) {
      error.stack = stack;
    }

    // Log the error with frontend context
    const errorId = await errorLogger.log(type, error, {
      ...context,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId: `frontend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    res.status(200).json({
      success: true,
      errorId,
      message: 'Error report received',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to process error report:', error);
    
    const apiError: ApiError = {
      error: 'Failed to process error report',
      code: 'ERROR_REPORT_FAILED',
      timestamp: new Date().toISOString(),
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    
    res.status(500).json(apiError);
  }
});

/**
 * Endpoint to receive user feedback for errors
 */
router.post('/feedback', validateErrorFeedback, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const apiError: ApiError = {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString(),
        details: errors.array()
      };
      return res.status(400).json(apiError);
    }

    const { errorId, feedback, helpful, timestamp } = req.body;

    // Add user feedback to the error
    const success = await errorLogger.addUserFeedback(errorId, {
      message: feedback,
      helpful,
      timestamp
    });

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Feedback received',
        timestamp: new Date().toISOString()
      });
    } else {
      const apiError: ApiError = {
        error: 'Failed to save feedback',
        code: 'FEEDBACK_SAVE_FAILED',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(apiError);
    }

  } catch (error) {
    console.error('Failed to process error feedback:', error);
    
    const apiError: ApiError = {
      error: 'Failed to process feedback',
      code: 'FEEDBACK_PROCESS_FAILED',
      timestamp: new Date().toISOString(),
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    
    res.status(500).json(apiError);
  }
});

/**
 * Endpoint to get error statistics (for admin use)
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 7;
    
    if (days < 1 || days > 90) {
      const apiError: ApiError = {
        error: 'Days parameter must be between 1 and 90',
        code: 'INVALID_DAYS_PARAMETER',
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(apiError);
    }

    const stats = await errorLogger.getErrorStats(days);

    res.status(200).json({
      stats,
      period: `${days} days`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to get error stats:', error);
    
    const apiError: ApiError = {
      error: 'Failed to get error statistics',
      code: 'ERROR_STATS_FAILED',
      timestamp: new Date().toISOString(),
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    
    res.status(500).json(apiError);
  }
});

/**
 * Endpoint to get specific error details (for admin use)
 */
router.get('/:errorId', async (req: Request, res: Response) => {
  try {
    const { errorId } = req.params;

    if (!errorId || typeof errorId !== 'string') {
      const apiError: ApiError = {
        error: 'Error ID is required',
        code: 'MISSING_ERROR_ID',
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(apiError);
    }

    const errorDetails = await errorLogger.getError(errorId);

    if (!errorDetails) {
      const apiError: ApiError = {
        error: 'Error not found',
        code: 'ERROR_NOT_FOUND',
        timestamp: new Date().toISOString()
      };
      return res.status(404).json(apiError);
    }

    res.status(200).json({
      error: errorDetails,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to get error details:', error);
    
    const apiError: ApiError = {
      error: 'Failed to get error details',
      code: 'ERROR_DETAILS_FAILED',
      timestamp: new Date().toISOString(),
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    
    res.status(500).json(apiError);
  }
});

export { router as errorRoutes };