import { logTranscriptionError } from '../utils/error-logger';

export interface TranscriptionRequest {
  audio: Buffer;
  mimeType: string;
  language?: string;
}

export interface TranscriptionResponse {
  success: true;
  transcript: string;
  language?: string;
  duration?: number;
}

export interface TranscriptionError {
  success: false;
  error: string;
  code: string;
}

export class TranscriptionService {
  private static instance: TranscriptionService;
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  
  private constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
  }

  public static getInstance(): TranscriptionService {
    if (!TranscriptionService.instance) {
      TranscriptionService.instance = new TranscriptionService();
    }
    return TranscriptionService.instance;
  }

  async transcribeAudio(request: TranscriptionRequest): Promise<TranscriptionResponse | TranscriptionError> {
    try {
      // Validate audio size (max 25MB for Whisper)
      if (request.audio.length > 25 * 1024 * 1024) {
        throw new Error('Audio file exceeds maximum size of 25MB');
      }

      // Create form data using built-in FormData
      const formData = new FormData();
      
      // Determine file extension based on mime type
      const extension = this.getFileExtension(request.mimeType);
      
      // Create blob from buffer
      const audioBlob = new Blob([request.audio], { type: request.mimeType });
      formData.append('file', audioBlob, `audio.${extension}`);
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');
      
      if (request.language) {
        formData.append('language', request.language);
      }

      // Make request to OpenAI Whisper API
      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          (errorData as any)?.error?.message || 
          `OpenAI API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json() as any;
      
      // Validate and sanitize transcript
      const transcript = this.sanitizeTranscript(data.text || '');
      
      if (!transcript) {
        throw new Error('Empty transcript received');
      }

      return {
        success: true,
        transcript,
        language: data.language,
        duration: data.duration
      };
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Transcription failed');
      
      // Log transcription error with context
      await logTranscriptionError(errorObj, {
        mimeType: request.mimeType,
        audioSize: request.audio.length.toString(),
        language: request.language,
        operation: 'audio_transcription'
      });
      
      console.error('Transcription error:', error);
      
      return {
        success: false,
        error: errorObj.message,
        code: 'TRANSCRIPTION_ERROR'
      };
    }
  }

  private getFileExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/wav': 'wav',
      'audio/mp3': 'mp3',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'mp4',
      'audio/m4a': 'm4a',
      'audio/ogg': 'ogg',
      'audio/flac': 'flac'
    };
    
    return mimeToExt[mimeType] || 'webm';
  }

  private sanitizeTranscript(text: string): string {
    // Remove potentially harmful characters and normalize
    return text
      .replace(/[<>]/g, '') // Remove HTML-like tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .slice(0, 10000); // Limit length
  }

  // Check if service is available
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Availability check failed');
      
      // Log transcription error for availability check
      await logTranscriptionError(errorObj, {
        operation: 'availability_check'
      });
      
      return false;
    }
  }
}