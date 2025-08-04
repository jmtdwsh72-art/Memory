import { reportAPIError, reportAgentError } from './error-reporter';

export interface AgentRequest {
  input: string;
  context?: string;
  sessionId?: string;
  isFirstMessage?: boolean;
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

export interface AgentLog {
  id: string;
  agentName: string;
  input: string;
  output: string;
  timestamp: string;
  memoryUsed: string[];
}

export interface LogsResponse {
  logs: AgentLog[];
  total: number;
  agent: string;
  limit: number;
  timestamp: string;
}

export interface MemoryEntry {
  id: string;
  agentId: string;
  userId?: string;
  type: 'log' | 'summary' | 'pattern' | 'correction' | 'goal';
  input: string;
  summary: string;
  context?: string;
  relevanceScore?: number;
  frequency: number;
  lastAccessed: string;
  createdAt: string;
  tags?: string[];
}

export interface MemoryPattern {
  pattern: string;
  frequency: number;
  lastSeen: string;
  examples: string[];
  corrections?: string[];
}

export interface MemoryStats {
  totalEntries: number;
  byType: Record<string, number>;
  averageRelevance: number;
  topPatterns: MemoryPattern[];
  recentActivity: MemoryEntry[];
}

export interface MemoryResponse {
  agentId: string;
  userId?: string;
  stats: MemoryStats;
  recentMemories: MemoryEntry[];
  patterns: MemoryPattern[];
  totalMatches: number;
  averageRelevance: number;
  timestamp: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  async sendAgentRequest(
    agentId: string,
    request: AgentRequest,
    includeMemory: boolean = true
  ): Promise<AgentResponse> {
    const url = `${this.baseUrl}/agent/${agentId}${includeMemory ? '?memory=true' : ''}`;
    
    console.log('[ApiClient] Sending request:', {
      url,
      agentId,
      request,
      includeMemory
    });
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      console.log('[ApiClient] Response status:', response.status);

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({ 
          error: 'Request failed', 
          code: 'UNKNOWN_ERROR', 
          timestamp: new Date().toISOString() 
        }));
        
        console.error('[ApiClient] Error response:', error);
        
        const errorObj = new Error(error.error || 'Request failed');
        
        // Report API error
        await reportAPIError(errorObj, url, 'POST', response.status);
        
        throw errorObj;
      }

      const data = await response.json();
      console.log('[ApiClient] Success response:', data);
      
      return data;
    } catch (error) {
      console.error('[ApiClient] Request failed:', error);
      
      // Report as agent error if it's an agent-specific request
      if (error instanceof Error) {
        await reportAgentError(error, agentId, request.input);
      }
      throw error;
    }
  }

  async getAgentStatus(agentId: string): Promise<{
    agentId: string;
    status: string;
    lastActivity?: string;
    timestamp: string;
  }> {
    const url = `${this.baseUrl}/agent/${agentId}/status`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorObj = new Error('Failed to get agent status');
        await reportAPIError(errorObj, url, 'GET', response.status);
        throw errorObj;
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        await reportAPIError(error, url, 'GET');
      }
      throw error;
    }
  }

  async getAvailableAgents(): Promise<{
    agents: Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
      color: string;
      status: string;
      tools: string[];
      keywords: string[];
    }>;
    total: number;
    timestamp: string;
  }> {
    const url = `${this.baseUrl}/agents`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorObj = new Error('Failed to get available agents');
        await reportAPIError(errorObj, url, 'GET', response.status);
        throw errorObj;
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        await reportAPIError(error, url, 'GET');
      }
      throw error;
    }
  }

  async getLogs(agentName?: string, limit: number = 10): Promise<LogsResponse> {
    let url = `${this.baseUrl}/logs?limit=${limit}`;
    if (agentName) {
      url += `&agent=${encodeURIComponent(agentName)}`;
    }

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({ 
          error: 'Failed to get logs', 
          code: 'UNKNOWN_ERROR', 
          timestamp: new Date().toISOString() 
        }));
        
        const errorObj = new Error(error.error || 'Failed to get logs');
        await reportAPIError(errorObj, url, 'GET', response.status);
        throw errorObj;
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        await reportAPIError(error, url, 'GET');
      }
      throw error;
    }
  }

  async getMemory(agentId: string, userId?: string, limit?: number, minRelevance?: number): Promise<MemoryResponse> {
    let url = `${this.baseUrl}/memory/${encodeURIComponent(agentId)}`;
    const params = new URLSearchParams();
    
    if (userId) params.append('userId', userId);
    if (limit) params.append('limit', limit.toString());
    if (minRelevance) params.append('minRelevance', minRelevance.toString());
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error || 'Failed to get memory');
    }

    return response.json();
  }

  async deleteMemory(agentId: string, memoryId: string): Promise<{
    success: boolean;
    agentId: string;
    memoryId: string;
    message: string;
    timestamp: string;
  }> {
    const url = `${this.baseUrl}/memory/${encodeURIComponent(agentId)}/${encodeURIComponent(memoryId)}`;
    
    const response = await fetch(url, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error || 'Failed to delete memory');
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();