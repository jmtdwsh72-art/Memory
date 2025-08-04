import { AgentResponse, MemoryEntry } from './types';
import { EnhancedResponseGenerator, RoutingMetadata, MemoryContext, EnhancedResponseOptions } from './enhanced-response-generator';
import { useAgentMemoryWithPreset } from './memory-hooks';

export interface ResponseMiddlewareOptions {
  agentId: string;
  agentName: string;
  originalResponse: AgentResponse;
  userInput: string;
  userId?: string;
  routingMetadata?: RoutingMetadata;
  voiceEnabled?: boolean;
}

export class ResponseMiddleware {
  /**
   * Enhances agent responses with context awareness and professional formatting
   */
  static async enhanceAgentResponse(options: ResponseMiddlewareOptions): Promise<AgentResponse> {
    const {
      agentId,
      agentName,
      originalResponse,
      userInput,
      userId,
      routingMetadata,
      voiceEnabled = false
    } = options;

    try {
      // Skip enhancement for basic responses or if already enhanced
      if (this.shouldSkipEnhancement(originalResponse.message, agentId)) {
        return originalResponse;
      }

      // Gather memory context
      const memoryContext = await this.gatherMemoryContext(agentId, userInput, userId);

      // Prepare enhancement options
      const enhancementOptions: EnhancedResponseOptions = {
        agentId,
        agentName,
        originalResponse: originalResponse.message,
        routingMetadata,
        memoryContext,
        userInput,
        voiceEnabled,
        confidence: routingMetadata?.confidence || 1.0
      };

      // Generate enhanced response
      const enhancedMessage = EnhancedResponseGenerator.generateEnhancedResponse(enhancementOptions);

      // Return enhanced response with preserved metadata
      return {
        ...originalResponse,
        message: enhancedMessage,
        agentName: agentName, // Ensure agent name is properly set
        metadata: {
          ...originalResponse.metadata,
          enhanced: true,
          enhancementTimestamp: new Date().toISOString(),
          memoryEntriesUsed: memoryContext.entries.length,
          goalsReferenced: memoryContext.goals.length,
          routingAcknowledged: !!routingMetadata?.routedFrom
        }
      };

    } catch (error) {
      console.warn('[ResponseMiddleware] Enhancement failed, returning original:', error);
      return originalResponse;
    }
  }

  /**
   * Gathers relevant memory context for response enhancement
   */
  private static async gatherMemoryContext(
    agentId: string,
    userInput: string,
    userId?: string
  ): Promise<MemoryContext> {
    try {
      if (!userId) {
        return {
          entries: [],
          goals: [],
          recentInteractions: [],
          hasRelatedGoals: false,
          hasSessionHistory: false
        };
      }

      // Get agent-specific memory
      const memory = useAgentMemoryWithPreset(agentId, agentId, userId);
      const memoryResult = await memory.recallWithPreset(userInput);

      // Separate different types of memories
      const goals = memoryResult.entries.filter(entry => 
        entry.type === 'goal' || 
        (entry.tags && entry.tags.includes('goal')) ||
        entry.summary.toLowerCase().includes('goal')
      );

      const recentInteractions = memoryResult.entries
        .filter(entry => entry.type === 'log' || entry.type === 'summary')
        .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime())
        .slice(0, 3);

      return {
        entries: memoryResult.entries,
        goals: goals.slice(0, 2), // Most relevant goals
        recentInteractions,
        hasRelatedGoals: goals.length > 0,
        hasSessionHistory: recentInteractions.length > 0
      };

    } catch (error) {
      console.warn('[ResponseMiddleware] Memory gathering failed:', error);
      return {
        entries: [],
        goals: [],
        recentInteractions: [],
        hasRelatedGoals: false,
        hasSessionHistory: false
      };
    }
  }

  /**
   * Determines if response enhancement should be skipped
   */
  private static shouldSkipEnhancement(message: string, agentId: string): boolean {
    // Skip if already enhanced
    if (message.includes('```\n🎯') || message.includes('Thanks for routing me this request')) {
      return true;
    }

    // Skip for very short responses
    if (message.length < 50) {
      return true;
    }

    // Skip for error messages
    if (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
      return true;
    }

    // Skip for router's clarification responses
    if (agentId === 'router' && message.includes('could be handled in a few different ways')) {
      return true;
    }

    return false;
  }

  /**
   * Determines if voice features should be enabled based on context
   */
  static isVoiceEnabled(userAgent?: string, preferences?: any): boolean {
    // This would typically check user preferences, browser capabilities, etc.
    // For now, we'll assume voice is available
    return true;
  }

  /**
   * Extracts routing metadata from agent response context
   */
  static extractRoutingMetadata(agentResponse: AgentResponse): RoutingMetadata | undefined {
    const metadata = agentResponse.metadata;
    if (!metadata) return undefined;

    return {
      routedFrom: metadata.routedBy,
      confidence: metadata.routingConfidence,
      hasMemoryContext: metadata.hasMemoryContext,
      contextPreview: metadata.contextPreview,
      routingReason: metadata.routingReason
    };
  }

  /**
   * Creates a professional error response with context awareness
   */
  static createErrorResponse(
    agentId: string,
    agentName: string,
    error: Error,
    userInput: string,
    routingMetadata?: RoutingMetadata
  ): AgentResponse {
    const intro = routingMetadata?.routedFrom 
      ? `Thanks for routing me this request — I specialize in ${this.getAgentSpecialization(agentId)}.`
      : '';

    const message = [
      intro,
      `I encountered an issue processing your request: "${userInput.substring(0, 100)}${userInput.length > 100 ? '...' : ''}"`,
      '',
      '🔧 **What happened**: Technical processing error',
      '🔄 **Next steps**: Please try rephrasing your request or contact support if this persists',
      '',
      'Would you like to try a different approach or provide more specific details?'
    ].filter(Boolean).join('\n');

    return {
      success: false,
      message,
      agentName,
      memoryUpdated: false,
      metadata: {
        error: true,
        errorType: error.name,
        enhanced: true,
        agentId
      }
    };
  }

  private static getAgentSpecialization(agentId: string): string {
    const specializations = {
      research: 'deep analysis and investigation',
      automation: 'workflow optimization and process automation',
      creative: 'ideation and creative solutions',
      welcome: 'onboarding and system guidance',
      router: 'intelligent task routing'
    };
    return specializations[agentId as keyof typeof specializations] || 'general assistance';
  }
}