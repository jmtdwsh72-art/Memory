import { TTSRequest, TTSResponse, TTSError } from '../utils/api-types';
import { logTTSError } from '../utils/error-logger';

export class TTSService {
  private static instance: TTSService;
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private defaultVoiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
  
  private constructor() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
  }

  public static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  async generateSpeech(request: TTSRequest): Promise<TTSResponse> {
    try {
      // Validate text length
      if (request.text.length > 300) {
        throw new Error('Text exceeds maximum length of 300 characters');
      }

      // Sanitize text
      const sanitizedText = this.sanitizeText(request.text);
      
      // Use agent-specific voice or default
      const voiceId = request.voiceId || this.defaultVoiceId;
      
      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text: sanitizedText,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          (errorData as any)?.detail?.message || 
          `ElevenLabs API error: ${response.status} ${response.statusText}`
        );
      }

      // Get audio data as buffer
      const audioBuffer = await response.arrayBuffer();
      
      // Convert to base64
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      
      return {
        success: true,
        audio: base64Audio,
        mimeType: 'audio/mpeg',
        voiceId,
        characterCount: sanitizedText.length
      };
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('TTS generation failed');
      
      // Log TTS error with context
      await logTTSError(errorObj, {
        text: request.text,
        voiceId: request.voiceId || this.defaultVoiceId,
        textLength: request.text.length.toString(),
        operation: 'speech_generation'
      });
      
      console.error('TTS generation error:', error);
      
      const ttsError: TTSError = {
        success: false,
        error: errorObj.message,
        code: 'TTS_GENERATION_ERROR'
      };
      
      throw ttsError;
    }
  }

  async getVoices() {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'Accept': 'application/json',
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.statusText}`);
      }

      const data = await response.json() as { voices: any[] };
      
      return data.voices.map((voice: any) => ({
        voiceId: voice.voice_id,
        name: voice.name,
        category: voice.category,
        labels: voice.labels,
        preview_url: voice.preview_url
      }));
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to fetch voices');
      
      // Log TTS error for voice fetching
      await logTTSError(errorObj, {
        operation: 'voice_fetch'
      });
      
      console.error('Error fetching voices:', error);
      return [];
    }
  }

  private sanitizeText(text: string): string {
    // Remove potentially harmful characters and normalize whitespace
    return text
      .replace(/[<>]/g, '') // Remove HTML-like tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Voice presets for different agent types
  getVoiceForAgent(agentId: string): string {
    const voiceMap: Record<string, string> = {
      'research': 'EXAVITQu4vr4xnSDxMaL', // Rachel - professional
      'creative': 'AZnzlk1XvdvUeBnXmlld', // Domi - energetic  
      'automation': 'VR6AewLTigWG4xSOukaG', // Arnold - clear
      'router': 'EXAVITQu4vr4xnSDxMaL', // Rachel - default
      'welcome': 'EXAVITQu4vr4xnSDxMaL' // Rachel - welcoming
    };
    
    return voiceMap[agentId] || this.defaultVoiceId;
  }
}