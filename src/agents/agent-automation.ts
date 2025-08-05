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

export class AutomationAgent {
  private config: AgentConfig;
  private memoryManager: MemoryManager;
  private conversational: ConversationalBehavior;

  constructor() {
    // Load validated configuration using centralized utility
    this.config = getAgentConfig('automation');
    this.memoryManager = new MemoryManager();
    this.conversational = new ConversationalBehavior();
  }

  async processInput(input: string, userId?: string, routingMetadata?: any): Promise<AgentResponse> {
    try {
      // Use centralized memory utilities with automation preset
      const memory = useAgentMemoryWithPreset(this.config.id, 'automation', userId);
      
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
        const goalSummary = progressMemory.goalSummary || 'your automation project';
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
          `Automation session summary generated on ${new Date().toLocaleDateString()}`,
          'session_summary',
          ['summary', 'reflection', this.config.id, 'session_recap']
        );
        
        const confirmationMessage = `⚙️ **Process Optimization Summary Saved!**\n\nI've documented all our workflow improvements and automation strategies in your memory for future reference!\n\n${sessionSummary}`;
        
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
        getReasoningLevel(input, memoryContext.entries, 'automation');
      
      // Get consulting patterns for automation agent
      const consulting = getConsultingPatterns('automation');
      
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
            ['clarification_requested', clarificationResult.reason || 'vague', 'automation']
          );
          
          // Generate automation-specific clarification response
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
      
      // Build dynamic automation response based on plan
      const response = await this.buildPlannedAutomationResponse(input, responsePlan, {
        consulting,
        injectedContext,
        memoryContext,
        contextString,
        routingMetadata,
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
        `automation_goal: ${goalTag} | reasoning: ${finalReasoningLevel}`,
        'goal',
        ['automation', responsePlan.intent, responsePlan.domain.toLowerCase(), 'automation_goal', `reasoning_${finalReasoningLevel}`]
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
        feedbackType: null, // TODO: Implement feedback analysis for automation agent
        isSessionEnd: isSessionEnding,
        agentPersonality: 'automation',
        knowledgeDomain: responsePlan.domain,
        userInput: input,
        hasMemoryContext: memoryContext.entries.length > 0,
        sessionComplexity: assessSessionComplexity({
          recentGoal,
          reasoningLevel: finalReasoningLevel,
          feedbackType: null, // TODO: Implement feedback analysis for automation agent
          isSessionEnd: isSessionEnding,
          agentPersonality: 'automation',
          knowledgeDomain: responsePlan.domain,
          userInput: input,
          hasMemoryContext: memoryContext.entries.length > 0
        })
      };

      const finalClosing = composeFinalResponse('automation', finalResponseContext, {
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
        message: `Automation agent error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }


  private async generateResponse(input: string, memoryContext: string): Promise<string> {
    const taskType = this.identifyTaskType(input);
    const baseResponse = this.generateTaskResponse(input, taskType);
    
    let response = baseResponse;

    // Add memory context if available
    if (memoryContext && memoryContext.trim()) {
      response += `\n\n${memoryContext}`;
    }

    response += '\n\n💾 This automation solution has been saved to my memory for future reference and iteration.';
    
    return response;
  }

  private async buildPlannedAutomationResponse(input: string, plan: ResponsePlan, options: {
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
    // Execute plan steps dynamically for automation responses
    return await this.executeAutomationPlanSteps(input, plan, options);
    if (feedbackAcknowledgment) {
      sections.push(feedbackAcknowledgment);
      sections.push(''); // Add spacing
    }
    
    // 2. Goal progress message (if any)
    if (goalProgressMessage) {
      sections.push(goalProgressMessage);
      sections.push(''); // Add spacing
    }
    
    // 3. Status-aware greeting (if any)
    if (statusGreeting) {
      sections.push(statusGreeting);
      sections.push(''); // Add spacing
    }
    
    // 4. Process-Focused Introduction (Automation Agent Voice)
    const suppressIntro = routingMetadata?.suppressIntro || routingMetadata?.stayInThread || routingMetadata?.isContinuation;
    if (!suppressIntro) {
      if (injectedContext.personalizedIntro) {
        sections.push(`⚙️ **Process Optimization**: ${injectedContext.personalizedIntro}`);
      } else {
        sections.push(`⚙️ **Process Optimization**: Let's streamline this workflow and make your processes more efficient.`);
      }
    } else if (routingMetadata?.isContinuation) {
      sections.push(`⚙️ **Continuing process optimization**...`);
    }

    // Add memory context if relevant
    if (injectedContext.memoryAwareness) {
      sections.push(injectedContext.memoryAwareness);
    }

    // 2. Process Clarification (for medium confidence)
    if (confidence >= 0.3 && confidence < 0.7) {
      const questions = consulting.getClarifyingQuestions(input, reasoningLevel);
      if (questions.length > 0) {
        const questionHeader = reasoningLevel === 'basic' ?
          "To help automate this, I need to know:" :
          reasoningLevel === 'advanced' ?
          "To engineer optimal automation, please specify:" :
          "To design the most effective automation, I need to understand:";
        sections.push(`## 🔍 Process Analysis\n\n${questionHeader}\n\n${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`);
      }
    }

    // 3. Automation Framework
    const framework = consulting.getStructuredFramework(input, reasoningLevel);
    sections.push(framework);

    // 4. Core Automation Response (if high confidence)
    if (confidence >= 0.7) {
      const coreResponse = await this.generateResponse(input, contextString);
      // Clean up the response
      const cleanResponse = coreResponse
        .replace(/\n\n💾 This automation solution has been saved to my memory for future reference and iteration\./g, '')
        .split('\n\n📚')[0]; // Remove memory section if present
      sections.push(`## 🛠️ Automation Solution\n\n${cleanResponse}`);
    }

    // 5. Process Memory (if available)
    if (memoryContext.entries.length > 0 && contextString.trim()) {
      const memoryInsights = this.formatProcessInsights(memoryContext.entries.slice(0, 2));
      if (memoryInsights) {
        sections.push(`## 📋 Related Process History\n\n${memoryInsights}`);
      }
    }

    // 6. Domain Knowledge Enhancement
    const knowledgeModules = await getKnowledgeForInput(input);
    if (knowledgeModules.length > 0) {
      const knowledgeSection = formatKnowledgeSection(knowledgeModules, reasoningLevel);
      if (knowledgeSection) {
        sections.push(knowledgeSection);
      }
    }

    // 7. Web Search Enhancement (when appropriate)
    try {
      const searchAvailable = await isSearchAvailable();
      if (searchAvailable) {
        const searchResponse = await performWebSearch(input, 'automation');
        if (searchResponse && searchResponse.results.length > 0) {
          const searchSection = formatSearchResults(searchResponse);
          if (searchSection) {
            sections.push(searchSection);
          }
        }
      }
    } catch (error) {
      console.warn('Web search failed for automation agent:', error);
      // Continue without search results - graceful degradation
    }

    // 8. Implementation Steps
    const nextSteps = consulting.getSuggestedNextSteps(input, reasoningLevel);
    if (nextSteps.length > 0) {
      const stepsHeader = reasoningLevel === 'basic' ? 'How to do this' :
        reasoningLevel === 'advanced' ? 'Technical Implementation Roadmap' : 'Implementation Roadmap';
      sections.push(`## 🎯 ${stepsHeader}\n\n${nextSteps.map((step: string, i: number) => `${i + 1}. **${step}**`).join('\n')}`);
    }

    // 9. Automation Agent Closing (Systematic & Results-Focused)
    const closingOptions = reasoningLevel === 'basic' ? [
      "Ready to start? I can help you with each step.",
      "Which part would help you most? Let's do that first.",
      "What part should we automate first?"
    ] : reasoningLevel === 'advanced' ? [
      "I can provide detailed technical specifications, performance metrics, or scalability analysis.",
      "Would you like to explore advanced optimization techniques or edge case handling?",
      "Ready to dive into architectural patterns, API design, or system integration details?"
    ] : [
      "Ready to implement? I can walk you through each step or dive into the technical details.",
      "Which part of this automation would have the biggest impact? Let's start there.",
      "I'm here to optimize every detail until this process runs like clockwork. What should we tackle first?"
    ];
    const closing = closingOptions[Math.floor(Math.random() * closingOptions.length)];
    sections.push(`---\n\n💡 ${closing}`);

    return sections.join('\n\n');
  }

  private async executeAutomationPlanSteps(input: string, plan: ResponsePlan, options: {
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

    // Execute each step in the plan with automation focus
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
              const questionHeader = this.getAutomationQuestionHeader(reasoningLevel);
              sections.push(`## ⚙️ Optimization Parameters\n\n${questionHeader}\n\n${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`);
            }
          }
          break;

        case 'Reference relevant memory':
        case 'Integrate memory context':
        case 'Build on previous context':
        case 'Connect to previous work':
          if (plan.tools.useMemory && memoryContext.entries.length > 0 && contextString.trim()) {
            const memoryInsights = this.formatProcessInsights(memoryContext.entries.slice(0, 2));
            if (memoryInsights && memoryInsights.trim().length > 0) {
              sections.push(`## 🧠 Building on Previous Optimizations\n\n${memoryInsights}`);
            }
          }
          break;

        case 'Provide initial guidance':
        case 'Provide direct response':
          sections.push(await this.generateAutomationDirectResponse(input, plan, contextString));
          break;

        case 'Establish framework':
        case 'Provide structured analysis':
          sections.push(await this.generateAutomationFramework(input, plan, consulting, reasoningLevel));
          break;

        case 'Apply domain knowledge':
        case 'Inject domain expertise':
        case 'Provide expert insights':
          if (plan.tools.useKnowledge) {
            const knowledgeSection = await this.generateAutomationKnowledgeSection(input);
            if (knowledgeSection) {
              sections.push(knowledgeSection);
            }
          }
          break;

        case 'Enhance with search results':
        case 'Supplement with current data':
          if (plan.tools.useSearch) {
            const searchSection = await this.generateAutomationSearchSection(input);
            if (searchSection) {
              sections.push(searchSection);
            }
          }
          break;

        case 'Suggest next steps':
          const nextSteps = consulting.getSuggestedNextSteps(input, reasoningLevel);
          if (nextSteps.length > 0) {
            const stepsHeader = this.getAutomationStepsHeader(reasoningLevel);
            sections.push(`## 🚀 ${stepsHeader}\n\n${nextSteps.map((step: string, i: number) => `${i + 1}. **${step}**`).join('\n')}`);
          }
          break;

        case 'Guide exploration':
        case 'Encourage iteration':
          sections.push(this.generateAutomationExplorationGuidance(input, plan));
          break;

        case 'Clarify direction':
          if (plan.confidence < 0.7) {
            sections.push(this.generateAutomationDirectionClarification(input, plan));
          }
          break;
      }
    }

    // Add contextual automation introduction if not suppressed
    const suppressIntro = routingMetadata?.suppressIntro || routingMetadata?.stayInThread || routingMetadata?.isContinuation;
    if (!suppressIntro && sections.length > 0) {
      const intro = this.generateAutomationIntroduction(plan, injectedContext, routingMetadata);
      sections.unshift(intro);
    }

    // Add status greeting if available
    if (statusGreeting && !routingMetadata?.isContinuation) {
      sections.unshift(statusGreeting, '');
    }

    // Add efficiency-focused automation closing
    const closingOptions = this.getAutomationClosingOptions(reasoningLevel);
    const closing = closingOptions[Math.floor(Math.random() * closingOptions.length)];
    sections.push(`---\n\n🎯 ${closing}`);

    return sections.join('\n\n');
  }

  private getAutomationQuestionHeader(reasoningLevel: ReasoningLevel): string {
    switch (reasoningLevel) {
      case 'basic':
        return "To optimize your workflow, tell me:";
      case 'advanced':
        return "To engineer the optimal solution, please specify:";
      default:
        return "To build the most effective automation, let me understand:";
    }
  }

  private generateAutomationIntroduction(plan: ResponsePlan, injectedContext: any, routingMetadata?: any): string {
    if (routingMetadata?.isContinuation) {
      return '⚙️ **Continuing our optimization work**...';
    }
    
    if (injectedContext.personalizedIntro) {
      return `⚙️ **Process Optimization**: ${injectedContext.personalizedIntro}`;
    }
    
    // Dynamic intro based on plan
    switch (plan.responseStrategy) {
      case 'clarification_first':
        return '⚙️ **Process Optimization**: I need to understand your workflow better to build the most effective automation!';
      case 'structured_framework':
        return '⚙️ **Process Optimization**: I\'ll help you design a systematic approach to streamline your workflows.';
      case 'guided_discovery':
        return '⚙️ **Process Optimization**: Let\'s discover the best automation opportunities in your system!';
      default:
        return '⚙️ **Process Optimization**: I\'ll help you streamline workflows and boost efficiency.';
    }
  }

  private async generateAutomationDirectResponse(input: string, plan: ResponsePlan, contextString: string): Promise<string> {
    const response = await this.generateResponse(input, contextString);
    return `## 🛠️ Automation Solution\n\n${response}`;
  }

  private async generateAutomationFramework(input: string, plan: ResponsePlan, consulting: any, reasoningLevel: ReasoningLevel): Promise<string> {
    const framework = consulting.getStructuredFramework(input, reasoningLevel);
    return framework;
  }

  private async generateAutomationKnowledgeSection(input: string): Promise<string | null> {
    const knowledgeModules = await getKnowledgeForInput(input);
    if (knowledgeModules.length > 0) {
      return formatKnowledgeSection(knowledgeModules);
    }
    return null;
  }

  private async generateAutomationSearchSection(input: string): Promise<string | null> {
    try {
      const searchAvailable = await isSearchAvailable();
      if (searchAvailable) {
        const searchResponse = await performWebSearch(input, 'automation');
        if (searchResponse && searchResponse.results.length > 0) {
          return formatSearchResults(searchResponse);
        }
      }
    } catch (error) {
      console.warn('Web search failed for automation agent:', error);
    }
    return null;
  }

  private generateAutomationExplorationGuidance(input: string, plan: ResponsePlan): string {
    return `## 🔧 Process Analysis\n\nYour ${plan.domain} automation goal presents excellent optimization opportunities! The ${plan.intent} approach suggests we should focus on systematic workflow improvements and efficiency gains.`;
  }

  private generateAutomationDirectionClarification(input: string, plan: ResponsePlan): string {
    return `## 🎯 Optimization Direction\n\nTo build the most effective automation for your ${plan.domain} workflow, could you help me understand the specific processes or bottlenecks you'd like to streamline?`;
  }

  private getAutomationStepsHeader(reasoningLevel: ReasoningLevel): string {
    switch (reasoningLevel) {
      case 'basic':
        return 'Implementation Steps';
      case 'advanced':
        return 'Strategic Process Engineering';
      default:
        return 'Next Optimization Steps';
    }
  }

  private getAutomationClosingOptions(reasoningLevel: ReasoningLevel): string[] {
    switch (reasoningLevel) {
      case 'basic':
        return [
          "Ready to start optimizing? Let's make this more efficient!",
          "Which process should we streamline first?",
          "What workflow bottleneck is slowing you down most?"
        ];
      case 'advanced':
        return [
          "Shall I architect a comprehensive automation strategy for this system?",
          "Which performance metrics should we prioritize in this optimization?",
          "Ready to implement enterprise-grade process improvements?"
        ];
      default:
        return [
          "Which automation approach resonates with your workflow needs?",
          "I can help you implement this step-by-step for maximum efficiency gains.",
          "What's the biggest time sink we can eliminate together?"
        ];
    }
  }

  private formatProcessInsights(entries: any[]): string {
    if (!entries || entries.length === 0) return '';
    
    return entries.map(entry => {
      const cleanSummary = entry.summary
        .replace(/^(automation_goal:|ROUTING_HANDOFF:|Agent:)/i, '')
        .trim();
      return `• ${cleanSummary}`;
    }).join('\n');
  }

  private calculateTaskConfidence(input: string, taskType: string): number {
    let confidence = 0.4; // Base confidence
    
    const lowerInput = input.toLowerCase();
    
    // Increase confidence for specific task details
    if (taskType === 'promptWriting' && (lowerInput.includes('help me') || lowerInput.includes('need to'))) {
      confidence += 0.3;
    }
    
    if (taskType === 'scripting' && (lowerInput.includes('daily') || lowerInput.includes('process') || lowerInput.includes('system'))) {
      confidence += 0.3;
    }
    
    // Check for context about the current state
    if (lowerInput.includes('currently') || lowerInput.includes('right now') || lowerInput.includes('existing')) {
      confidence += 0.2;
    }
    
    // Very short inputs need clarification
    if (input.split(' ').length < 5) {
      confidence -= 0.3;
    }
    
    return Math.min(Math.max(confidence, 0), 1.0);
  }

  private identifyTaskType(input: string): string {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('prompt') || lowerInput.includes('write') && (lowerInput.includes('ai') || lowerInput.includes('chatgpt') || lowerInput.includes('claude'))) {
      return 'promptWriting';
    }
    
    if (lowerInput.includes('script') || lowerInput.includes('automate') || lowerInput.includes('workflow')) {
      return 'scripting';
    }
    
    if (lowerInput.includes('idea') || lowerInput.includes('brainstorm') || lowerInput.includes('creative') || lowerInput.includes('generate')) {
      return 'ideaGeneration';
    }
    
    if (lowerInput.includes('template') || lowerInput.includes('format') || lowerInput.includes('standard')) {
      return 'templateCreation';
    }
    
    if (lowerInput.includes('optimize') || lowerInput.includes('improve') || lowerInput.includes('streamline')) {
      return 'processOptimization';
    }
    
    return 'general';
  }

  private generateTaskResponse(input: string, taskType: string): string {
    switch (taskType) {
      case 'promptWriting':
        return this.handlePromptWriting(input);
      case 'scripting':
        return this.handleScripting(input);
      case 'ideaGeneration':
        return this.handleIdeaGeneration(input);
      case 'templateCreation':
        return this.handleTemplateCreation(input);
      case 'processOptimization':
        return this.handleProcessOptimization(input);
      default:
        return this.handleGeneralAutomation(input);
    }
  }

  private handlePromptWriting(input: string): string {
    const keywords = this.extractKeywords(input);
    
    return `Hey! I can help you craft a solid prompt for that. Here's what I'm thinking:

**🎯 Optimized Prompt:**
"You are a specialized assistant focused on ${keywords.join(', ')}. Please provide detailed, actionable responses that include specific examples and step-by-step guidance. Always consider the user's context and offer practical next steps."

**💡 Why this works:**
- Clear role definition sets expectations
- Asks for specificity and examples
- Requests actionable guidance
- Considers user context

**🔧 Pro tips for better prompts:**
- Be specific about the output format you want
- Include examples when possible
- Set the tone (professional, casual, creative)
- Add constraints if needed (word count, style, etc.)

Want me to refine this further or create variations for different use cases?`;
  }

  private handleScripting(input: string): string {
    const keywords = this.extractKeywords(input);
    
    return `Perfect! Let's automate this task. Based on what you're describing, here's a practical approach:

**🚀 Automation Strategy:**
I'd recommend creating a script that handles ${keywords.join(' and ')} efficiently.

**📝 Basic Script Structure:**
\`\`\`bash
#!/bin/bash
# Automation script for ${keywords[0] || 'your task'}

# Configuration
CONFIG_FILE="config.txt"
LOG_FILE="automation.log"

# Main function
main() {
    echo "Starting automation..." | tee -a $LOG_FILE
    # Your automation logic here
    echo "Automation complete!" | tee -a $LOG_FILE
}

# Error handling
handle_error() {
    echo "Error: $1" | tee -a $LOG_FILE
    exit 1
}

# Run main function
main "$@"
\`\`\`

**🎯 Implementation tips:**
- Start simple and iterate
- Add logging for debugging
- Include error handling
- Make it configurable with variables

Need help with a specific scripting language or want me to dive deeper into any part?`;
  }

  private handleIdeaGeneration(input: string): string {
    const keywords = this.extractKeywords(input);
    
    return `Awesome! Let's brainstorm some creative ideas around ${keywords.join(', ')}. Here's what I'm thinking:

**💡 Creative Ideas:**

**Option 1: The Quick Win Approach**
- Focus on immediate, low-effort solutions
- Build momentum with small successes
- Iterate based on feedback

**Option 2: The Innovation Route**
- Challenge existing assumptions
- Combine unexpected elements
- Look for cross-industry inspiration

**Option 3: The User-Centric Path**
- Start with user pain points
- Map the complete user journey
- Design for delight, not just function

**🎯 Next Steps:**
1. Pick the approach that resonates most
2. Create a quick prototype or mockup
3. Test with a small group
4. Iterate based on learnings

**🔄 Brainstorming techniques to try:**
- "What if we did the opposite?"
- "How would [successful company] solve this?"
- "What would this look like in 10 years?"

Which direction feels most promising? I can dive deeper into any of these!`;
  }

  private handleTemplateCreation(input: string): string {
    const keywords = this.extractKeywords(input);
    
    return `Great idea! Templates are huge time-savers. Let me create a flexible template structure for ${keywords.join(' and ')}:

**📋 Template Framework:**

\`\`\`
# [TEMPLATE NAME]
Date: [DATE]
Author: [AUTHOR]

## Objective
[What are you trying to achieve?]

## Key Elements
- Element 1: [DESCRIPTION]
- Element 2: [DESCRIPTION]
- Element 3: [DESCRIPTION]

## Action Items
[ ] Task 1
[ ] Task 2
[ ] Task 3

## Success Metrics
- Metric 1: [TARGET]
- Metric 2: [TARGET]

## Notes
[Additional context or considerations]
\`\`\`

**🎯 Customization Options:**
- Add/remove sections based on your needs
- Include dropdown options for common choices
- Create variations for different scenarios
- Build in approval/review checkpoints

**💡 Template Tips:**
- Keep it simple and scannable
- Use consistent formatting
- Include helpful prompts/questions
- Version control your templates

Want me to customize this for your specific use case or create additional template variations?`;
  }

  private handleProcessOptimization(input: string): string {
    const keywords = this.extractKeywords(input);
    
    return `Nice! Process optimization is my jam. Let's streamline this workflow around ${keywords.join(', ')}:

**🔍 Optimization Analysis:**

**Current State Assessment:**
- What steps are taking the most time?
- Where do bottlenecks typically occur?
- Which tasks are most repetitive?

**💡 Optimization Opportunities:**

**1. Automation Wins:**
- Automate repetitive data entry
- Set up automatic notifications
- Create template responses

**2. Process Improvements:**
- Eliminate redundant steps
- Parallel process where possible
- Standardize decision criteria

**3. Tool Upgrades:**
- Use better software/platforms
- Integrate systems to reduce context switching
- Implement keyboard shortcuts and hotkeys

**⚡ Quick Implementation Plan:**
1. **Week 1:** Identify top 3 pain points
2. **Week 2:** Implement one quick automation
3. **Week 3:** Standardize the improved process
4. **Week 4:** Measure results and iterate

**📊 Success Metrics:**
- Time saved per task
- Error reduction rate
- User satisfaction improvement

Ready to dive into any specific part of this process? I can help create detailed implementation plans!`;
  }

  private handleGeneralAutomation(_input: string): string {
    return `Hey there! I'm your go-to automation buddy. I can help you streamline pretty much anything:

**🛠️ What I'm great at helping with:**

**Prompt Engineering:**
- Crafting effective AI prompts
- Optimizing for different models
- Building prompt libraries

**Script Creation:**
- Bash, Python, Node.js scripts
- Workflow automation
- Data processing pipelines

**Creative Solutions:**
- Brainstorming innovative approaches
- Problem-solving frameworks
- Idea generation techniques

**Templates & Standardization:**
- Document templates
- Process frameworks
- Reusable formats

**Process Optimization:**
- Workflow analysis
- Bottleneck identification
- Efficiency improvements

**💬 Just tell me:**
- What task is eating up your time?
- What process feels clunky?
- What would you love to automate?

I'll whip up a practical solution that actually works. No over-engineering, just solid automation that saves you time and headaches.

What's bugging you today that we can fix together?`;
  }

  private extractKeywords(input: string): string[] {
    const words = input.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'i', 'me', 'my', 'we', 'us', 'you', 'your'];
    return words.filter(word => word.length > 3 && !stopWords.includes(word)).slice(0, 4);
  }

  private extractGoalTag(input: string, taskType: string): string {
    // Extract subject for goal tracking
    const subject = input.replace(/^(automate|build|create|script|optimize|streamline|help me with|i need|can you)/i, '').trim();
    const cleanSubject = subject.split(/\s+/).slice(0, 3).join('_').toLowerCase();
    return cleanSubject || taskType;
  }

  private async handleClarificationRequest(
    input: string,
    clarificationResult: any,
    memoryContext: any,
    contextString: string
  ): Promise<{ message: string }> {
    const questions = generateClarifyingQuestions(clarificationResult, 'automation', input);
    
    // Create automation-focused clarification message
    let clarificationMessage = '⚙️ **Automation Agent**: I\'m ready to streamline this process and make your workflow more efficient! But I need some more specifics to build the perfect automation.\n\n';
    
    // Add reason-specific context for automation work
    switch (clarificationResult.reason) {
      case 'vague_input':
        clarificationMessage += 'Your automation request has great potential - could you help me understand the specific process or workflow you\'d like to optimize?\n\n';
        break;
      case 'missing_subject':
        clarificationMessage += 'I\'m ready to build something efficient, but I\'m not clear on which process, task, or system you\'d like me to focus on.\n\n';
        break;
      case 'underspecified_goal':
        clarificationMessage += 'I can see you want process optimization, but I need more details about the current workflow and desired outcomes.\n\n';
        break;
      case 'ambiguous_context':
        clarificationMessage += 'I need more context about the process you\'re working with to design the most effective automation.\n\n';
        break;
    }
    
    // Add automation-specific clarifying questions
    if (questions.length > 0) {
      clarificationMessage += 'To build efficient automation, could you tell me:\n\n';
      questions.forEach((question, index) => {
        clarificationMessage += `• ${question}\n`;
      });
      clarificationMessage += '\n';
    }
    
    // Add memory context if available
    if (contextString && contextString.trim()) {
      clarificationMessage += '🔧 **Based on our process optimization history**, I can build on the workflows we\'ve already streamlined. Feel free to reference previous automations or point me toward a new efficiency challenge!\n\n';
    }
    
    clarificationMessage += 'Once I understand your workflow, I can create scripts, templates, prompts, and optimization strategies that will save you time and eliminate manual work!';
    
    return {
      message: clarificationMessage
    };
  }

  private async logInteraction(message: AgentMessage): Promise<void> {
    await this.memoryManager.logMessage(message);
  }

  private generateId(): string {
    return `automation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    
    // Automation domain detection
    if (lowerInput.includes('workflow') || lowerInput.includes('process') || lowerInput.includes('automate')) {
      return 'workflow automation';
    }
    if (lowerInput.includes('script') || lowerInput.includes('code') || lowerInput.includes('program')) {
      return 'scripting';
    }
    if (lowerInput.includes('task') || lowerInput.includes('routine') || lowerInput.includes('schedule')) {
      return 'task automation';
    }
    if (lowerInput.includes('integration') || lowerInput.includes('api') || lowerInput.includes('connect')) {
      return 'system integration';
    }
    if (lowerInput.includes('efficiency') || lowerInput.includes('optimize') || lowerInput.includes('streamline')) {
      return 'process optimization';
    }
    
    return undefined;
  }
}