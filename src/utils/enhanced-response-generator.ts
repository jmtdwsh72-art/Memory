import { AgentResponse, MemoryEntry } from './types';

export interface RoutingMetadata {
  routedFrom?: string;
  confidence?: number;
  hasMemoryContext?: boolean;
  contextPreview?: string;
  routingReason?: string;
  recentRoutings?: any[];
  suppressIntro?: boolean;
  stayInThread?: boolean;
  dampingApplied?: number;
}

export interface MemoryContext {
  entries: MemoryEntry[];
  goals: MemoryEntry[];
  recentInteractions: MemoryEntry[];
  hasRelatedGoals: boolean;
  hasSessionHistory: boolean;
}

export interface EnhancedResponseOptions {
  agentId: string;
  agentName: string;
  originalResponse: string;
  routingMetadata?: RoutingMetadata;
  memoryContext?: MemoryContext;
  userInput: string;
  voiceEnabled?: boolean;
  confidence?: number;
}

export class EnhancedResponseGenerator {
  /**
   * Generates a context-aware, intelligent response with proper formatting
   */
  static generateEnhancedResponse(options: EnhancedResponseOptions): string {
    const {
      agentId,
      agentName,
      originalResponse,
      routingMetadata,
      memoryContext,
      userInput,
      voiceEnabled = false,
      confidence = 1.0
    } = options;

    // Build response sections with natural flow
    const sections: string[] = [];

    // 1. Context-Aware Introduction + Memory Integration (combined for natural flow)
    // Skip intro if suppressIntro is true or if staying in same thread
    if (!routingMetadata?.suppressIntro && !routingMetadata?.stayInThread) {
      const intro = this.generateContextAwareIntro(agentId, agentName, routingMetadata, memoryContext);
      const memoryInjection = this.generateMemoryInjection(memoryContext, userInput);
      
      if (intro && memoryInjection) {
        sections.push(`${intro} ${memoryInjection}`);
      } else if (intro) {
        sections.push(intro);
      } else if (memoryInjection) {
        sections.push(memoryInjection);
      }
    } else if (memoryContext?.hasRelatedGoals || memoryContext?.hasSessionHistory) {
      // For continuing conversations, just add subtle memory reference
      const memoryInjection = this.generateMemoryInjection(memoryContext, userInput);
      if (memoryInjection) {
        sections.push(memoryInjection);
      }
    }

    // 2. Visual Handoff Markers (only for high-confidence routing and not staying in thread)
    if (confidence >= 0.9 && !routingMetadata?.stayInThread && !routingMetadata?.suppressIntro) {
      const handoffMarkers = this.generateHandoffMarkers(agentId, routingMetadata, memoryContext, confidence);
      if (handoffMarkers) sections.push(handoffMarkers);
    }

    // 3. Enhanced Original Response
    const enhancedCore = this.enhanceOriginalResponse(originalResponse, agentId);
    sections.push(enhancedCore);

    // 4. Voice & Feature Awareness (subtle integration)
    const featureAwareness = this.generateFeatureAwareness(agentId, voiceEnabled);
    if (featureAwareness) sections.push(featureAwareness);

    // 5. Collaborative Tone Ending
    const collaborativeEnding = this.generateCollaborativeEnding(agentId, userInput, memoryContext);
    sections.push(collaborativeEnding);

    return sections.join('\n\n');
  }

  private static generateContextAwareIntro(
    agentId: string,
    agentName: string,
    routingMetadata?: RoutingMetadata,
    memoryContext?: MemoryContext
  ): string {
    const intros: string[] = [];

    // Routing acknowledgment
    if (routingMetadata?.routedFrom === 'router') {
      const specialization = this.getAgentSpecialization(agentId);
      intros.push(`Thanks for routing me this request — I specialize in ${specialization}.`);
    }

    // Memory acknowledgment
    if (memoryContext?.hasSessionHistory || memoryContext?.hasRelatedGoals) {
      if (memoryContext.hasRelatedGoals) {
        intros.push(`Looks like we've discussed something similar before...`);
      } else if (memoryContext.hasSessionHistory) {
        intros.push(`Good to continue our conversation!`);
      }
    }

    return intros.join(' ');
  }

  private static generateHandoffMarkers(
    agentId: string,
    routingMetadata?: RoutingMetadata,
    memoryContext?: MemoryContext,
    confidence = 1.0
  ): string {
    if (!routingMetadata?.routedFrom) return '';

    const agentEmoji = this.getAgentEmoji(agentId);
    const confidenceLevel = confidence >= 0.9 ? 'High' : confidence >= 0.7 ? 'Good' : 'Medium';
    
    const markers: string[] = [
      `${agentEmoji} **Agent**: ${this.getAgentSpecialization(agentId)}`,
      `🎯 **Confidence**: ${confidenceLevel} (${Math.round(confidence * 100)}%)`
    ];

    if (memoryContext?.hasRelatedGoals && memoryContext.goals.length > 0) {
      const primaryGoal = memoryContext.goals[0];
      const goalPreview = primaryGoal.summary.substring(0, 50) + (primaryGoal.summary.length > 50 ? '...' : '');
      markers.push(`🧠 **Context**: ${goalPreview}`);
    }

    if (routingMetadata.routingReason) {
      markers.push(`🔍 **Detected**: ${routingMetadata.routingReason}`);
    }

    return `\`\`\`\n${markers.join('\n')}\n\`\`\``;
  }

  private static generateMemoryInjection(
    memoryContext?: MemoryContext,
    userInput?: string
  ): string {
    if (!memoryContext?.hasRelatedGoals && !memoryContext?.hasSessionHistory) return '';

    // Prioritize goals, fall back to session history
    let contextItem = memoryContext.goals?.[0] || memoryContext.recentInteractions?.[0];
    if (!contextItem) return '';
    
    // Clean up the summary - extract meaningful content
    let contextSummary = contextItem.summary;
    
    // Remove technical prefixes and formatting
    contextSummary = contextSummary
      .replace(/^(ROUTING_HANDOFF:|ROUTING_TRANSITION:|Agent:|Memory:|Log:)/i, '')
      .replace(/^\w+:\s*/, '') // Remove agent prefixes
      .trim();
    
    // Take first meaningful sentence
    if (contextSummary.includes('.')) {
      contextSummary = contextSummary.split('.')[0];
    }
    
    // Limit length and ensure it makes sense
    contextSummary = contextSummary.substring(0, 70).trim();
    if (contextSummary.length < 15) return ''; // Skip if too short to be meaningful
    
    // Natural language memory weaving - more subtle integration
    const isGoal = memoryContext.hasRelatedGoals;
    const isRecentInteraction = !isGoal && memoryContext.hasSessionHistory;
    
    if (isGoal) {
      const memoryPhrases = [
        `Continuing from your ${contextSummary.toLowerCase()}...`,
        `Building on what we discussed about ${contextSummary.toLowerCase()}:`,
        `Since you're working on ${contextSummary.toLowerCase()}, let me expand on that:`
      ];
      const selectedPhrase = memoryPhrases[Math.floor(Math.random() * memoryPhrases.length)];
      return selectedPhrase;
    } else if (isRecentInteraction) {
      return `Following up on our recent discussion...`;
    }
    
    return '';
  }

  private static enhanceOriginalResponse(originalResponse: string, agentId: string): string {
    // Add agent-specific formatting and structure
    const agentEnhancements = {
      research: (text: string) => this.addResearchStructure(text),
      automation: (text: string) => this.addAutomationStructure(text),
      creative: (text: string) => this.addCreativeStructure(text),
      welcome: (text: string) => text, // Welcome agent already well-formatted
      router: (text: string) => text
    };

    const enhancer = agentEnhancements[agentId as keyof typeof agentEnhancements];
    return enhancer ? enhancer(originalResponse) : originalResponse;
  }

  private static generateFeatureAwareness(agentId: string, voiceEnabled: boolean): string {
    // Make feature awareness more subtle and integrated
    const capabilities = this.getAgentCapabilities(agentId);
    if (capabilities) {
      return `_${capabilities}_`;
    }

    return '';
  }

  private static generateCollaborativeEnding(
    agentId: string,
    userInput: string,
    memoryContext?: MemoryContext
  ): string {
    const endings = this.getAgentSpecificEndings(agentId, userInput, memoryContext);
    return endings[Math.floor(Math.random() * endings.length)];
  }

  // Helper methods for agent-specific formatting
  private static addResearchStructure(text: string): string {
    // Add research-specific formatting if not already present
    if (!text.includes('##') && !text.includes('**')) {
      // Simple enhancement - add structure markers
      return `📊 **Research Findings**:\n\n${text}`;
    }
    return text;
  }

  private static addAutomationStructure(text: string): string {
    // Add automation-specific formatting
    if (!text.includes('##') && !text.includes('**')) {
      return `🛠️ **Automation Solution**:\n\n${text}`;
    }
    return text;
  }

  private static addCreativeStructure(text: string): string {
    // Add creative-specific formatting
    if (!text.includes('##') && !text.includes('**')) {
      return `✨ **Creative Ideas**:\n\n${text}`;
    }
    return text;
  }

  // Agent metadata helpers
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

  private static getAgentEmoji(agentId: string): string {
    const emojis = {
      research: '🔬',
      automation: '⚡',
      creative: '✨',
      welcome: '👋',
      router: '🧠'
    };
    return emojis[agentId as keyof typeof emojis] || '🤖';
  }

  private static getAgentCapabilities(agentId: string): string | null {
    const capabilities = {
      research: 'I can provide step-by-step analysis or generate comprehensive reports.',
      automation: 'I can either walk you through this manually or generate a first draft — let me know your style.',
      creative: 'I can brainstorm variations or dive deep into a specific direction.',
      welcome: null,
      router: null
    };
    return capabilities[agentId as keyof typeof capabilities];
  }

  private static getAgentSpecificEndings(
    agentId: string,
    userInput: string,
    memoryContext?: MemoryContext
  ): string[] {
    const baseEndings = {
      research: [
        'Would you like me to dive deeper into any specific aspect?',
        'Should I break this down step-by-step with more detail?',
        'Would you prefer a summary or shall we explore the technical details?'
      ],
      automation: [
        'Would you like me to generate a project outline based on what we discussed?',
        'Should I create a workflow template or walk you through the process first?',
        'Would you prefer a complete automation script or a step-by-step guide?'
      ],
      creative: [
        'Would you like me to explore more variations on this theme?',
        'Should I develop one of these ideas further or generate completely new options?',
        'Would you prefer more concepts or shall we refine your favorites?'
      ],
      welcome: [
        'What aspect would you like to explore first?',
        'Would you like a guided tour or do you prefer to explore on your own?'
      ],
      router: [
        'How can I help you get started?',
        'Which direction interests you most?'
      ]
    };

    return baseEndings[agentId as keyof typeof baseEndings] || [
      'How would you like to proceed?',
      'What would be most helpful next?'
    ];
  }
}