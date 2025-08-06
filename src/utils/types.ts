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
  voiceId?: string; // Optional ElevenLabs voice ID
  
  // Enhanced personalization fields
  tagline?: string;
  personality?: string[];
  clarificationStyle?: string;
  preferredCommunication?: string;
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
  type: 'log' | 'summary' | 'pattern' | 'correction' | 'goal' | 'goal_progress' | 'session_summary' | 'session_decision' | 'conversation' | 'clarification';
  input: string;
  summary: string;
  context?: string;
  relevanceScore?: number;
  frequency: number;
  lastAccessed: Date;
  createdAt: Date;
  tags?: string[];
  metadata?: Record<string, any>;
  // Goal progress specific fields
  goalId?: string;
  goalSummary?: string;
  goalStatus?: 'new' | 'in_progress' | 'completed' | 'abandoned';
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
  types?: ('log' | 'summary' | 'pattern' | 'correction' | 'goal' | 'goal_progress' | 'session_summary' | 'session_decision')[];
}

export interface AgentResponse {
  success: boolean;
  message: string;
  agentName?: string;
  data?: any;
  memoryUpdated?: boolean;
  routing?: {
    shouldRoute: boolean;
    targetAgent: string;
    confidence: number;
    reasoning: string;
    originalInput: string;
    hasMemoryContext?: boolean;
    contextPreview?: string;
  };
  metadata?: {
    agentId?: string;
    confidence?: number;
    hasMemoryContext?: boolean;
    intentType?: string;
    taskType?: string;
    routedBy?: string;
    routingConfidence?: number;
    routingMethod?: string;
    timestamp?: string;
    consultingEnhanced?: boolean;
    enhanced?: boolean;
    enhancementTimestamp?: string;
    memoryEntriesUsed?: number;
    goalsReferenced?: number;
    routingAcknowledged?: boolean;
    error?: boolean;
    errorType?: string;
    contextPreview?: string;
    routingReason?: string;
    agentName?: string;
    knowledgeDomainsDetected?: string[];
    knowledgeModulesInjected?: number;
  };
}