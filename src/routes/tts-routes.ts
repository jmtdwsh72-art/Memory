import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { TTSService } from '../services/tts-service';
import { TTSRequest, ApiError } from '../utils/api-types';
import { getAgentConfig } from '../config/agent-config';

const router = Router();
const ttsService = TTSService.getInstance();

const validateTTSRequest = [
  body('text')
    .isString()
    .isLength({ min: 1, max: 300 })
    .withMessage('Text must be between 1 and 300 characters'),
  body('voiceId')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Voice ID must be a valid string'),
  body('agentId')
    .optional()
    .isString()
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Agent ID must be alphanumeric')
];

router.post('/tts', 
  validateTTSRequest,
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

      const ttsRequest: TTSRequest = {
        text: req.body.text,
        voiceId: req.body.voiceId,
        agentId: req.body.agentId
      };

      // If agentId is provided, check for agent-specific voice config
      if (ttsRequest.agentId && !ttsRequest.voiceId) {
        const agentConfig = getAgentConfig(ttsRequest.agentId);
        if (agentConfig && (agentConfig as any).voiceId) {
          ttsRequest.voiceId = (agentConfig as any).voiceId;
        } else {
          // Use default voice mapping for agent
          ttsRequest.voiceId = ttsService.getVoiceForAgent(ttsRequest.agentId);
        }
      }

      const response = await ttsService.generateSpeech(ttsRequest);
      
      res.status(200).json(response);
      return;

    } catch (error: any) {
      console.error('TTS request error:', error);
      
      // Check if it's already a TTSError
      if (error.code === 'TTS_GENERATION_ERROR') {
        return res.status(500).json(error);
      }
      
      const apiError: ApiError = {
        error: error.message || 'TTS generation failed',
        code: 'TTS_ERROR',
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error'
      };
      
      res.status(500).json(apiError);
      return;
    }
  }
);

router.get('/tts/voices', async (_req: Request, res: Response) => {
  try {
    const voices = await ttsService.getVoices();
    
    res.status(200).json({
      voices,
      total: voices.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Voices fetch error:', error);
    
    const apiError: ApiError = {
      error: 'Failed to fetch voices',
      code: 'VOICES_FETCH_ERROR',
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(apiError);
  }
});

export { router as ttsRoutes };