export interface AgentConfig {
  id: string;
  name: string;
  tone: string;
  goal: string;
  description: string;
  memoryScope: 'session' | 'persistent' | 'global';
  tools: string[];
  keywords: string[];
  icon: string;
  color: string;
  status: 'active' | 'inactive' | 'busy';
}

export interface AgentConfigExport {
  config: AgentConfig;
  prompts?: Record<string, any>;
}

export interface AgentMessage {
  id: string;
  timestamp: Date;
  agentName: string;
  input: string;
  output: string;
  memoryUsed?: string[];
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
  lastAccessed: Date;
  createdAt: Date;
  tags?: string[];
}

export interface MemoryContext {
  entries: MemoryEntry[];
  totalMatches: number;
  averageRelevance: number;
  patterns: MemoryPattern[];
}

export interface MemoryPattern {
  pattern: string;
  frequency: number;
  lastSeen: Date;
  examples: string[];
  corrections?: string[];
}

export interface MemorySearchOptions {
  limit?: number;
  minRelevance?: number;
  includePatterns?: boolean;
  timeRange?: {
    start: Date;
    end: Date;
  };
  types?: ('log' | 'summary' | 'pattern' | 'correction')[];
}

export interface AgentResponse {
  success: boolean;
  message: string;
  data?: any;
  memoryUpdated?: boolean;
}