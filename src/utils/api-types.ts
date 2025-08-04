export interface AgentRequest {
  input: string;
  context?: string;
  sessionId?: string;
}

export interface AgentResponse {
  reply: string;
  agentName: string;
  memoryUsed: string[];
  logsSaved: boolean;
  timestamp: string;
  sessionId?: string;
  routing?: {
    shouldRoute: boolean;
    targetAgent: string;
    confidence: number;
    reasoning: string;
    originalInput: string;
  };
}

export interface ApiError {
  error: string;
  code: string;
  timestamp: string;
  details?: any;
}

export interface MemoryContext {
  entries: Array<{
    id: string;
    content: string;
    timestamp: string;
    relevanceScore?: number;
  }>;
  totalEntries: number;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface TTSRequest {
  text: string;
  voiceId?: string;
  agentId?: string;
}

export interface TTSResponse {
  success: true;
  audio: string; // base64 encoded audio
  mimeType: string;
  voiceId: string;
  characterCount: number;
}

export interface TTSError {
  success: false;
  error: string;
  code: string;
}

export interface TranscribeRequest {
  audio: string; // base64 encoded audio
  mimeType: string;
  language?: string;
}

export interface TranscribeResponse {
  success: true;
  transcript: string;
  language?: string;
  duration?: number;
}

export interface TranscribeError {
  success: false;
  error: string;
  code: string;
}