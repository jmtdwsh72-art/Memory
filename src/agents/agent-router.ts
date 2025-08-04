import { AgentConfig, AgentMessage, AgentResponse } from '../utils/types';
import { MemoryManager } from '../utils/memory-manager';
import { ResearchAgent } from './agent-research';
import { AutomationAgent } from './agent-automation';
import { CreativeAgent } from './agent-creative';
import { WelcomeAgentWrapper } from './agent-welcome-wrapper';
import { determineAgentByInput, getAllAgents } from '../config/agent-config';
import { getAgentConfig } from '../utils/config-utils';
import { useAgentMemoryWithPreset } from '../utils/memory-hooks';
import { logAgentError, logSystemError } from '../utils/error-logger';
import { ResponseMiddleware } from '../utils/response-middleware';
import { RoutingStateManager, RoutingDecision } from '../utils/routing-state-manager';

export class RouterAgent {
  private config: AgentConfig;
  private memoryManager: MemoryManager;
  private subAgents: Map<string, any>;
  private routingStateManager: RoutingStateManager;

  constructor() {
    // Load validated configuration using centralized utility
    this.config = getAgentConfig('router');
    this.memoryManager = new MemoryManager();
    this.subAgents = new Map();
    this.routingStateManager = new RoutingStateManager();
    this.initializeSubAgents();
  }

  private initializeSubAgents(): void {
    // Dynamically initialize agents based on registry
    const activeAgents = getAllAgents().filter(agent => agent.status === 'active' && agent.id !== 'router');
    
    for (const agentConfig of activeAgents) {
      switch (agentConfig.id) {
        case 'research':
          this.subAgents.set('research', new ResearchAgent());
          break;
        case 'automation':
          this.subAgents.set('automation', new AutomationAgent());
          break;
        case 'creative':
          this.subAgents.set('creative', new CreativeAgent());
          break;
        case 'welcome':
          this.subAgents.set('welcome', new WelcomeAgentWrapper());
          break;
        // Future agents can be added here
        default:
          console.warn(`Unknown agent type: ${agentConfig.id}`);
          logSystemError(new Error(`Unknown agent type: ${agentConfig.id}`), {
            agentId: 'router',
            context: 'agent_initialization'
          });
      }
    }
  }

  async processInput(input: string, userId?: string, currentAgent?: string): Promise<AgentResponse> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Use centralized memory utilities with router preset
      const memory = useAgentMemoryWithPreset(this.config.id, 'router', userId);
      
      // Recall relevant memories for enhanced routing
      const memoryContext = await memory.recallWithPreset(input);
      const contextString = memory.buildContext(memoryContext);
      
      // Check for recent routing patterns to prevent loops
      const recentRoutings = await this.checkRecentRoutings(userId, input);
      
      // Enhanced intent analysis with memory awareness
      const intentResult = this.analyzeUserIntent(input);
      const agentType = this.determineAgentType(input);
      
      // Evaluate routing decision using state manager
      const routingDecision = this.routingStateManager.evaluateRouting(
        userId || 'anonymous',
        agentType,
        intentResult.confidence,
        input,
        intentResult.reasoning,
        currentAgent
      );

      console.log('[RouterAgent] Enhanced routing decision:', {
        input: input.substring(0, 50),
        intentAnalysis: intentResult,
        routingDecision,
        availableAgents: Array.from(this.subAgents.keys())
      });

      let response: AgentResponse;
      
      // Handle routing based on state manager decision
      if (routingDecision.shouldRoute && routingDecision.confidence >= 0.7) {
        // High confidence - route directly to target agent
        const targetAgent = this.subAgents.get(routingDecision.targetAgent);
        if (targetAgent) {
          response = await this.routeToAgentWithHandoff(routingDecision.targetAgent, targetAgent, input, userId, {
            originalInput: input,
            contextSummary: contextString,
            routingReason: routingDecision.reason,
            confidence: routingDecision.confidence,
            recentRoutings,
            bypassedClarification: true,
            suppressIntro: routingDecision.suppressIntro,
            dampingApplied: routingDecision.dampingApplied
          });
        } else {
          response = await this.handleDirectResponse(input, contextString);
        }
      } else if (!routingDecision.shouldRoute && routingDecision.targetAgent === currentAgent) {
        // Staying in current agent - pass through without routing
        const targetAgent = this.subAgents.get(routingDecision.targetAgent);
        if (targetAgent) {
          response = await this.routeToAgent(routingDecision.targetAgent, targetAgent, input, userId, {
            originalInput: input,
            contextSummary: contextString,
            routingReason: routingDecision.reason,
            confidence: routingDecision.confidence,
            recentRoutings,
            bypassedClarification: true,
            suppressIntro: routingDecision.suppressIntro,
            stayInThread: true
          });
        } else {
          response = await this.handleDirectResponse(input, contextString);
        }
      } else if (routingDecision.confidence >= 0.3 && routingDecision.confidence < 0.7) {
        // Medium confidence - prefer clarification over routing
        response = await this.handleClarificationRequest(input, {
          agentId: routingDecision.targetAgent,
          confidence: routingDecision.confidence,
          reasoning: routingDecision.reason
        });
      } else if (agentType === 'welcome' && (this.isOnboardingQuery(input) || routingDecision.confidence < 0.3)) {
        // Low confidence or onboarding - route to welcome agent
        const targetAgent = this.subAgents.get('welcome');
        if (targetAgent) {
          response = await this.routeToAgent('welcome', targetAgent, input, userId, {
            originalInput: input,
            contextSummary: contextString,
            routingReason: 'onboarding or low confidence',
            confidence: intentResult.confidence,
            recentRoutings,
            bypassedClarification: true
          });
        } else {
          response = await this.handleDirectResponse(input, contextString);
        }
      } else {
        // Fallback to direct router response instead of welcome agent
        response = await this.handleDirectResponse(input, contextString);
      }
      
      // Store interaction with routing metadata and cross-agent context
      await memory.saveMemory(
        input, 
        response.message, 
        `ROUTING_HANDOFF: ${agentType} (confidence: ${intentResult.confidence}) | Session: ${userId} | Original input preserved for target agent`
      );
      
      // Log the routing decision
      await this.logInteraction({
        id: this.generateId(),
        timestamp: new Date(),
        agentName: this.config.name,
        input,
        output: `[Router → ${agentType}] ${response.message}`
      });

      // Update routing state after processing
      this.routingStateManager.updateRoutingState(
        userId || 'anonymous',
        routingDecision.targetAgent,
        input,
        intentResult.reasoning,
        routingDecision.confidence,
        routingDecision.shouldRoute
      );

      // Add thread redirection metadata for frontend
      const shouldRedirect = routingDecision.shouldRoute && routingDecision.confidence >= 0.7;
      
      return {
        ...response,
        memoryUpdated: true,
        routing: shouldRedirect ? {
          shouldRedirect: true,
          targetAgent: routingDecision.targetAgent,
          confidence: routingDecision.confidence,
          reasoning: routingDecision.reason,
          originalMessage: response.message
        } : undefined
      };
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown router error');
      
      // Log the error with context
      await logAgentError('router', errorObj, {
        input,
        userId,
        requestId,
        sessionId: userId
      });
      
      return {
        success: false,
        message: `Router error: ${errorObj.message}`
      };
    }
  }

  private async routeToAgentWithHandoff(
    agentType: string, 
    targetAgent: any, 
    input: string, 
    userId?: string,
    routingContext?: {
      originalInput: string;
      contextSummary?: string;
      routingReason?: string;
      confidence?: number;
      recentRoutings?: any[];
      bypassedClarification?: boolean;
      suppressIntro?: boolean;
      dampingApplied?: number;
      stayInThread?: boolean;
    }
  ): Promise<AgentResponse> {
    try {
      // Get agent configuration for personalized handoff
      const agentConfig = getAllAgents().find(agent => agent.id === agentType);
      const agentName = agentConfig?.name || 'Specialist Agent';

      // Check for memory context awareness
      const hasMemoryContext = routingContext?.contextSummary && routingContext.contextSummary.trim().length > 0;
      const memoryAwareness = hasMemoryContext ? 
        `I see we've discussed related topics before. ` : '';

      // Log the successful routing
      await this.logRoutingTransition(agentType, input, userId, {
        success: true,
        confidence: routingContext?.confidence || 0,
        reasoning: routingContext?.routingReason || 'keyword match',
        hasMemoryContext
      });

      // Actually execute the target agent with the original input
      const agentResponse = await this.routeToAgent(agentType, targetAgent, input, userId, routingContext);
      
      // Return the agent's response directly (no routing metadata - we've already routed)
      return agentResponse;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Routing failed');
      
      // Log the routing failure
      await this.logRoutingTransition(agentType, input, userId, {
        success: false,
        confidence: routingContext?.confidence || 0,
        reasoning: `Routing error: ${errorObj.message}`
      });

      // Return fallback response without routing
      return {
        success: false,
        message: `I encountered an issue with routing. Let me help you directly instead.`
      };
    }
  }

  private async routeToAgent(
    agentType: string, 
    targetAgent: any, 
    input: string, 
    userId?: string,
    routingContext?: {
      originalInput: string;
      contextSummary?: string;
      routingReason?: string;
      confidence?: number;
      recentRoutings?: any[];
      bypassedClarification?: boolean;
      suppressIntro?: boolean;
      dampingApplied?: number;
      stayInThread?: boolean;
    }
  ): Promise<AgentResponse> {
    try {
      // Check if this agent was recently used to prevent immediate bouncing
      const shouldSkipHandoff = routingContext?.recentRoutings?.some(
        routing => routing.agentType === agentType && 
        Date.now() - routing.timestamp < 30000 // 30 seconds
      );

      // Get agent configuration for personalized handoff
      const agentConfig = getAllAgents().find(agent => agent.id === agentType);
      const agentName = agentConfig?.name || 'Specialist Agent';

      // Check for memory context
      const hasMemoryContext = routingContext?.contextSummary && routingContext.contextSummary.trim().length > 0;
      const isRepeatedTopic = routingContext?.recentRoutings?.some(
        routing => routing.similarity > 0.7
      );

      let handoffMessage = '';
      if (!shouldSkipHandoff && routingContext?.confidence && routingContext.confidence > 0.8) {
        // High confidence - smooth handoff with memory awareness
        if (hasMemoryContext && isRepeatedTopic) {
          handoffMessage = `I see you're continuing our ${agentName.toLowerCase()} discussion. Let me connect you back.\n\n`;
        } else if (hasMemoryContext) {
          handoffMessage = `Based on what we've discussed before, ${agentName} can help you best with this. Connecting you now.\n\n`;
        } else {
          handoffMessage = `Perfect! I can see you need ${agentName.toLowerCase()} expertise. Let me connect you right away.\n\n`;
        }
      } else if (!shouldSkipHandoff && routingContext?.confidence && routingContext.confidence > 0.5) {
        // Medium confidence - brief handoff
        handoffMessage = `I'll hand you over to the ${agentName} to help with that.\n\n`;
      }
      // Low confidence or recent routing - no handoff message, direct routing

      // Pass routing metadata to the target agent
      const enhancedInput = {
        originalInput: input,
        routingMetadata: {
          routedFrom: 'router',
          confidence: routingContext?.confidence || 0,
          hasMemoryContext,
          contextPreview: hasMemoryContext ? 
            routingContext.contextSummary?.split('\n').slice(0, 2).join(' ') : undefined
        }
      };

      // Route to the target agent with preserved context
      const agentResponse = await targetAgent.processInput(input, userId, enhancedInput);
      
      // Log the successful routing
      await this.logRoutingTransition(agentType, input, userId, {
        success: true,
        confidence: routingContext?.confidence || 0,
        reasoning: routingContext?.routingReason || 'keyword match',
        hasMemoryContext
      });

      // Prepare routing metadata for response enhancement
      const routingMetadata = {
        routedFrom: 'router',
        confidence: routingContext?.confidence || 0,
        hasMemoryContext,
        contextPreview: hasMemoryContext ? 
          routingContext.contextSummary?.split('\n').slice(0, 2).join(' ') : undefined,
        routingReason: routingContext?.routingReason,
        recentRoutings: routingContext?.recentRoutings
      };

      // Enhance the response with context awareness and professional formatting
      const enhancedResponse = await ResponseMiddleware.enhanceAgentResponse({
        agentId: agentType,
        agentName: agentName,
        originalResponse: agentResponse,
        userInput: input,
        userId,
        routingMetadata: {
          ...routingMetadata,
          suppressIntro: routingContext?.suppressIntro,
          stayInThread: routingContext?.stayInThread,
          dampingApplied: routingContext?.dampingApplied
        },
        voiceEnabled: ResponseMiddleware.isVoiceEnabled()
      });

      return enhancedResponse;

    } catch (agentError) {
      const errorObj = agentError instanceof Error ? agentError : new Error('Agent processing failed');
      
      // Log the routing failure
      await this.logRoutingTransition(agentType, input, userId, {
        success: false,
        error: errorObj.message,
        confidence: routingContext?.confidence || 0
      });
      
      // Log agent-specific error
      await logAgentError(agentType, errorObj, {
        input,
        userId,
        sessionId: userId,
        routingContext
      });
      
      // Create professional error response
      const routingMetadata = {
        routedFrom: 'router',
        confidence: routingContext?.confidence || 0,
        hasMemoryContext,
        routingReason: routingContext?.routingReason
      };

      return ResponseMiddleware.createErrorResponse(
        agentType,
        agentName,
        errorObj,
        input,
        routingMetadata
      );
    }
  }

  private async checkRecentRoutings(userId?: string, currentInput?: string): Promise<any[]> {
    try {
      // Check memory for recent routing patterns
      const memory = useAgentMemoryWithPreset(this.config.id, 'router', userId);
      const recentMemories = await memory.recallWithPreset('ROUTING_TRANSITION');
      
      const recentRoutings = recentMemories.entries
        .filter(entry => entry.summary.includes('ROUTING_TRANSITION'))
        .map(entry => {
          try {
            // Extract routing info from logged interactions
            const match = entry.summary.match(/Routed to: (\w+)/);
            if (match) {
              return {
                agentType: match[1],
                timestamp: entry.lastAccessed.getTime(),
                input: entry.input,
                similarity: this.calculateInputSimilarity(currentInput || '', entry.input)
              };
            }
          } catch (parseError) {
            // Ignore parsing errors for individual entries
          }
          return null;
        })
        .filter(routing => routing !== null)
        .sort((a, b) => b.timestamp - a.timestamp);

      // Filter to recent routings (last 5 minutes) with similar inputs
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      const relevantRoutings = recentRoutings.filter(routing => 
        routing.timestamp > fiveMinutesAgo && routing.similarity > 0.6
      );

      return relevantRoutings;
    } catch (error) {
      console.warn('[RouterAgent] Could not check recent routings:', error);
      return [];
    }
  }

  private calculateInputSimilarity(input1: string, input2: string): number {
    if (!input1 || !input2) return 0;
    
    const words1 = input1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = input2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(word => words2.includes(word));
    const similarity = (commonWords.length * 2) / (words1.length + words2.length);
    
    return similarity;
  }

  private async shouldBypassClarification(
    input: string, 
    userId?: string, 
    intentResult?: { agentId: string | null; confidence: number }
  ): Promise<boolean> {
    try {
      // Check if user has recently expressed clear preference for an agent type
      const memory = useAgentMemoryWithPreset(this.config.id, 'router', userId);
      const recentMemories = await memory.recallWithPreset(input);
      
      // Look for patterns of user confirming agent choices
      const hasRecentConfirmation = recentMemories.entries.some(entry => {
        const content = entry.input.toLowerCase();
        return content.includes('yes') || content.includes('correct') || 
               content.includes('that\'s right') || content.includes('exactly');
      });
      
      // If user has been consistently routed to the same agent type, increase confidence
      if (intentResult?.agentId && hasRecentConfirmation) {
        const recentRoutings = await this.checkRecentRoutings(userId, input);
        const sameAgentRoutings = recentRoutings.filter(r => r.agentType === intentResult.agentId);
        
        if (sameAgentRoutings.length >= 2) {
          return true; // User seems to prefer this agent type
        }
      }
      
      return false;
    } catch (error) {
      console.warn('[RouterAgent] Could not check bypass conditions:', error);
      return false;
    }
  }

  private async logRoutingTransition(
    agentType: string, 
    input: string, 
    userId?: string, 
    metadata?: any
  ): Promise<void> {
    try {
      await this.logInteraction({
        id: this.generateId(),
        timestamp: new Date(),
        agentName: 'Router',
        input: `ROUTING_TRANSITION: ${input}`,
        output: JSON.stringify({
          targetAgent: agentType,
          userId,
          metadata
        })
      });
    } catch (error) {
      console.warn('[RouterAgent] Could not log routing transition:', error);
    }
  }

  private isOnboardingQuery(input: string): boolean {
    const lowerInput = input.toLowerCase().trim();
    
    // Check for onboarding-related keywords
    const onboardingKeywords = [
      'welcome', 'start', 'begin', 'help', 'how to use', 'getting started',
      'what can you do', 'what are you', 'introduction', 'tour', 'guide me',
      'show me around', 'new here', 'first time', 'explain this', 'how does this work'
    ];
    
    return onboardingKeywords.some(keyword => lowerInput.includes(keyword));
  }

  private determineAgentType(input: string): string {
    const lowerInput = input.toLowerCase().trim();
    
    // Check for common greetings that should go to welcome agent
    const greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
    const isGreeting = greetings.some(greeting => 
      lowerInput === greeting || lowerInput.startsWith(greeting + ' ')
    );
    
    if (isGreeting) {
      return 'welcome';
    }
    
    // Enhanced intent matching with contextual understanding
    const intentResult = this.analyzeUserIntent(input);
    
    // If we have a clear intent match, use it
    if (intentResult.agentId && intentResult.confidence > 0.7) {
      return intentResult.agentId;
    }
    
    // Fall back to keyword matching for lower confidence
    return determineAgentByInput(input);
  }

  private analyzeUserIntent(input: string): { agentId: string | null; confidence: number; reasoning: string } {
    const lowerInput = input.toLowerCase().trim();
    
    // Intent patterns with confidence scoring and synonyms
    const intentPatterns = [
      // Research patterns (including planning, learning, and analysis) - HIGHEST PRIORITY
      {
        agentId: 'research',
        patterns: [
          /^(what|who|when|where|why|how|tell me about|explain|research|find|investigate|analyze|study|explore)/,
          /^(help me (plan|start|outline|research|understand|learn))/,
          /\b(plan|planning|start|outline|strategy|approach|framework|methodology)\b/,
          /\b(help me plan|i want to plan|need to plan|planning a|planning for)\b/,
          /\b(learn|understand|information|data|facts|evidence|statistics|trends|comparison)\b/,
          /\b(research|investigate|analyze|study|explore|examine|compare|evaluate)\b/,
          /\b(i want to learn|teach me|how to|how do i|show me how)\b/,
          /\b(tutorial|guide|instructions|steps|walkthrough)\b/
        ],
        keywords: [
          // Planning and research (PRIORITY KEYWORDS)
          'plan', 'planning', 'start', 'outline', 'strategy', 'approach', 'framework', 'methodology', 'research', 'analysis',
          // Programming synonyms  
          'python', 'javascript', 'java', 'c++', 'programming', 'coding', 'code', 'development', 'software',
          // General learning
          'technology', 'science', 'market', 'data', 'study', 'course', 'training', 'project',
          // Specific topics
          'algorithm', 'database', 'library', 'api', 'web development', 'machine learning'
        ],
        weight: 1.5 // HIGHEST weight for research (was 1.2)
      },
      
      // Creative patterns  
      {
        agentId: 'creative',
        patterns: [
          /^(create|generate|brainstorm|design|imagine|write|come up with|think of)/,
          /\b(ideas|creative|story|name|concept|design|inspiration|innovative|original)\b/,
          /\b(brainstorm|ideate|conceptualize|visualize|craft|compose)\b/
        ],
        keywords: ['story', 'name', 'brand', 'creative', 'ideas', 'design', 'concept', 'brainstorm'],
        weight: 1.0
      },
      
      // Automation patterns (VERY SPECIFIC - optimization and implementation ONLY)
      {
        agentId: 'automation',
        patterns: [
          /^(automate|optimize|build a script|create a template|systematize this)/,
          /\b(automation|workflow optimization|optimize this|streamline this process|systematize|mechanize)\b/,
          /\b(build me a (script|template|tool|bot)|make this (efficient|faster|automated))\b/,
          /\b(help me (automate this|optimize this|streamline this|systematize this))\b/
        ],
        keywords: [
          // Automation-specific (VERY SPECIFIC)
          'automate', 'automation', 'optimize', 'streamline', 'systematize', 'mechanize',
          'script', 'template', 'tool', 'bot', 'integration', 'workflow', 'efficient'
        ],
        weight: 0.8 // LOWER weight - much more specific targeting (was 0.9)
      }
    ];

    let bestMatch = { agentId: null as string | null, confidence: 0, reasoning: '' };

    for (const pattern of intentPatterns) {
      let score = 0;
      let matchDetails: string[] = [];

      // Check regex patterns
      for (const regex of pattern.patterns) {
        if (regex.test(lowerInput)) {
          score += 0.4 * pattern.weight;
          matchDetails.push('pattern match');
          break;
        }
      }

      // Check keyword presence
      const keywordMatches = pattern.keywords.filter(keyword => 
        lowerInput.includes(keyword.toLowerCase())
      );
      
      if (keywordMatches.length > 0) {
        score += (keywordMatches.length * 0.3) * pattern.weight;
        matchDetails.push(`keywords: ${keywordMatches.join(', ')}`);
      }

      // Boost for specific intent indicators
      const intentBoosts = this.getIntentBoosts(lowerInput, pattern.agentId);
      score += intentBoosts.boost;
      if (intentBoosts.reasoning) {
        matchDetails.push(intentBoosts.reasoning);
      }

      if (score > bestMatch.confidence) {
        bestMatch = {
          agentId: pattern.agentId,
          confidence: Math.min(score, 1.0),
          reasoning: matchDetails.join(', ')
        };
      }
    }

    return bestMatch;
  }

  private getIntentBoosts(input: string, agentId: string): { boost: number; reasoning: string } {
    const boosts = {
      'research': [
        { pattern: /\b(i want to learn|teach me|explain|what is|how does)\b/, boost: 0.4, reason: 'learning intent' },
        { pattern: /\b(statistics|data|evidence|facts|information)\b/, boost: 0.3, reason: 'information seeking' },
        { pattern: /\b(compare|versus|vs|difference between)\b/, boost: 0.3, reason: 'comparison request' },
        { pattern: /\b(plan|planning|start|outline|strategy|approach)\b/, boost: 0.7, reason: 'planning and strategy' }, // INCREASED
        { pattern: /\b(help me (plan|start|outline|research|understand))\b/, boost: 0.8, reason: 'planning assistance' }, // INCREASED
        { pattern: /\b(project|framework|methodology)\b/, boost: 0.4, reason: 'project research' }, // INCREASED
        { pattern: /\b(help me plan a|planning a|plan for)\b/, boost: 0.9, reason: 'direct planning request' } // NEW
      ],
      'creative': [
        { pattern: /\b(name for|title for|brand|creative name)\b/, boost: 0.4, reason: 'naming request' },
        { pattern: /\b(story|novel|character|plot|writing)\b/, boost: 0.3, reason: 'creative writing' },
        { pattern: /\b(brainstorm|ideas for|suggestions for)\b/, boost: 0.4, reason: 'ideation request' }
      ],
      'automation': [
        { pattern: /\b(automate this|automation for|optimize this specific|streamline this process|systematize this)\b/, boost: 0.5, reason: 'automation focus' }, // MORE SPECIFIC
        { pattern: /\b(build a (script|template|tool|bot)|create an automated)\b/, boost: 0.4, reason: 'efficiency tools' }, // MORE SPECIFIC
        { pattern: /\b(save time by automating|make this faster|more efficient workflow)\b/, boost: 0.4, reason: 'efficiency seeking' }, // MORE SPECIFIC
        { pattern: /\b(help me (automate this|optimize this workflow|streamline this specific|systematize this process))\b/, boost: 0.6, reason: 'automation assistance' } // MORE SPECIFIC
      ]
    };

    const agentBoosts = boosts[agentId as keyof typeof boosts] || [];
    
    for (const boostRule of agentBoosts) {
      if (boostRule.pattern.test(input)) {
        return { boost: boostRule.boost, reasoning: boostRule.reason };
      }
    }
    
    return { boost: 0, reasoning: '' };
  }

  private async handleClarificationRequest(
    input: string, 
    intentResult: { agentId: string | null; confidence: number; reasoning: string }
  ): Promise<AgentResponse> {
    const activeAgents = getAllAgents().filter(agent => agent.status === 'active' && agent.id !== 'router');
    
    // Generate smart clarification based on the ambiguous intent
    const possibleAgents = this.getPossibleAgentsForInput(input);
    const suggestions = possibleAgents.slice(0, 3).map(agent => {
      const emoji = this.getAgentEmoji(agent.icon);
      return `${emoji} **${agent.name}**: ${this.generateAgentSuggestion(agent, input)}`;
    }).join('\n');

    let clarificationMessage = `I can help you with that! Your request "${input}" could be handled in a few different ways:\n\n${suggestions}\n\n`;
    
    if (intentResult.agentId && intentResult.confidence > 0.4) {
      const suggestedAgent = activeAgents.find(agent => agent.id === intentResult.agentId);
      if (suggestedAgent) {
        clarificationMessage += `**My recommendation**: I think you're looking for ${suggestedAgent.name.toLowerCase()} help based on your request.\n\n`;
      }
    }
    
    clarificationMessage += `Just let me know which direction sounds right, or feel free to rephrase your request with more details!`;

    return {
      success: true,
      message: clarificationMessage
    };
  }

  private getPossibleAgentsForInput(input: string): any[] {
    const lowerInput = input.toLowerCase();
    const activeAgents = getAllAgents().filter(agent => agent.status === 'active' && agent.id !== 'router');
    
    // Score agents by potential relevance
    const agentScores = activeAgents.map(agent => {
      let score = 0;
      
      // Check keywords
      for (const keyword of agent.keywords) {
        if (lowerInput.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }
      
      // Check if input contains words that relate to agent's purpose
      const purposeWords = agent.description.toLowerCase().split(/\s+/);
      for (const word of purposeWords) {
        if (word.length > 3 && lowerInput.includes(word)) {
          score += 0.5;
        }
      }
      
      return { agent, score };
    }).filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.agent);

    return agentScores.length > 0 ? agentScores : activeAgents.slice(0, 3);
  }

  private generateAgentSuggestion(agent: any, input: string): string {
    const lowerInput = input.toLowerCase();
    
    const suggestions = {
      'research': [
        'Find detailed information and analysis',
        'Research and investigate the topic thoroughly', 
        'Analyze data and provide comprehensive insights'
      ],
      'creative': [
        'Brainstorm innovative ideas and concepts',
        'Generate creative names or titles',
        'Develop story ideas and creative content'
      ],
      'automation': [
        'Build workflows and automated processes',
        'Create tools and scripts to save time',
        'Optimize and streamline your tasks'
      ]
    };
    
    const agentSuggestions = suggestions[agent.id as keyof typeof suggestions] || [
      'Provide specialized assistance for this type of request'
    ];
    
    // Try to pick the most relevant suggestion based on input
    if (lowerInput.includes('learn') || lowerInput.includes('understand')) {
      return agentSuggestions[0];
    } else if (lowerInput.includes('create') || lowerInput.includes('generate')) {
      return agentSuggestions[1] || agentSuggestions[0];
    } else {
      return agentSuggestions[0];
    }
  }

  private getAgentEmoji(icon: string): string {
    const iconMap: Record<string, string> = {
      'Search': '🔬',
      'Zap': '🛠️', 
      'BarChart3': '📊',
      'MessageCircle': '💬',
      'Sparkles': '✨',
      'Bot': '🤖'
    };
    return iconMap[icon] || '🤖';
  }

  private async handleDirectResponse(input: string, memoryContext?: string): Promise<AgentResponse> {
    const activeAgents = getAllAgents().filter(agent => agent.status === 'active' && agent.id !== 'router');
    
    const agentDescriptions = activeAgents.map(agent => {
      const iconMap: Record<string, string> = {
        'Search': '🔬',
        'Zap': '🛠️',
        'BarChart3': '📊',
        'MessageCircle': '💬',
        'Sparkles': '✨'
      };
      const icon = iconMap[agent.icon] || '🤖';
      return `${icon} **${agent.name}**: ${agent.description}`;
    }).join('\n');

    const agentIds = activeAgents.map(agent => agent.id).join(', ');

    let response = `Hey there! I'm your routing assistant. I can connect you to specialized agents for different tasks:

${agentDescriptions}

Available agents: ${agentIds}

Just tell me what you need help with, and I'll get you to the right specialist! Your request: "${input}"`;

    // Add memory context if available
    if (memoryContext && memoryContext.trim()) {
      response += `\n\n${memoryContext}`;
    }
    
    await this.logInteraction({
      id: this.generateId(),
      timestamp: new Date(),
      agentName: this.config.name,
      input,
      output: response
    });

    return {
      success: true,
      message: response
    };
  }

  private async logInteraction(message: AgentMessage): Promise<void> {
    await this.memoryManager.logMessage(message);
  }

  private generateId(): string {
    return `router_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }
}