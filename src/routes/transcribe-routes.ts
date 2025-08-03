import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { TranscriptionService } from '../services/transcription-service';
import { TranscribeRequest, ApiError } from '../utils/api-types';

const router = Router();
const transcriptionService = TranscriptionService.getInstance();

const validateTranscribeRequest = [
  body('audio')
    .isString()
    .withMessage('Audio must be a base64 encoded string'),
  body('mimeType')
    .isString()
    .isIn(['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/ogg'])
    .withMessage('Invalid audio MIME type'),
  body('language')
    .optional()
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language code must be 2-5 characters (e.g., "en", "es")')
];

router.post('/transcribe', 
  validateTranscribeRequest,
  async (req: Request, res: Response) => {
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

      const transcribeRequest: TranscribeRequest = {
        audio: req.body.audio,
        mimeType: req.body.mimeType,
        language: req.body.language
      };

      // Convert base64 to buffer
      let audioBuffer: Buffer;
      try {
        audioBuffer = Buffer.from(transcribeRequest.audio, 'base64');
      } catch (error) {
        const apiError: ApiError = {
          error: 'Invalid base64 audio data',
          code: 'INVALID_AUDIO_DATA',
          timestamp: new Date().toISOString()
        };
        return res.status(400).json(apiError);
      }

      // Check audio size (max 25MB)
      if (audioBuffer.length > 25 * 1024 * 1024) {
        const apiError: ApiError = {
          error: 'Audio file exceeds maximum size of 25MB',
          code: 'AUDIO_TOO_LARGE',
          timestamp: new Date().toISOString()
        };
        return res.status(400).json(apiError);
      }

      // Transcribe audio
      const result = await transcriptionService.transcribeAudio({
        audio: audioBuffer,
        mimeType: transcribeRequest.mimeType,
        language: transcribeRequest.language
      });

      if (!result.success) {
        const apiError: ApiError = {
          error: result.error,
          code: result.code,
          timestamp: new Date().toISOString()
        };
        return res.status(500).json(apiError);
      }

      res.status(200).json(result);
      return;

    } catch (error) {
      console.error('Transcription request error:', error);
      
      const apiError: ApiError = {
        error: error instanceof Error ? error.message : 'Transcription failed',
        code: 'TRANSCRIPTION_ERROR',
        timestamp: new Date().toISOString()
      };
      
      res.status(500).json(apiError);
      return;
    }
  }
);

router.get('/transcribe/status', async (_req: Request, res: Response) => {
  try {
    const isAvailable = await transcriptionService.checkAvailability();
    
    res.status(200).json({
      available: isAvailable,
      service: 'OpenAI Whisper',
      maxAudioSize: '25MB',
      supportedFormats: ['webm', 'wav', 'mp3', 'mp4', 'm4a', 'ogg'],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Transcription status error:', error);
    
    const apiError: ApiError = {
      error: 'Failed to check transcription service status',
      code: 'STATUS_CHECK_ERROR',
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(apiError);
  }
});

export { router as transcribeRoutes };