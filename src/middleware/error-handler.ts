import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-types';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Unhandled error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  const isDevelopment = process.env.NODE_ENV === 'development';

  const apiError: ApiError = {
    error: 'Internal server error',
    code: 'UNHANDLED_ERROR',
    timestamp: new Date().toISOString(),
    details: isDevelopment ? {
      message: error.message,
      stack: error.stack
    } : undefined
  };

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json(apiError);
}