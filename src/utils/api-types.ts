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