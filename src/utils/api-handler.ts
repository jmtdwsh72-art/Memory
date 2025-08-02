import { RouterAgent } from '../agents/agent-router';
import { MemoryManager } from './memory-manager';
import { AgentRequest, AgentResponse, MemoryContext, ValidationError } from './api-types';
import { validateAgentId, getAllAgents } from '../config/agent-config';
import { v4 as uuidv4 } from 'uuid';

export class ApiHandler {
  private router: RouterAgent;
  private memoryManager: MemoryManager;
  private static instance: ApiHandler;

  private constructor() {
    this.router = new RouterAgent();
    this.memoryManager = new MemoryManager();
  }

  public static getInstance(): ApiHandler {
    if (!ApiHandler.instance) {
      ApiHandler.instance = new ApiHandler();
    }
    return ApiHandler.instance;
  }

  async processAgentRequest(
    agentId: string,
    request: AgentRequest,
    includeMemory: boolean = false
  ): Promise<AgentResponse> {
    const sessionId = request.sessionId || uuidv4();
    
    try {
      let memoryContext: MemoryContext | null = null;
      
      if (includeMemory) {
        memoryContext = await this.getMemoryContext(agentId, request.input);
      }

      const enrichedInput = this.buildEnrichedInput(request.input, memoryContext, request.context);
      
      // Pass sessionId as userId to the router for memory tracking
      const agentResponse = await this.router.processInput(enrichedInput, sessionId);
      
      const memoryUsed = memoryContext?.entries.map(e => e.id) || [];
      
      return {
        reply: agentResponse.message,
        agentName: this.determineAgentName(agentId),
        memoryUsed,
        logsSaved: agentResponse.memoryUpdated || false,
        timestamp: new Date().toISOString(),
        sessionId
      };
    } catch (error) {
      throw new Error(`Agent processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getMemoryContext(agentId: string, query: string): Promise<MemoryContext> {
    try {
      const memoryEntries = await this.memoryManager.searchMemory(agentId, query, 5);
      
      return {
        entries: memoryEntries.map(entry => ({
          id: entry.id,
          content: entry.summary, // Use summary instead of content
          timestamp: entry.createdAt.toISOString(), // Use createdAt instead of timestamp
          relevanceScore: entry.relevanceScore ?? 0
        })),
        totalEntries: memoryEntries.length
      };
    } catch (error) {
      console.error('Failed to retrieve memory context:', error);
      return {
        entries: [],
        totalEntries: 0
      };
    }
  }

  private buildEnrichedInput(input: string, memory: MemoryContext | null, context?: string): string {
    let enrichedInput = input;
    
    if (context) {
      enrichedInput = `Context: ${context}\n\nQuery: ${input}`;
    }
    
    if (memory && memory.entries.length > 0) {
      const memoryContext = memory.entries
        .map(entry => `[${entry.timestamp}] ${entry.content}`)
        .join('\n');
      
      enrichedInput += `\n\nRelevant memory:\n${memoryContext}`;
    }
    
    return enrichedInput;
  }

  private determineAgentName(agentId: string): string {
    // Use dynamic agent registry
    const allAgents = getAllAgents();
    const agent = allAgents.find(a => a.id === agentId.toLowerCase());
    return agent ? agent.id : 'router';
  }

  validateAgentRequest(request: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!request.input || typeof request.input !== 'string') {
      errors.push({
        field: 'input',
        message: 'Input is required and must be a string',
        value: request.input
      });
    } else if (request.input.length > 10000) {
      errors.push({
        field: 'input',
        message: 'Input exceeds maximum length of 10,000 characters',
        value: request.input.length
      });
    } else if (request.input.trim().length === 0) {
      errors.push({
        field: 'input',
        message: 'Input cannot be empty or whitespace only',
        value: request.input
      });
    }
    
    if (request.context && typeof request.context !== 'string') {
      errors.push({
        field: 'context',
        message: 'Context must be a string if provided',
        value: request.context
      });
    }
    
    if (request.sessionId && typeof request.sessionId !== 'string') {
      errors.push({
        field: 'sessionId',
        message: 'Session ID must be a string if provided',
        value: request.sessionId
      });
    }
    
    return errors;
  }

  validateAgentId(agentId: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!agentId || typeof agentId !== 'string') {
      errors.push({
        field: 'agentId',
        message: 'Agent ID is required and must be a string',
        value: agentId
      });
    } else if (!validateAgentId(agentId.toLowerCase())) {
      const allAgents = getAllAgents();
      const allowedAgents = allAgents.map(agent => agent.id);
      errors.push({
        field: 'agentId',
        message: `Invalid agent ID. Allowed agents: ${allowedAgents.join(', ')}`,
        value: agentId
      });
    }
    
    return errors;
  }

  sanitizeInput(input: string): string {
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  async getAgentStatus(agentId: string): Promise<{ status: string; lastActivity?: string }> {
    try {
      const recentLogs = await this.memoryManager.getRecentLogs(agentId, 1);
      
      return {
        status: 'active',
        lastActivity: recentLogs.length > 0 ? recentLogs[0].timestamp.toISOString() : undefined
      };
    } catch (error) {
      return {
        status: 'unknown'
      };
    }
  }
}