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
  type: 'log' | 'summary' | 'pattern' | 'correction';
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
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async getAgentStatus(agentId: string): Promise<{
    agentId: string;
    status: string;
    lastActivity?: string;
    timestamp: string;
  }> {
    const response = await fetch(`${this.baseUrl}/agent/${agentId}/status`);
    
    if (!response.ok) {
      throw new Error('Failed to get agent status');
    }

    return response.json();
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
    const response = await fetch(`${this.baseUrl}/agents`);
    
    if (!response.ok) {
      throw new Error('Failed to get available agents');
    }

    return response.json();
  }

  async getLogs(agentName?: string, limit: number = 10): Promise<LogsResponse> {
    let url = `${this.baseUrl}/logs?limit=${limit}`;
    if (agentName) {
      url += `&agent=${encodeURIComponent(agentName)}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error || 'Failed to get logs');
    }

    return response.json();
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