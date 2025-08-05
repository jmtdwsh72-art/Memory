import { AgentConfig, AgentMessage, AgentResponse, MemoryEntry } from '../utils/types';
import { MemoryManager } from '../utils/memory-manager';
import { getAgentConfig } from '../utils/config-utils';
import { useAgentMemoryWithPreset } from '../utils/memory-hooks';
import { ConversationalBehavior } from '../utils/conversational-behavior';
import { ContextInjector } from '../utils/context-injection';
import { getConsultingPatterns } from '../utils/consulting-patterns';
import { getKnowledgeForInput, formatKnowledgeSection } from '../utils/knowledge-loader';
import { performWebSearch, formatSearchResults, isSearchAvailable } from '../utils/web-search';
import { getReasoningLevel, ReasoningLevel } from '../utils/reasoning-depth';
import { analyzeUserFeedback, adjustReasoningLevelFromFeedback, generateFeedbackAcknowledgment, isContinuationRequest } from '../utils/feedback-analyzer';
import { sessionTracker } from '../utils/session-tracker';
import { detectClarificationNeed, generateClarifyingQuestions, createClarificationMemory } from '../utils/clarification-detector';
import { detectGoalProgress, createGoalProgressMemory, getStatusAwareGreeting, getCongratulationsMessage, getAbandonmentMessage, getProgressMessage } from '../utils/goal-tracker';
import { generateSessionSummary, detectSummaryRequest, detectSaveSummaryRequest, detectSessionEnding, shouldOfferSummary } from '../utils/result-summarizer';
import { composeFinalResponse, FinalResponseContext, assessSessionComplexity, shouldOfferMemoryStorage, createSessionDecisionMemory } from '../utils/final-response-composer';
import { generateResponsePlan, AgentContext, ResponsePlan } from '../utils/reasoning-planner';

export class CreativeAgent {
  private config: AgentConfig;
  private memoryManager: MemoryManager;
  private conversational: ConversationalBehavior;

  constructor() {
    // Load validated configuration using centralized utility
    this.config = getAgentConfig('creative');
    this.memoryManager = new MemoryManager();
    this.conversational = new ConversationalBehavior();
  }

  async processInput(input: string, userId?: string, routingMetadata?: any): Promise<AgentResponse> {
    try {
      // Use centralized memory utilities with creative preset
      const memory = useAgentMemoryWithPreset(this.config.id, 'creative', userId);
      
      // Recall relevant memories using preset configuration
      const memoryContext = await memory.recallWithPreset(input);
      const contextString = memory.buildContext(memoryContext);
      
      // Check for previous session and analyze feedback
      const sessionUserId = userId || 'anonymous';
      const lastSession = sessionTracker.getLastResponse(sessionUserId);
      let feedbackAcknowledgment = '';
      let adjustedReasoningLevel: ReasoningLevel | null = null;
      let goalProgressMessage = '';
      let statusGreeting = '';
      
      if (lastSession && lastSession.lastAgentId === this.config.id) {
        const feedback = analyzeUserFeedback(input, lastSession.lastAgentResponse, memoryContext.entries);
        
        if (feedback.feedbackMemory) {
          await memory.saveMemory(
            feedback.feedbackMemory.input || input,
            feedback.feedbackMemory.summary || '',
            feedback.feedbackMemory.summary || '',
            'pattern',
            ['feedback', feedback.type, 'user_preference']
          );
        }
        
        if (feedback.reasoningAdjustment) {
          const currentLevel = (lastSession.lastReasoningLevel as ReasoningLevel) || 'intermediate';
          adjustedReasoningLevel = adjustReasoningLevelFromFeedback(currentLevel, feedback);
          feedbackAcknowledgment = generateFeedbackAcknowledgment(feedback);
        }
        
        if (isContinuationRequest(input, lastSession.lastAgentResponse, feedback)) {
          routingMetadata = {
            ...routingMetadata,
            isContinuation: true,
            previousContext: lastSession.continuationContext
          };
        }
      }
      
      // Check for goal progress updates
      const goalProgress = detectGoalProgress(input, memoryContext.entries);
      if (goalProgress.status) {
        // Create and store goal progress memory
        const progressMemory = createGoalProgressMemory(input, goalProgress, this.config.id, userId);
        await memory.saveMemory(
          progressMemory.input || input,
          progressMemory.summary || '',
          progressMemory.context || '',
          'goal_progress',
          progressMemory.tags || []
        );
        
        // Generate appropriate progress message
        const goalSummary = progressMemory.goalSummary || 'your creative project';
        switch (goalProgress.status) {
          case 'completed':
            goalProgressMessage = getCongratulationsMessage(goalSummary);
            break;
          case 'abandoned':
            goalProgressMessage = getAbandonmentMessage(goalSummary);
            break;
          case 'in_progress':
            goalProgressMessage = getProgressMessage(goalSummary);
            break;
        }
      }
      
      // Check for status-aware greeting for returning users
      if (!goalProgressMessage && !feedbackAcknowledgment && !routingMetadata?.isContinuation) {
        const greeting = getStatusAwareGreeting(memoryContext.entries, this.config.id);
        if (greeting) {
          statusGreeting = greeting;
        }
      }
      
      // Check for session summary request
      if (detectSummaryRequest(input)) {
        const sessionSummary = generateSessionSummary(memoryContext.entries, { 
          agentId: this.config.id,
          includeMetadata: true 
        });
        
        await this.logInteraction({
          id: this.generateId(),
          timestamp: new Date(),
          agentName: this.config.id,
          input,
          output: sessionSummary,
          memoryUsed: memoryContext.entries.map(m => m.id)
        });
        
        return {
          success: true,
          message: sessionSummary,
          memoryUpdated: false,
          metadata: {
            agentId: this.config.id,
            isSummary: true,
            sessionAnalysis: true
          }
        };
      }
      
      // Check for save summary request
      if (detectSaveSummaryRequest(input)) {
        const sessionSummary = generateSessionSummary(memoryContext.entries, { 
          agentId: this.config.id,
          includeMetadata: true 
        });
        
        // Store the summary in memory
        await memory.saveMemory(
          'Session Summary Request',
          sessionSummary,
          `Creative session summary generated on ${new Date().toLocaleDateString()}`,
          'session_summary',
          ['summary', 'reflection', this.config.id, 'session_recap']
        );
        
        const confirmationMessage = `✨ **Creative Session Summary Saved!**\n\nI've captured all our creative exploration and stored it in your memory for future inspiration!\n\n${sessionSummary}`;
        
        await this.logInteraction({
          id: this.generateId(),
          timestamp: new Date(),
          agentName: this.config.id,
          input,
          output: confirmationMessage,
          memoryUsed: memoryContext.entries.map(m => m.id)
        });
        
        return {
          success: true,
          message: confirmationMessage,
          memoryUpdated: true,
          metadata: {
            agentId: this.config.id,
            isSummary: true,
            summarySaved: true
          }
        };
      }
      
      // Determine reasoning level
      const reasoningLevel: ReasoningLevel = adjustedReasoningLevel ||
        routingMetadata?.reasoningLevel || 
        getReasoningLevel(input, memoryContext.entries, 'creative');
      
      // Get consulting patterns for creative agent
      const consulting = getConsultingPatterns('creative');
      
      // Generate context injection
      const injectedContext = ContextInjector.injectMemoryAwareness({
        agentId: this.config.id,
        input,
        memoryContext,
        routingMetadata,
        userId
      });
      
      // Check if input needs clarification (unless it's a continuation or feedback response)
      if (!routingMetadata?.isContinuation && !routingMetadata?.awaitingClarification && !adjustedReasoningLevel) {
        const clarificationResult = detectClarificationNeed(input, memoryContext.entries, contextString.length > 0);
        
        if (clarificationResult.needsClarification) {
          // Store clarification request in memory
          const clarificationMemory = createClarificationMemory(input, clarificationResult, this.config.id);
          await memory.saveMemory(
            clarificationMemory.input || input,
            clarificationMemory.summary || '',
            clarificationMemory.summary || '',
            'pattern',
            ['clarification_requested', clarificationResult.reason || 'vague', 'creative']
          );
          
          // Generate creative-specific clarification response
          const response = await this.handleClarificationRequest(input, clarificationResult, memoryContext, contextString);
          
          await this.logInteraction({
            id: this.generateId(),
            timestamp: new Date(),
            agentName: this.config.id,
            input,
            output: response.message,
            memoryUsed: memoryContext.entries.map(m => m.id)
          });
          
          return {
            success: true,
            message: response.message,
            memoryUpdated: true,
            metadata: {
              agentId: this.config.id,
              awaitingClarification: true,
              clarificationReason: clarificationResult.reason,
              confidence: clarificationResult.confidence
            }
          };
        }
      }
      
      // Generate dynamic response plan
      const agentContext: AgentContext = {
        agentId: this.config.id,
        userId,
        memoryEntries: memoryContext.entries,
        lastResponse: lastSession?.lastAgentResponse,
        routingMetadata
      };
      
      const responsePlan = generateResponsePlan(input, agentContext);
      
      // Use adjusted reasoning level if available, otherwise use plan's level
      const finalReasoningLevel: ReasoningLevel = adjustedReasoningLevel || responsePlan.reasoningLevel;
      
      // Build dynamic creative response based on plan
      const response = await this.buildPlannedCreativeResponse(input, responsePlan, {
        consulting,
        injectedContext,
        memoryContext,
        contextString,
        routingMetadata,
        reasoningLevel: finalReasoningLevel,
        feedbackAcknowledgment,
        goalProgressMessage,
        statusGreeting
      });
      
      // Store session data for feedback tracking
      sessionTracker.setLastResponse(
        sessionUserId,
        this.config.id,
        response,
        finalReasoningLevel,
        { taskType: responsePlan.intent, confidence: responsePlan.confidence }
      );
      
      // Store interaction using centralized utility with goal tracking
      const goalTag = `${responsePlan.intent}_${responsePlan.domain.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).slice(0, 3).join('_').toLowerCase()}`;
      
      // Save as goal type with appropriate tags
      await memory.saveMemory(
        input, 
        response, 
        `creative_goal: ${goalTag} | reasoning: ${finalReasoningLevel}`,
        'goal',
        ['creative', responsePlan.intent, responsePlan.domain.toLowerCase(), 'creative_goal', `reasoning_${finalReasoningLevel}`]
      );

      await this.logInteraction({
        id: this.generateId(),
        timestamp: new Date(),
        agentName: this.config.id,
        input,
        output: response,
        memoryUsed: memoryContext.entries.map(m => m.id)
      });

      // Compose final response with thoughtful closing
      const recentGoal = await this.getRecentGoal(memoryContext.entries);
      const isSessionEnding = detectSessionEnding(input);
      const shouldOfferSummaryFlag = shouldOfferSummary(memoryContext.entries);
      
      const finalResponseContext: FinalResponseContext = {
        recentGoal,
        reasoningLevel: finalReasoningLevel,
        feedbackType: null, // TODO: Implement feedback analysis for creative agent
        isSessionEnd: isSessionEnding,
        agentPersonality: 'creative',
        knowledgeDomain: responsePlan.domain,
        userInput: input,
        hasMemoryContext: memoryContext.entries.length > 0,
        sessionComplexity: assessSessionComplexity({
          recentGoal,
          reasoningLevel: finalReasoningLevel,
          feedbackType: null, // TODO: Implement feedback analysis for creative agent
          isSessionEnd: isSessionEnding,
          agentPersonality: 'creative',
          knowledgeDomain: responsePlan.domain,
          userInput: input,
          hasMemoryContext: memoryContext.entries.length > 0
        })
      };

      const finalClosing = composeFinalResponse('creative', finalResponseContext, {
        includeFollowUp: !isSessionEnding,
        includeMemoryOffer: shouldOfferMemoryStorage(finalResponseContext) || shouldOfferSummaryFlag
      });

      const finalResponse = response + (finalClosing ? '\n\n---\n\n' + finalClosing : '');

      return {
        success: true,
        message: finalResponse,
        memoryUpdated: true,
        metadata: {
          agentId: this.config.id,
          confidence: responsePlan.confidence,
          hasMemoryContext: memoryContext.entries.length > 0,
          intentType: responsePlan.intent,
          reasoningLevel: responsePlan.reasoningLevel,
          domain: responsePlan.domain,
          responseStrategy: responsePlan.responseStrategy,
          toolsUsed: responsePlan.tools,
          dynamicallyPlanned: true,
          summaryOffered: shouldOfferSummaryFlag && (isSessionEnding || Math.random() < 0.3)
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Creative agent error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }


  private async generateResponse(input: string, memoryContext: string): Promise<string> {
    const taskType = this.identifyTaskType(input);
    let response = '';

    switch (taskType) {
      case 'naming':
        response = this.generateNamingResponse(input);
        break;
      case 'story':
        response = this.generateStoryResponse(input);
        break;
      case 'brainstorm':
      default:
        response = this.generateBrainstormResponse(input);
        break;
    }

    // Add memory context if available
    if (memoryContext && memoryContext.trim()) {
      response += `\n\n${memoryContext}`;
    }

    // Remove hardcoded memory message since context injection handles this
    
    return response;
  }

  private async buildPlannedCreativeResponse(input: string, plan: ResponsePlan, options: {
    consulting: any;
    injectedContext: any;
    memoryContext: any;
    contextString: string;
    routingMetadata?: any;
    reasoningLevel: ReasoningLevel;
    feedbackAcknowledgment?: string;
    goalProgressMessage?: string;
    statusGreeting?: string;
  }): Promise<string> {
    // Execute plan steps dynamically for creative responses
    return await this.executeCreativePlanSteps(input, plan, options);
  }

  private async executeCreativePlanSteps(input: string, plan: ResponsePlan, options: {
    consulting: any;
    injectedContext: any;
    memoryContext: any;
    contextString: string;
    routingMetadata?: any;
    reasoningLevel: ReasoningLevel;
    feedbackAcknowledgment?: string;
    goalProgressMessage?: string;
    statusGreeting?: string;
  }): Promise<string> {
    const { consulting, injectedContext, memoryContext, contextString, routingMetadata, reasoningLevel, feedbackAcknowledgment, goalProgressMessage, statusGreeting } = options;
    const sections: string[] = [];

    // Execute each step in the plan with creative flair
    for (const step of plan.planSteps) {
      switch (step) {
        case 'Acknowledge feedback':
          if (feedbackAcknowledgment) {
            sections.push(feedbackAcknowledgment);
            sections.push('');
          }
          break;

        case 'Address goal progress':
          if (goalProgressMessage) {
            sections.push(goalProgressMessage);
            sections.push('');
          }
          break;

        case 'Ask clarifying questions':
          if (plan.tools.askClarifyingQuestions) {
            const questions = consulting.getClarifyingQuestions(input, reasoningLevel);
            if (questions.length > 0) {
              const questionHeader = this.getCreativeQuestionHeader(reasoningLevel);
              sections.push(`## 💭 Creative Direction\n\n${questionHeader}\n\n${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`);
            }
          }
          break;

        case 'Reference relevant memory':
        case 'Integrate memory context':
        case 'Build on previous context':
        case 'Connect to previous work':
          if (plan.tools.useMemory && memoryContext.entries.length > 0 && contextString.trim()) {
            const memoryInsights = this.formatCreativeInsights(memoryContext.entries.slice(0, 2));
            if (memoryInsights && memoryInsights.trim().length > 0) {
              sections.push(`## 💡 Previous Creative Inspiration\n\n${memoryInsights}`);
            }
          }
          break;

        case 'Provide initial guidance':
        case 'Provide direct response':
          sections.push(await this.generateCreativeDirectResponse(input, plan, contextString));
          break;

        case 'Establish framework':
        case 'Provide structured analysis':
          sections.push(await this.generateCreativeFramework(input, plan, consulting, reasoningLevel));
          break;

        case 'Apply domain knowledge':
        case 'Inject domain expertise':
        case 'Provide expert insights':
          if (plan.tools.useKnowledge) {
            const knowledgeSection = await this.generateCreativeKnowledgeSection(input);
            if (knowledgeSection) {
              sections.push(knowledgeSection);
            }
          }
          break;

        case 'Enhance with search results':
        case 'Supplement with current data':
          if (plan.tools.useSearch) {
            const searchSection = await this.generateCreativeSearchSection(input);
            if (searchSection) {
              sections.push(searchSection);
            }
          }
          break;

        case 'Suggest next steps':
          const nextSteps = consulting.getSuggestedNextSteps(input, reasoningLevel);
          if (nextSteps.length > 0) {
            sections.push(`## 🚀 Creative Next Steps\n\n${nextSteps.map((step: string, i: number) => `${i + 1}. **${step}**`).join('\n')}`);
          }
          break;

        case 'Guide exploration':
        case 'Encourage iteration':
          sections.push(this.generateCreativeExplorationGuidance(input, plan));
          break;

        case 'Clarify direction':
          if (plan.confidence < 0.7) {
            sections.push(this.generateCreativeDirectionClarification(input, plan));
          }
          break;
      }
    }

    // Add contextual creative introduction if not suppressed
    const suppressIntro = routingMetadata?.suppressIntro || routingMetadata?.stayInThread || routingMetadata?.isContinuation;
    if (!suppressIntro && sections.length > 0) {
      const intro = this.generateCreativeIntroduction(plan, injectedContext, routingMetadata);
      sections.unshift(intro);
    }

    // Add status greeting if available
    if (statusGreeting && !routingMetadata?.isContinuation) {
      sections.unshift(statusGreeting, '');
    }

    // Add inspirational creative closing
    const closingOptions = reasoningLevel === 'basic' ? [
      "What sounds fun to you? Let's create something!",
      "Which idea do you like best? I can help make it happen.",
      "Ready to start creating? Pick what excites you!"
    ] : reasoningLevel === 'advanced' ? [
      "Which conceptual framework resonates with your artistic vision?",
      "I can explore the theoretical underpinnings or dive into experimental approaches.",
      "Ready to challenge conventions and create something paradigm-shifting?"
    ] : [
      "What direction feels most exciting to you? I'm ready to explore any creative rabbit hole!",
      "Which of these creative avenues is calling to you? Let's make something amazing together.",
      "I'm energized by these possibilities! What creative challenge should we tackle first?"
    ];
    const closing = closingOptions[Math.floor(Math.random() * closingOptions.length)];
    sections.push(`---\n\n🎯 ${closing}`);

    return sections.join('\n\n');
  }

  private getCreativeQuestionHeader(reasoningLevel: ReasoningLevel): string {
    switch (reasoningLevel) {
      case 'basic':
        return "To spark the best ideas, I'd love to know:";
      case 'advanced':
        return "To craft sophisticated creative solutions, please clarify:";
      default:
        return "To channel the most inspiring creativity, help me understand:";
    }
  }

  private generateCreativeIntroduction(plan: ResponsePlan, injectedContext: any, routingMetadata?: any): string {
    if (routingMetadata?.isContinuation) {
      return '✨ **Continuing our creative journey**...';
    }
    
    if (injectedContext.personalizedIntro) {
      return `✨ **Creative Exploration**: ${injectedContext.personalizedIntro}`;
    }
    
    // Dynamic intro based on plan
    switch (plan.responseStrategy) {
      case 'clarification_first':
        return '✨ **Creative Exploration**: I need to understand your creative vision to spark the best ideas!';
      case 'structured_framework':
        return '✨ **Creative Exploration**: Let\'s build a systematic approach to unlock your creativity.';
      case 'guided_discovery':
        return '✨ **Creative Exploration**: Let\'s embark on a creative journey of discovery together!';
      default:
        return '✨ **Creative Exploration**: Let\'s unleash some innovative ideas together!';
    }
  }

  private async generateCreativeDirectResponse(input: string, plan: ResponsePlan, contextString: string): Promise<string> {
    const response = await this.generateResponse(input, contextString);
    return `## 🎨 Creative Concepts\n\n${response}`;
  }

  private async generateCreativeFramework(input: string, plan: ResponsePlan, consulting: any, reasoningLevel: ReasoningLevel): Promise<string> {
    const framework = consulting.getStructuredFramework(input, reasoningLevel);
    return framework;
  }

  private async generateCreativeKnowledgeSection(input: string): Promise<string | null> {
    const knowledgeModules = await getKnowledgeForInput(input);
    if (knowledgeModules.length > 0) {
      return formatKnowledgeSection(knowledgeModules);
    }
    return null;
  }

  private async generateCreativeSearchSection(input: string): Promise<string | null> {
    try {
      const searchAvailable = await isSearchAvailable();
      if (searchAvailable) {
        const searchResponse = await performWebSearch(input, 'creative');
        if (searchResponse && searchResponse.results.length > 0) {
          return formatSearchResults(searchResponse);
        }
      }
    } catch (error) {
      console.warn('Web search failed for creative agent:', error);
    }
    return null;
  }

  private generateCreativeExplorationGuidance(input: string, plan: ResponsePlan): string {
    return `## 🌟 Creative Exploration\n\nYour ${plan.domain} creative goal opens up exciting possibilities! The ${plan.intent} approach suggests we should explore innovative angles and push creative boundaries.`;
  }

  private generateCreativeDirectionClarification(input: string, plan: ResponsePlan): string {
    return `## 🎯 Creative Direction\n\nTo unleash the most inspiring creativity for your ${plan.domain} project, could you help me understand the specific creative direction or style you're envisioning?`;
  }

  private formatCreativeInsights(entries: any[]): string {
    if (!entries || entries.length === 0) return '';
    
    return entries.map(entry => {
      const cleanSummary = entry.summary
        .replace(/^(creative_goal:|ROUTING_HANDOFF:|Agent:)/i, '')
        .trim();
      return `• ${cleanSummary}`;
    }).join('\n');
  }

  private calculateTaskConfidence(input: string, taskType: string): number {
    let confidence = 0.4; // Base confidence
    
    const lowerInput = input.toLowerCase();
    
    // Increase confidence for specific task indicators
    if (taskType === 'naming' && (lowerInput.includes('company') || lowerInput.includes('product') || lowerInput.includes('brand'))) {
      confidence += 0.3;
    }
    
    if (taskType === 'story' && (lowerInput.includes('about') || lowerInput.includes('character') || lowerInput.includes('genre'))) {
      confidence += 0.3;
    }
    
    // Check for context indicators
    if (lowerInput.includes('for') || lowerInput.includes('about') || lowerInput.includes('that')) {
      confidence += 0.2;
    }
    
    // Short inputs have lower confidence
    if (input.split(' ').length < 5) {
      confidence -= 0.2;
    }
    
    return Math.min(Math.max(confidence, 0), 1.0);
  }

  private identifyTaskType(input: string): 'brainstorm' | 'naming' | 'story' {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('name') || lowerInput.includes('call') || lowerInput.includes('title')) {
      return 'naming';
    }
    if (lowerInput.includes('story') || lowerInput.includes('write') || lowerInput.includes('character') || lowerInput.includes('plot')) {
      return 'story';
    }
    return 'brainstorm';
  }

  private generateBrainstormResponse(input: string): string {
    const subject = this.extractSubject(input);
    const context = this.analyzeCreativeContext(input);
    
    return `🌟 Let's brainstorm some creative ideas for ${subject}!

💡 **Fresh Perspectives:**
${this.generateFreshPerspectives(subject, context)}

🎨 **Concrete Ideas:**
${this.generateConcreteIdeas(subject, context)}

🚀 **Implementation Ready:**
${this.generateImplementationIdeas(subject, context)}

✨ **Wild Card Options:**
${this.generateWildCardIdeas(subject, context)}

🎯 **My Top Recommendation:**
${this.generateTopRecommendation(subject, context)}

**Ready to develop any of these further?** I can help you flesh out the details, create variations, or brainstorm implementation strategies for whichever direction excites you most!`;
  }

  private generateNamingResponse(input: string): string {
    const subject = this.extractSubject(input);
    const namingContext = this.analyzeNamingContext(input);
    
    return `🎯 Perfect! Let me help you name ${subject}:

📝 **Tailored Name Ideas:**
${this.generateTailoredNames(subject, namingContext)}

🔤 **Creative Variations:**
${this.generateNameVariations(subject, namingContext)}

⭐ **My Top Pick:**
${this.generateTopNamePick(subject, namingContext)}

💡 **Branding Considerations:**
${this.generateBrandingAdvice(subject, namingContext)}

🔍 **Before You Decide:**
${this.generateNamingChecklist(subject)}

Want me to generate more options in any particular style, or shall we dive deeper into developing the branding around your favorite name?`;
  }

  private generateStoryResponse(input: string): string {
    const subject = this.extractSubject(input);
    const storyContext = this.analyzeStoryContext(input);
    
    return `📖 Exciting! Let me craft some story ideas around ${subject}:

**🌱 Story Concepts:**
${this.generateStoryConcepts(subject, storyContext)}

**🎭 Character Ideas:**
${this.generateCharacterIdeas(subject, storyContext)}

**🌍 Setting Options:**
${this.generateSettingOptions(subject, storyContext)}

**🔥 Conflict & Stakes:**
${this.generateConflictIdeas(subject, storyContext)}

**✨ Unique Hooks:**
${this.generateUniqueHooks(subject, storyContext)}

**📝 Writing Prompts:**
${this.generateWritingPrompts(subject, storyContext)}

Which direction sparks your imagination? I can help you develop any of these into a full story outline or create character profiles to get you started!`;
  }

  private extractSubject(input: string): string {
    // Enhanced extraction logic for various creative contexts
    const patterns = [
      /name\s+for\s+(?:a\s+|an\s+|the\s+|my\s+)?(.+)/i,
      /call\s+(?:it\s+|the\s+|this\s+|my\s+)?(.+)/i,
      /title\s+for\s+(?:a\s+|an\s+|the\s+|my\s+)?(.+)/i,
      /ideas?\s+for\s+(?:a\s+|an\s+|the\s+|my\s+)?(.+)/i,
      /brainstorm\s+(?:about\s+|for\s+|around\s+)?(.+)/i,
      /create\s+(?:a\s+|an\s+|some\s+)?(.+)/i,
      /story\s+about\s+(.+)/i,
      /write\s+(?:a\s+|an\s+|some\s+)?(.+)/i
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: extract meaningful words
    const words = input.replace(/^(brainstorm|create|generate|come up with|think of|ideas?|name|story)/i, '').trim();
    return words || 'your creative project';
  }

  // Context analysis methods
  private analyzeCreativeContext(input: string): any {
    const lowerInput = input.toLowerCase();
    return {
      type: this.determineCreativeType(lowerInput),
      industry: this.inferIndustry(lowerInput),
      tone: this.inferTone(lowerInput),
      target: this.inferTarget(lowerInput)
    };
  }

  private analyzeNamingContext(input: string): any {
    const lowerInput = input.toLowerCase();
    return {
      type: this.determineNamingType(lowerInput),
      industry: this.inferIndustry(lowerInput),
      style: this.inferNamingStyle(lowerInput)
    };
  }

  private analyzeStoryContext(input: string): any {
    const lowerInput = input.toLowerCase();
    return {
      genre: this.inferGenre(lowerInput),
      length: this.inferLength(lowerInput),
      audience: this.inferAudience(lowerInput)
    };
  }

  // Content generation methods
  private generateFreshPerspectives(subject: string, context: any): string {
    const perspectives = [
      `**Flip the Script**: What if ${subject} worked in reverse?`,
      `**Cross-Industry**: How would the gaming industry approach ${subject}?`,
      `**Future Vision**: Imagine ${subject} in 2030 with AI integration`,
      `**Simplicity Focus**: Strip ${subject} down to its absolute essence`
    ];
    return perspectives.join('\n');
  }

  private generateConcreteIdeas(subject: string, context: any): string {
    if (subject.toLowerCase().includes('app')) {
      return `1. **Social Integration**: Connect users with similar interests/goals
2. **Gamification Layer**: Progress tracking with rewards and achievements  
3. **AI Assistant**: Smart recommendations based on user behavior
4. **Community Features**: User-generated content and peer support`;
    }
    
    return `1. **User-Centric Approach**: Focus on solving real user pain points
2. **Modular Design**: Build components that work independently
3. **Feedback Loop**: Built-in system for continuous improvement
4. **Accessibility First**: Design for all users from the start`;
  }

  private generateImplementationIdeas(subject: string, context: any): string {
    return `1. **MVP Strategy**: Start with core feature and iterate
2. **Partner Integration**: Leverage existing platforms and APIs
3. **Content Strategy**: Plan for user onboarding and engagement
4. **Scalable Architecture**: Design for growth from day one`;
  }

  private generateWildCardIdeas(subject: string, context: any): string {
    return `1. **AR/VR Integration**: Immersive experience possibilities
2. **Blockchain Elements**: Decentralized features or NFT integration
3. **Voice Interface**: Hands-free interaction capabilities
4. **IoT Connection**: Smart device integration opportunities`;
  }

  private generateTopRecommendation(subject: string, context: any): string {
    return `I'd recommend focusing on the **User-Centric Approach** because:
• It ensures you're solving real problems, not imaginary ones
• It creates a strong foundation for product-market fit
• It guides all other design decisions naturally
• It's the most sustainable path to long-term success

Want me to help you map out the user journey and identify key pain points?`;
  }

  // Naming-specific methods
  private generateTailoredNames(subject: string, context: any): string {
    const subjectLower = subject.toLowerCase();
    
    if (subjectLower.includes('app')) {
      return `1. **FlowSpace** - Suggests smooth user experience
2. **ConnectCore** - Emphasizes connection and essential function
3. **PulseHub** - Implies activity and central gathering
4. **StreamLine** - Clean, efficient process
5. **Nexus** - Connection point for users`;
    }
    
    if (subjectLower.includes('business') || subjectLower.includes('company')) {
      return `1. **Catalyst Ventures** - Suggests transformation and growth
2. **Meridian Solutions** - Implies guidance and direction
3. **Apex Dynamics** - Peak performance and movement
4. **Compass Strategies** - Navigation and strategic direction
5. **Momentum Partners** - Forward movement and collaboration`;
    }
    
    return `1. **[Subject]Core** - Emphasizes the essential nature
2. **[Subject]Flow** - Suggests smooth, efficient operation
3. **[Subject]Hub** - Central gathering or connection point
4. **[Subject]Spark** - Innovation and energy
5. **[Subject]Nexus** - Connection and convergence`;
  }

  private generateNameVariations(subject: string, context: any): string {
    return `• **Portmanteau**: Blend two relevant words
• **Metaphorical**: Use nature, space, or journey imagery
• **Action-Based**: Verbs that describe what you do
• **Invented Words**: Create something entirely new
• **Acronyms**: Meaningful abbreviations with good pronunciation`;
  }

  private generateTopNamePick(subject: string, context: any): string {
    return `**FlowSpace** - Here's why it works:
• Easy to remember and pronounce
• Suggests both movement and environment
• Works across different contexts
• Has positive connotations
• Available domains likely exist (.com, .app)
• Scalable for future product expansion`;
  }

  private generateBrandingAdvice(subject: string, context: any): string {
    return `• **Domain Check**: Verify .com availability before deciding
• **Social Media**: Check Instagram, Twitter, TikTok handles
• **Trademark Search**: Basic USPTO search for conflicts
• **International Considerations**: How does it sound in other languages?
• **Visual Identity**: How will it look in logos and graphics?`;
  }

  private generateNamingChecklist(subject: string): string {
    return `□ Easy to spell and pronounce
□ Memorable after hearing once
□ Available domain name (.com preferred)
□ No negative connotations
□ Works in your target markets
□ Scales with business growth
□ Differentiates from competitors`;
  }

  // Story-specific methods
  private generateStoryConcepts(subject: string, context: any): string {
    const genre = context.genre || 'general';
    
    if (genre.includes('sci-fi') || subject.toLowerCase().includes('future')) {
      return `1. **The Last Creative**: In an AI-dominated world, human creativity becomes rare
2. **Memory Merchants**: People who sell their experiences as entertainment
3. **The Glitch**: Reality simulation starts showing cracks
4. **Quantum Twins**: Parallel universe versions start bleeding through`;
    }
    
    return `1. **The Unlikely Mentor**: Experienced guide meets eager newcomer
2. **Hidden World**: Ordinary person discovers extraordinary reality
3. **The Choice**: Character must decide between two life paths
4. **Second Chances**: Opportunity to redo a crucial moment`;
  }

  private generateCharacterIdeas(subject: string, context: any): string {
    return `• **The Dreamer**: Visionary with big ideas but needs grounding
• **The Skeptic**: Practical person who questions everything  
• **The Catalyst**: Character who drives change in others
• **The Guardian**: Protector of important knowledge/secrets
• **The Outsider**: Fresh perspective from different background`;
  }

  private generateSettingOptions(subject: string, context: any): string {
    return `• **Contemporary**: Modern day with familiar elements
• **Near Future**: 10-20 years ahead with believable tech
• **Alternate History**: Our world but one key thing changed
• **Hidden Society**: Secret world within our ordinary one
• **Liminal Space**: Between worlds, times, or realities`;
  }

  private generateConflictIdeas(subject: string, context: any): string {
    return `• **Internal Struggle**: Character vs their own fears/doubts
• **Relationship Tension**: Conflicting needs between characters
• **System Challenge**: Individual vs institution/society
• **Resource Scarcity**: Competition for limited valuable thing
• **Time Pressure**: Important deadline creates urgency`;
  }

  private generateUniqueHooks(subject: string, context: any): string {
    return `• **Inverted Expectations**: The "villain" is actually trying to help
• **Dual Timeline**: Past and present stories mirror each other
• **Unreliable Reality**: What seems real might not be
• **Role Reversal**: Characters swap positions/perspectives
• **Hidden Connection**: Seemingly unrelated events are linked`;
  }

  private generateWritingPrompts(subject: string, context: any): string {
    return `1. "The day I discovered that everyone else could hear thoughts, and I was the only one who couldn't..."
2. "The antique shop owner handed me the key and said, 'This opens any door, but only once.'"
3. "My reflection started moving independently three days ago, and today it waved at me."
4. "The job posting was simple: 'Night shift. No questions asked. Bring your own flashlight.'"
5. "Every morning I wake up knowing something I didn't know yesterday, but I can't remember learning it."`;
  }

  // Helper methods for context analysis
  private determineCreativeType(input: string): string {
    if (input.includes('product') || input.includes('app')) return 'product';
    if (input.includes('business') || input.includes('startup')) return 'business';
    if (input.includes('content') || input.includes('marketing')) return 'content';
    if (input.includes('event') || input.includes('campaign')) return 'event';
    return 'general';
  }

  private determineNamingType(input: string): string {
    if (input.includes('company') || input.includes('business')) return 'business';
    if (input.includes('product') || input.includes('app')) return 'product';
    if (input.includes('brand') || input.includes('logo')) return 'brand';
    if (input.includes('project') || input.includes('initiative')) return 'project';
    return 'general';
  }

  private inferIndustry(input: string): string {
    if (input.includes('tech') || input.includes('software') || input.includes('app')) return 'technology';
    if (input.includes('health') || input.includes('medical') || input.includes('wellness')) return 'healthcare';
    if (input.includes('education') || input.includes('learning') || input.includes('school')) return 'education';
    if (input.includes('finance') || input.includes('money') || input.includes('banking')) return 'finance';
    return 'general';
  }

  private inferTone(input: string): string {
    if (input.includes('professional') || input.includes('corporate')) return 'professional';
    if (input.includes('fun') || input.includes('playful') || input.includes('game')) return 'playful';
    if (input.includes('serious') || input.includes('formal')) return 'serious';
    if (input.includes('casual') || input.includes('friendly')) return 'casual';
    return 'balanced';
  }

  private inferTarget(input: string): string {
    if (input.includes('young') || input.includes('teen') || input.includes('student')) return 'youth';
    if (input.includes('professional') || input.includes('business')) return 'professionals';
    if (input.includes('family') || input.includes('parent')) return 'families';
    if (input.includes('senior') || input.includes('elderly')) return 'seniors';
    return 'general';
  }

  private inferNamingStyle(input: string): string {
    if (input.includes('modern') || input.includes('sleek')) return 'modern';
    if (input.includes('classic') || input.includes('traditional')) return 'classic';
    if (input.includes('creative') || input.includes('unique')) return 'creative';
    if (input.includes('simple') || input.includes('clean')) return 'simple';
    return 'balanced';
  }

  private inferGenre(input: string): string {
    if (input.includes('sci-fi') || input.includes('science fiction') || input.includes('future')) return 'sci-fi';
    if (input.includes('fantasy') || input.includes('magic') || input.includes('dragon')) return 'fantasy';
    if (input.includes('mystery') || input.includes('detective') || input.includes('crime')) return 'mystery';
    if (input.includes('romance') || input.includes('love')) return 'romance';
    if (input.includes('horror') || input.includes('scary') || input.includes('thriller')) return 'horror';
    return 'general';
  }

  private inferLength(input: string): string {
    if (input.includes('short') || input.includes('flash')) return 'short';
    if (input.includes('novel') || input.includes('book')) return 'novel';
    if (input.includes('screenplay') || input.includes('script')) return 'screenplay';
    return 'medium';
  }

  private inferAudience(input: string): string {
    if (input.includes('children') || input.includes('kids')) return 'children';
    if (input.includes('young adult') || input.includes('ya')) return 'young-adult';
    if (input.includes('adult') || input.includes('mature')) return 'adult';
    return 'general';
  }

  private extractGoalTag(input: string, taskType: string): string {
    // Extract subject for goal tracking
    const subject = this.extractSubject(input);
    const cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).slice(0, 3).join('_').toLowerCase();
    return cleanSubject || taskType;
  }

  private async handleClarificationRequest(
    input: string,
    clarificationResult: any,
    memoryContext: any,
    contextString: string
  ): Promise<{ message: string }> {
    const questions = generateClarifyingQuestions(clarificationResult, 'creative', input);
    
    // Create creative-focused clarification message
    let clarificationMessage = '✨ **Creative Agent**: I\'m excited to help bring your creative vision to life! But I need some more details to spark the perfect ideas.\n\n';
    
    // Add reason-specific context for creative work
    switch (clarificationResult.reason) {
      case 'vague_input':
        clarificationMessage += 'Your creative request has endless possibilities - could you help me focus on the specific type of creative work you envision?\n\n';
        break;
      case 'missing_subject':
        clarificationMessage += 'I\'m ready to get creative, but I\'m not sure what project or concept you\'d like me to focus on.\n\n';
        break;
      case 'underspecified_goal':
        clarificationMessage += 'I can see you want something creative, but I\'m not clear on the style, format, or outcome you have in mind.\n\n';
        break;
      case 'ambiguous_context':
        clarificationMessage += 'I need more creative direction to understand what would inspire you most.\n\n';
        break;
    }
    
    // Add creative-specific clarifying questions
    if (questions.length > 0) {
      clarificationMessage += 'To create something amazing, could you tell me:\n\n';
      questions.forEach((question, index) => {
        clarificationMessage += `• ${question}\n`;
      });
      clarificationMessage += '\n';
    }
    
    // Add memory context if available
    if (contextString && contextString.trim()) {
      clarificationMessage += '🎨 **Based on our creative journey**, I can build on the ideas we\'ve already explored. Feel free to reference previous concepts or take our creativity in a new direction!\n\n';
    }
    
    clarificationMessage += 'Once I understand your creative vision, I can brainstorm innovative ideas, craft compelling content, and help make your imagination a reality!';
    
    return {
      message: clarificationMessage
    };
  }

  private async logInteraction(message: AgentMessage): Promise<void> {
    await this.memoryManager.logMessage(message);
  }

  private generateId(): string {
    return `creative_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  // Helper methods for Final Response Composer integration
  private async getRecentGoal(memoryEntries: MemoryEntry[]): Promise<string | undefined> {
    const goalEntries = memoryEntries
      .filter(entry => entry.type === 'goal' || entry.type === 'goal_progress')
      .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
    
    return goalEntries.length > 0 ? goalEntries[0].goalSummary || goalEntries[0].summary : undefined;
  }

  private extractKnowledgeDomain(input: string): string | undefined {
    const lowerInput = input.toLowerCase();
    
    // Creative domain detection
    if (lowerInput.includes('story') || lowerInput.includes('narrative') || lowerInput.includes('writing')) {
      return 'storytelling';
    }
    if (lowerInput.includes('design') || lowerInput.includes('visual') || lowerInput.includes('art')) {
      return 'design';
    }
    if (lowerInput.includes('brand') || lowerInput.includes('naming') || lowerInput.includes('identity')) {
      return 'branding';
    }
    if (lowerInput.includes('content') || lowerInput.includes('copy') || lowerInput.includes('marketing')) {
      return 'content creation';
    }
    if (lowerInput.includes('idea') || lowerInput.includes('brainstorm') || lowerInput.includes('concept')) {
      return 'ideation';
    }
    
    return undefined;
  }
}