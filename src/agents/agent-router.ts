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

export class RouterAgent {
  private config: AgentConfig;
  private memoryManager: MemoryManager;
  private subAgents: Map<string, any>;

  constructor() {
    // Load validated configuration using centralized utility
    this.config = getAgentConfig('router');
    this.memoryManager = new MemoryManager();
    this.subAgents = new Map();
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

  async processInput(input: string, userId?: string): Promise<AgentResponse> {
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
      const targetAgent = this.subAgents.get(agentType);

      console.log('[RouterAgent] Enhanced routing decision:', {
        input: input.substring(0, 50),
        intentAnalysis: intentResult,
        determinedAgentType: agentType,
        hasTargetAgent: !!targetAgent,
        recentRoutings: recentRoutings.length,
        availableAgents: Array.from(this.subAgents.keys())
      });

      let response: AgentResponse;
      
      // Handle routing to specialized agents
      if (targetAgent && agentType !== 'router') {
        // Check if we should bypass clarification based on user history
        const shouldBypass = await this.shouldBypassClarification(input, userId, intentResult);
        
        // For high confidence routing (> 0.6), auto-switch to specialist agent
        if (intentResult.confidence > 0.6 || shouldBypass) {
          // Route to the target agent with clear handoff format
          response = await this.routeToAgentWithHandoff(agentType, targetAgent, input, userId, {
            originalInput: input,
            contextSummary: contextString,
            routingReason: intentResult.reasoning,
            confidence: intentResult.confidence,
            recentRoutings,
            bypassedClarification: shouldBypass
          });
        } else if (intentResult.confidence < 0.7 && intentResult.confidence > 0.3 && !shouldBypass) {
          response = await this.handleClarificationRequest(input, intentResult);
        } else {
          // Medium confidence - still route but with less certainty
          response = await this.routeToAgent(agentType, targetAgent, input, userId, {
            originalInput: input,
            contextSummary: contextString,
            routingReason: intentResult.reasoning,
            confidence: intentResult.confidence,
            recentRoutings,
            bypassedClarification: shouldBypass
          });
        }
      } else {
        // Handle direct response or no clear routing target
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

      return {
        ...response,
        memoryUpdated: true
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
    }
  ): Promise<AgentResponse> {
    try {
      // Get agent configuration for personalized handoff
      const agentConfig = getAllAgents().find(agent => agent.id === agentType);
      const agentName = agentConfig?.name || 'Specialist Agent';

      // Log the successful routing
      await this.logRoutingTransition(agentType, input, userId, {
        success: true,
        confidence: routingContext?.confidence || 0,
        reasoning: routingContext?.routingReason || 'keyword match'
      });

      // Return routing decision without executing the agent
      // The frontend will handle the actual routing and agent execution
      return {
        success: true,
        message: `Routing to ${agentName}...`,
        routing: {
          shouldRoute: true,
          targetAgent: agentType,
          confidence: routingContext?.confidence || 0,
          reasoning: routingContext?.routingReason || 'keyword match',
          originalInput: input
        }
      };

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

      let handoffMessage = '';
      if (!shouldSkipHandoff && routingContext?.confidence && routingContext.confidence > 0.8) {
        // High confidence - smooth handoff
        handoffMessage = `Perfect! I can see you need ${agentName.toLowerCase()} expertise. Let me connect you right away.\n\n`;
      } else if (!shouldSkipHandoff && routingContext?.confidence && routingContext.confidence > 0.5) {
        // Medium confidence - brief handoff
        handoffMessage = `I'll hand you over to the ${agentName} to help with that.\n\n`;
      }
      // Low confidence or recent routing - no handoff message, direct routing

      // Route to the target agent with preserved context
      const agentResponse = await targetAgent.processInput(input, userId);
      
      // Log the successful routing
      await this.logRoutingTransition(agentType, input, userId, {
        success: true,
        confidence: routingContext?.confidence || 0,
        reasoning: routingContext?.routingReason || 'keyword match'
      });

      // Combine handoff message with agent response if needed
      const finalMessage = handoffMessage ? 
        `${handoffMessage}${agentResponse.message}` : 
        agentResponse.message;

      return {
        ...agentResponse,
        message: finalMessage
      };

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
      
      // Return fallback response
      return {
        success: false,
        message: `The ${agentType} agent encountered an issue. Let me try to help you directly instead.\n\nYour request: "${input}"\n\nCould you try rephrasing your question, or would you like me to suggest which type of assistance might work better?`
      };
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
      // Research patterns (including learning and programming)
      {
        agentId: 'research',
        patterns: [
          /^(what|who|when|where|why|how|tell me about|explain|research|find|investigate|analyze|study|explore)/,
          /\b(learn|understand|information|data|facts|evidence|statistics|trends|comparison)\b/,
          /\b(research|investigate|analyze|study|explore|examine|compare|evaluate)\b/,
          /\b(i want to learn|teach me|how to|how do i|show me how)\b/,
          /\b(tutorial|guide|instructions|steps|walkthrough)\b/
        ],
        keywords: [
          // Programming synonyms
          'python', 'javascript', 'java', 'c++', 'programming', 'coding', 'code', 'development', 'software',
          // General learning
          'technology', 'science', 'market', 'analysis', 'data', 'study', 'course', 'training',
          // Specific topics
          'algorithm', 'database', 'framework', 'library', 'api', 'web development', 'machine learning'
        ],
        weight: 1.0
      },
      
      // Creative patterns  
      {
        agentId: 'creative',
        patterns: [
          /^(create|generate|brainstorm|design|imagine|write|come up with|think of)/,
          /\b(ideas|creative|story|name|concept|design|inspiration|innovative|original)\b/,
          /\b(brainstorm|ideate|conceptualize|visualize|craft|compose)\b/
        ],
        keywords: ['story', 'name', 'brand', 'creative', 'ideas', 'design', 'concept'],
        weight: 1.0
      },
      
      // Automation patterns
      {
        agentId: 'automation',
        patterns: [
          /^(automate|build|code|script|program|develop|implement|integrate)/,
          /\b(automation|workflow|process|system|tool|script|bot|integration)\b/,
          /\b(automate|optimize|streamline|systematize|mechanize)\b/
        ],
        keywords: ['workflow', 'process', 'system', 'automation', 'tool', 'script', 'code'],
        weight: 1.0
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
        { pattern: /\b(i want to learn|teach me|explain|what is|how does)\b/, boost: 0.3, reason: 'learning intent' },
        { pattern: /\b(statistics|data|evidence|facts|information)\b/, boost: 0.2, reason: 'information seeking' },
        { pattern: /\b(compare|versus|vs|difference between)\b/, boost: 0.25, reason: 'comparison request' }
      ],
      'creative': [
        { pattern: /\b(name for|title for|brand|creative name)\b/, boost: 0.3, reason: 'naming request' },
        { pattern: /\b(story|novel|character|plot|writing)\b/, boost: 0.25, reason: 'creative writing' },
        { pattern: /\b(brainstorm|ideas for|suggestions for)\b/, boost: 0.3, reason: 'ideation request' }
      ],
      'automation': [
        { pattern: /\b(workflow|process|systematic|efficient|optimize)\b/, boost: 0.25, reason: 'process optimization' },
        { pattern: /\b(build|create|develop|implement|integrate)\b/, boost: 0.2, reason: 'development intent' },
        { pattern: /\b(save time|faster|efficient|streamline)\b/, boost: 0.3, reason: 'efficiency seeking' }
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