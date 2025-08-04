import { MemoryContext, MemoryEntry } from './types';
import { getAgentIdentity } from './agent-identity';

export interface ContextInjectionOptions {
  agentId: string;
  input: string;
  memoryContext?: MemoryContext;
  routingMetadata?: {
    routedFrom?: string;
    confidence?: number;
    hasMemoryContext?: boolean;
    contextPreview?: string;
    suppressIntro?: boolean;
    stayInThread?: boolean;
    dampingApplied?: number;
  };
  userId?: string;
}

export interface InjectedContext {
  memoryAwareness?: string;
  routingAwareness?: string;
  personalizedIntro?: string;
  metaInsight?: string;
  continuityHint?: string;
}

/**
 * Generate contextually aware message enhancements based on memory and routing
 */
export class ContextInjector {
  /**
   * Inject memory awareness into agent responses
   */
  static injectMemoryAwareness(options: ContextInjectionOptions): InjectedContext {
    const { agentId, input, memoryContext, routingMetadata } = options;
    const injected: InjectedContext = {};

    // Add memory awareness if relevant memories exist
    if (memoryContext && memoryContext.entries.length > 0) {
      injected.memoryAwareness = this.generateMemoryAwareness(memoryContext, agentId);
    }

    // Add routing awareness if routed from another agent (but suppress if requested)
    if (routingMetadata?.routedFrom && !routingMetadata?.suppressIntro && !routingMetadata?.stayInThread) {
      injected.routingAwareness = this.generateRoutingAwareness(routingMetadata, agentId);
    }

    // Add personalized intro based on agent identity (suppress if requested)
    if (!routingMetadata?.suppressIntro && !routingMetadata?.stayInThread) {
      injected.personalizedIntro = this.generatePersonalizedIntro(agentId, input);
    }

    // Add meta insights for high-confidence scenarios
    if (memoryContext && this.shouldIncludeMetaInsight(memoryContext, routingMetadata)) {
      injected.metaInsight = this.generateMetaInsight(memoryContext, agentId);
    }

    // Add continuity hints for ongoing conversations
    if (memoryContext && this.hasRecentInteraction(memoryContext)) {
      injected.continuityHint = this.generateContinuityHint(memoryContext);
    }

    return injected;
  }

  /**
   * Generate memory awareness statement
   */
  private static generateMemoryAwareness(memoryContext: MemoryContext, agentId: string): string {
    const recentGoals = memoryContext.entries.filter(e => e.type === 'goal');
    const corrections = memoryContext.entries.filter(e => e.type === 'correction');
    const patterns = memoryContext.patterns || [];

    const awareness: string[] = [];

    // Reference recent goals
    if (recentGoals.length > 0) {
      const goalSummary = recentGoals[0].summary;
      if (goalSummary.includes('learn')) {
        awareness.push(`I remember you're working on ${this.extractTopic(goalSummary)}.`);
      } else if (goalSummary.includes('create')) {
        awareness.push(`Building on your creative project for ${this.extractTopic(goalSummary)}.`);
      } else if (goalSummary.includes('automate')) {
        awareness.push(`Continuing with your automation goal: ${this.extractTopic(goalSummary)}.`);
      }
    }

    // Reference corrections to avoid repeating mistakes
    if (corrections.length > 0 && agentId !== 'router') {
      awareness.push(`I'll make sure to apply what we learned from our previous interaction.`);
    }

    // Reference patterns for personalization
    if (patterns.length > 0 && patterns[0].frequency > 3) {
      const patternInsight = this.getPatternInsight(patterns[0], agentId);
      if (patternInsight) {
        awareness.push(patternInsight);
      }
    }

    return awareness.join(' ');
  }

  /**
   * Generate routing awareness statement
   */
  private static generateRoutingAwareness(routingMetadata: any, agentId: string): string {
    const agentIdentity = getAgentIdentity(agentId);
    
    if (routingMetadata.confidence > 0.8) {
      return `Thanks for coming to me with this ${agentIdentity.name.toLowerCase()} request.`;
    } else if (routingMetadata.hasMemoryContext) {
      return `I see this relates to our previous discussions. Let me help you continue.`;
    }
    
    return '';
  }

  /**
   * Generate personalized introduction based on agent personality
   */
  private static generatePersonalizedIntro(agentId: string, input: string): string {
    const agentIdentity = getAgentIdentity(agentId);
    const inputLength = input.split(' ').length;
    
    // Skip intro for very short inputs (likely follow-ups)
    if (inputLength < 5) return '';

    switch (agentId) {
      case 'research':
        if (input.toLowerCase().includes('learn')) {
          return `Let's explore this together.`;
        } else if (input.toLowerCase().includes('compare')) {
          return `I'll help you analyze the differences.`;
        }
        break;
      case 'creative':
        if (input.toLowerCase().includes('name')) {
          return `Let's brainstorm something memorable!`;
        } else if (input.toLowerCase().includes('story')) {
          return `Time to unleash creativity!`;
        }
        break;
      case 'automation':
        if (input.toLowerCase().includes('workflow')) {
          return `Let's optimize this process.`;
        } else if (input.toLowerCase().includes('save time')) {
          return `Efficiency is my specialty.`;
        }
        break;
    }
    
    return '';
  }

  /**
   * Generate meta insights for high-confidence responses
   */
  private static generateMetaInsight(memoryContext: MemoryContext, agentId: string): string {
    const totalInteractions = memoryContext.entries.length;
    const goalEntries = memoryContext.entries.filter(e => e.type === 'goal');
    
    if (totalInteractions > 10 && goalEntries.length > 3) {
      return `I've noticed you're building expertise across multiple areas - that's fantastic progress!`;
    } else if (memoryContext.averageRelevance > 0.8) {
      return `Your questions are becoming more focused - a sign of deepening understanding.`;
    }
    
    return '';
  }

  /**
   * Generate continuity hint for ongoing conversations
   */
  private static generateContinuityHint(memoryContext: MemoryContext): string {
    const recentEntry = memoryContext.entries
      .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())[0];
    
    if (!recentEntry) return '';
    
    const timeSinceLastInteraction = Date.now() - recentEntry.lastAccessed.getTime();
    const hoursSince = timeSinceLastInteraction / (1000 * 60 * 60);
    
    if (hoursSince < 1) {
      return `Picking up where we left off...`;
    } else if (hoursSince < 24) {
      return `Welcome back! Ready to continue?`;
    } else if (hoursSince < 168) { // 1 week
      return `Good to see you again!`;
    }
    
    return '';
  }

  /**
   * Determine if meta insight should be included
   */
  private static shouldIncludeMetaInsight(memoryContext: MemoryContext, routingMetadata?: any): boolean {
    // Include if high confidence routing
    if (routingMetadata?.confidence > 0.75) return true;
    
    // Include if strong memory match
    if (memoryContext.averageRelevance > 0.7) return true;
    
    // Include if multiple goal entries
    const goalCount = memoryContext.entries.filter(e => e.type === 'goal').length;
    if (goalCount >= 2) return true;
    
    return false;
  }

  /**
   * Check if there's a recent interaction
   */
  private static hasRecentInteraction(memoryContext: MemoryContext): boolean {
    if (memoryContext.entries.length === 0) return false;
    
    const mostRecent = memoryContext.entries
      .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())[0];
    
    const hoursSince = (Date.now() - mostRecent.lastAccessed.getTime()) / (1000 * 60 * 60);
    return hoursSince < 24;
  }

  /**
   * Extract topic from memory summary
   */
  private static extractTopic(summary: string): string {
    // Extract key topic from summary
    const match = summary.match(/(?:learn|create|automate|research)\s+(.+?)(?:\s|$)/i);
    if (match) {
      return match[1].toLowerCase();
    }
    
    // Fallback to first meaningful noun
    const words = summary.split(' ').filter(w => w.length > 3);
    return words[words.length - 1] || 'this topic';
  }

  /**
   * Get insight from detected pattern
   */
  private static getPatternInsight(pattern: any, agentId: string): string | null {
    if (pattern.pattern.includes('learning progression')) {
      return `I see you're making steady progress in your learning journey.`;
    } else if (pattern.pattern.includes('creative exploration')) {
      return `Your creative explorations are becoming more sophisticated.`;
    } else if (pattern.pattern.includes('efficiency focus')) {
      return `You're consistently looking for ways to optimize - great approach!`;
    }
    
    return null;
  }

  /**
   * Apply context injection to a response
   */
  static enhanceResponse(response: string, injectedContext: InjectedContext): string {
    const enhancements: string[] = [];
    
    // Add routing awareness at the beginning if present
    if (injectedContext.routingAwareness) {
      enhancements.push(injectedContext.routingAwareness);
    }
    
    // Add memory awareness if present
    if (injectedContext.memoryAwareness) {
      enhancements.push(injectedContext.memoryAwareness);
    }
    
    // Add personalized intro if present
    if (injectedContext.personalizedIntro) {
      enhancements.push(injectedContext.personalizedIntro);
    }
    
    // Build the enhanced response
    let enhancedResponse = response;
    
    if (enhancements.length > 0) {
      const prefix = enhancements.join(' ').trim();
      enhancedResponse = `${prefix}\n\n${response}`;
    }
    
    // Add meta insight at the end if present
    if (injectedContext.metaInsight) {
      enhancedResponse += `\n\n*${injectedContext.metaInsight}*`;
    }
    
    // Add continuity hint if present and not already included
    if (injectedContext.continuityHint && !enhancedResponse.includes(injectedContext.continuityHint)) {
      enhancedResponse = `${injectedContext.continuityHint} ${enhancedResponse}`;
    }
    
    return enhancedResponse;
  }
}