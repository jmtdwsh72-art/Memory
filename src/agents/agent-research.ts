import { AgentConfig, AgentMessage, AgentResponse } from '../utils/types';
import { MemoryManager } from '../utils/memory-manager';
import { getAgentConfig } from '../utils/config-utils';
import { useAgentMemoryWithPreset } from '../utils/memory-hooks';
import { ConversationalBehavior } from '../utils/conversational-behavior';
import { ConversationalHandler } from '../utils/conversational-handler';
import { ContextInjector } from '../utils/context-injection';
import { getConsultingPatterns } from '../utils/consulting-patterns';
import { getKnowledgeForInput, formatKnowledgeSection, detectDomains } from '../utils/knowledge-loader';
import { performWebSearch, formatSearchResults, isSearchAvailable } from '../utils/web-search';
import { getReasoningLevel, ReasoningLevel, getReasoningPromptModifier } from '../utils/reasoning-depth';
import { analyzeUserFeedback, adjustReasoningLevelFromFeedback, generateFeedbackAcknowledgment, isContinuationRequest } from '../utils/feedback-analyzer';
import { sessionTracker } from '../utils/session-tracker';
import { detectClarificationNeed, createClarificationMemory } from '../utils/clarification-detector';
import { detectGoalProgress, createGoalProgressMemory, getStatusAwareGreeting, getCongratulationsMessage, getAbandonmentMessage, getProgressMessage } from '../utils/goal-tracker';
import { generateSessionSummary, detectSummaryRequest, detectSaveSummaryRequest, detectSessionEnding, shouldOfferSummary } from '../utils/result-summarizer';
import { composeFinalResponse, FinalResponseContext, assessSessionComplexity, shouldOfferMemoryStorage, createSessionDecisionMemory } from '../utils/final-response-composer';
import { cleanInputFromMemoryArtifacts, formatMemoryInsights, buildSafeMemoryContext } from '../utils/memory-formatter';
import { generateSmartClosing, detectComprehensiveAnswer } from '../utils/smart-closing-generator';
import { generateResponsePlan, AgentContext, ResponsePlan } from '../utils/reasoning-planner';

export class ResearchAgent {
  private config: AgentConfig;
  private memoryManager: MemoryManager;
  private conversational: ConversationalBehavior;

  constructor() {
    // Load validated configuration using centralized utility
    this.config = getAgentConfig('research');
    this.memoryManager = new MemoryManager();
    this.conversational = new ConversationalBehavior();
  }

  async processInput(input: string, userId?: string, routingMetadata?: any): Promise<AgentResponse> {
    try {
      // Clean input from memory artifacts first
      const cleanInput = cleanInputFromMemoryArtifacts(input);
      
      // Use centralized memory utilities with research preset
      const memory = useAgentMemoryWithPreset(this.config.id, 'research', userId);
      
      // Recall relevant memories using preset configuration (use clean input)
      const memoryContext = await memory.recallWithPreset(cleanInput);
      const contextString = buildSafeMemoryContext(memoryContext);
      
      // Check for previous session and analyze feedback
      const sessionUserId = userId || 'anonymous';
      const lastSession = sessionTracker.getLastResponse(sessionUserId);
      let feedbackAcknowledgment = '';
      let adjustedReasoningLevel: ReasoningLevel | null = null;
      let goalProgressMessage = '';
      let feedback = null;
      
      if (lastSession && lastSession.lastAgentId === this.config.id) {
        // Analyze user feedback on previous response (use clean input)
        feedback = analyzeUserFeedback(cleanInput, lastSession.lastAgentResponse, memoryContext.entries);
        
        // Store feedback memory if significant
        if (feedback.feedbackMemory) {
          await memory.saveMemory(
            feedback.feedbackMemory.input || input,
            feedback.feedbackMemory.summary || '',
            feedback.feedbackMemory.summary || '',
            'pattern',
            ['feedback', feedback.type, 'user_preference']
          );
        }
        
        // Adjust reasoning level based on feedback
        if (feedback.reasoningAdjustment) {
          const currentLevel = (lastSession.lastReasoningLevel as ReasoningLevel) || 'intermediate';
          adjustedReasoningLevel = adjustReasoningLevelFromFeedback(currentLevel, feedback);
          feedbackAcknowledgment = generateFeedbackAcknowledgment(feedback);
        }
        
        // Check if this is a continuation request
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
        const goalSummary = progressMemory.goalSummary || 'your research project';
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
      let statusGreeting = '';
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
          `Research session summary generated on ${new Date().toLocaleDateString()}`,
          'session_summary',
          ['summary', 'reflection', this.config.id, 'session_recap']
        );
        
        const confirmationMessage = `📝 **Session Summary Saved!**\n\nI've stored our session summary in your memory. You can reference it in future conversations, and I'll use it to provide better continuity.\n\n${sessionSummary}`;
        
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
      
      // Get consulting patterns for research agent
      const consulting = getConsultingPatterns('research');
      
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
            ['clarification_requested', clarificationResult.reason || 'vague', 'research']
          );
          
          // Generate research-specific clarification response
          const response = await this.handleClarificationRequest(input, clarificationResult, memoryContext, contextString);
          
          await this.logInteraction({
            id: this.generateId(),
            timestamp: new Date(),
            agentName: this.config.id,
            input,
            output: response.message,
            meta: { awaitingClarification: true }
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
      
      const responsePlan = generateResponsePlan(cleanInput, agentContext);
      
      // Use adjusted reasoning level if available, otherwise use plan's level
      const reasoningLevel: ReasoningLevel = adjustedReasoningLevel || responsePlan.reasoningLevel;
      
      // Build dynamic response based on plan
      const response = await this.buildPlannedResponse(cleanInput, responsePlan, {
        consulting,
        injectedContext,
        memoryContext,
        contextString,
        routingMetadata,
        reasoningLevel,
        feedbackAcknowledgment,
        goalProgressMessage,
        statusGreeting
      });
      
      // Store interaction using centralized utility with goal tracking
      const goalTag = `${responsePlan.intent}_${responsePlan.domain.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).slice(0, 3).join('_').toLowerCase()}`;
      
      // Save as goal type with appropriate tags
      await memory.saveMemory(
        input, 
        response, 
        `research_goal: ${goalTag}`,
        'goal',
        ['research', responsePlan.intent, responsePlan.domain.toLowerCase(), 'learning_goal']
      );

      await this.logInteraction({
        id: this.generateId(),
        timestamp: new Date(),
        agentName: this.config.id,
        input,
        output: response,
        memoryUsed: memoryContext.entries.map(m => m.id),
        meta: { reasoningLevel }
      });

      // Compose final response with thoughtful closing
      const recentGoal = await this.getRecentGoal(memoryContext.entries);
      const isSessionEnding = detectSessionEnding(input);
      const shouldOfferSummaryFlag = shouldOfferSummary(memoryContext.entries);
      
      const finalResponseContext: FinalResponseContext = {
        recentGoal,
        reasoningLevel,
        feedbackType: feedback?.type || null,
        isSessionEnd: isSessionEnding,
        agentPersonality: 'research',
        knowledgeDomain: this.extractKnowledgeDomain(input),
        userInput: input,
        hasMemoryContext: memoryContext.entries.length > 0,
        sessionComplexity: assessSessionComplexity({
          recentGoal,
          reasoningLevel,
          feedbackType: feedback?.type || null,
          isSessionEnd: isSessionEnding,
          agentPersonality: 'research',
          knowledgeDomain: this.extractKnowledgeDomain(input),
          userInput: input,
          hasMemoryContext: memoryContext.entries.length > 0
        })
      };

      const finalClosing = composeFinalResponse('research', finalResponseContext, {
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
        message: `Research agent error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }


  private async generateResponse(input: string, memoryContext: string): Promise<string> {
    // Analyze the intent and context to provide practical guidance
    const intent = this.analyzeResearchIntent(input);
    let response = '';

    // Generate contextual response based on user's actual need
    switch (intent.type) {
      case 'learning':
        response = this.generateLearningGuidance(input, intent);
        break;
      case 'comparison':
        response = this.generateComparisonAnalysis(input, intent);
        break;
      case 'explanation':
        response = this.generateExplanation(input, intent);
        break;
      case 'exploration':
        response = this.generateExplorationGuide(input, intent);
        break;
      case 'analysis':
        response = this.generateAnalysisFramework(input, intent);
        break;
      default:
        response = this.generateGeneralResearch(input, intent);
    }

    // Add contextual memory if available and relevant
    if (memoryContext && memoryContext.trim()) {
      response += `\n\n📚 **Building on our previous research:**\n${memoryContext}`;
    }
    
    return response;
  }

  private async buildPlannedResponse(input: string, plan: ResponsePlan, options: {
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
    // Execute plan steps dynamically
    return await this.executePlanSteps(input, plan, options);
  }

  private async executePlanSteps(input: string, plan: ResponsePlan, options: {
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

    // Execute each step in the plan
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

        case 'Ask focused clarifying questions':
          if (plan.tools.askClarifyingQuestions) {
            const questions = this.generateSmartClarifyingQuestions(input, plan, reasoningLevel);
            if (questions.length > 0) {
              sections.push(`🧭 **Understanding Your Goal**\n\nTo give you the most targeted research:\n\n${questions.map((q, i) => `• ${q}`).join('\n')}`);
            }
          }
          break;

        case 'Reference relevant memory':
        case 'Integrate memory context':
        case 'Build on previous context':
        case 'Connect to previous work':
          if (plan.tools.useMemory && memoryContext.entries.length > 0 && contextString.trim()) {
            const memoryInsights = formatMemoryInsights(memoryContext.entries.slice(0, 2));
            if (memoryInsights && memoryInsights.trim().length > 0) {
              sections.push(`## 📚 Relevant Context\n\n${memoryInsights}`);
            }
          }
          break;

        case 'Provide immediate first step':
        case 'Interpret goal with nuance':
        case 'Provide actionable plan':
          sections.push(await this.generateActionablePlan(input, plan, contextString, reasoningLevel));
          break;

        case 'Clarify specific focus area':
        case 'Provide targeted learning path':
          sections.push(await this.generateTargetedPath(input, plan, contextString, reasoningLevel));
          break;

        case 'Add domain expertise':
        case 'Include expert recommendations':
        case 'Share relevant insights':
          if (plan.tools.useKnowledge) {
            const expertInsights = await this.generateExpertInsights(input, plan, reasoningLevel);
            if (expertInsights) {
              sections.push(expertInsights);
            }
          }
          break;

        case 'Include current best practices':
          if (plan.tools.useSearch) {
            const currentPractices = await this.generateCurrentPractices(input, plan);
            if (currentPractices) {
              sections.push(currentPractices);
            }
          }
          break;

        case 'Suggest next steps':
          const nextSteps = consulting.getSuggestedNextSteps(input);
          if (nextSteps.length > 0) {
            sections.push(`## 🎯 Recommended Next Steps\n\n${nextSteps.map((step: string, i: number) => `${i + 1}. **${step}**`).join('\n')}`);
          }
          break;

        case 'Guide exploration':
        case 'Encourage iteration':
          sections.push(this.generateExplorationGuidance(input, plan));
          break;

        case 'Clarify direction':
          if (plan.confidence < 0.7) {
            sections.push(this.generateDirectionClarification(input, plan));
          }
          break;
      }
    }

    // Add contextual introduction if not suppressed
    const suppressIntro = routingMetadata?.suppressIntro || routingMetadata?.stayInThread || routingMetadata?.isContinuation;
    if (!suppressIntro && sections.length > 0) {
      const intro = this.generateContextualIntroduction(plan, injectedContext, routingMetadata);
      sections.unshift(intro);
    }

    // Add status greeting if available
    if (statusGreeting && !routingMetadata?.isContinuation) {
      sections.unshift(statusGreeting, '');
    }

    // Add task-tailored closing
    const taskTailoredClosing = this.generateTaskTailoredClosing(input, plan, reasoningLevel);
    if (taskTailoredClosing) {
      sections.push(`\n👉 ${taskTailoredClosing}`);
    }

    return sections.join('\n\n');
  }

  private getQuestionHeaderForLevel(reasoningLevel: ReasoningLevel): string {
    switch (reasoningLevel) {
      case 'basic':
        return "To help you better, I'd like to know:";
      case 'advanced':
        return "To provide rigorous analysis, please clarify:";
      default:
        return "To provide the most valuable analysis, I'd like to understand:";
    }
  }

  private generateContextualIntroduction(plan: ResponsePlan, injectedContext: any, routingMetadata?: any): string {
    if (routingMetadata?.isContinuation) {
      return '🔬 **Continuing our research**...';
    }
    
    if (injectedContext.personalizedIntro) {
      return `🔬 **Research Analysis**: ${injectedContext.personalizedIntro}`;
    }
    
    // Dynamic intro based on plan
    switch (plan.responseStrategy) {
      case 'clarification_first':
        return '🔬 **Research Analysis**: I need to understand your research goals better to provide valuable insights.';
      case 'structured_framework':
        return '🔬 **Research Analysis**: I\'ll help you develop a structured approach to this investigation.';
      case 'guided_discovery':
        return '🔬 **Research Analysis**: Let\'s explore this topic systematically to uncover key insights.';
      default:
        return '🔬 **Research Analysis**: I\'ll help you develop a structured approach to this investigation.';
    }
  }

  private generateSmartClarifyingQuestions(input: string, plan: ResponsePlan, reasoningLevel: ReasoningLevel): string[] {
    const questions: string[] = [];
    
    // Smart clarification based on input patterns
    if (/^(learn|code|coding|program)$/i.test(input.trim())) {
      questions.push("What kind of coding are you interested in — web development, mobile apps, data science, or something else?");
      questions.push("Do you have any prior experience, or would you prefer to start with hands-on projects?");
    } else if (/^(research|study|analyze)$/i.test(input.trim())) {
      questions.push("What specific topic or question should I help you research?");
      questions.push("Are you looking for background information, current trends, or practical applications?");
    } else if (plan.domain === 'general') {
      questions.push("What specific area or topic are you most interested in exploring?");
      questions.push("What's the end goal — learning something new, solving a problem, or making a decision?");
    }
    
    return questions.slice(0, 2); // Max 2 focused questions
  }

  private async generateActionablePlan(input: string, plan: ResponsePlan, contextString: string, reasoningLevel: ReasoningLevel): Promise<string> {
    const interpretedGoal = this.interpretGoalWithNuance(input, plan, contextString);
    const immediateAction = this.generateImmediateAction(input, plan, reasoningLevel);
    const learningOutcome = this.generateLearningOutcome(input, plan);
    
    return `🧭 **${interpretedGoal}**

📌 **Immediate Focus**: ${immediateAction}

🛠️ **Try This First**: ${this.generateTryThisFirst(input, plan, reasoningLevel)}

🧠 **You'll Learn**: ${learningOutcome}`;
  }

  private async generateTargetedPath(input: string, plan: ResponsePlan, contextString: string, reasoningLevel: ReasoningLevel): Promise<string> {
    const focusArea = this.identifySpecificFocus(input, plan);
    const targetedSteps = await this.generateTargetedSteps(input, plan, reasoningLevel);
    
    return `🎯 **Focus Area**: ${focusArea}

📋 **Your Learning Path**:
${targetedSteps}`;
  }

  private async generateExpertInsights(input: string, plan: ResponsePlan, reasoningLevel: ReasoningLevel): Promise<string | null> {
    const knowledgeModules = await getKnowledgeForInput(input);
    if (knowledgeModules.length > 0) {
      const insights = this.extractActionableInsights(knowledgeModules, reasoningLevel);
      return `💡 **Expert Insight**: ${insights}`;
    }
    return null;
  }

  private async generateCurrentPractices(input: string, plan: ResponsePlan): Promise<string | null> {
    try {
      const searchAvailable = await isSearchAvailable();
      if (searchAvailable) {
        const searchResponse = await performWebSearch(input, 'research');
        if (searchResponse && searchResponse.results.length > 0) {
          const practices = this.extractBestPractices(searchResponse);
          return `⚡ **Current Best Practices**: ${practices}`;
        }
      }
    } catch (error) {
      console.warn('Web search failed for research agent:', error);
    }
    return null;
  }

  private interpretGoalWithNuance(input: string, plan: ResponsePlan, contextString: string): string {
    const cleanInput = input.toLowerCase().trim();
    
    // Nuanced interpretation patterns
    if (cleanInput.includes('learn') && cleanInput.includes('code')) {
      if (plan.domain.includes('web')) return 'Start Your Web Development Journey';
      if (plan.domain.includes('python')) return 'Master Python Programming';
      if (plan.domain.includes('javascript')) return 'Build Interactive Web Applications';
      return 'Begin Your Coding Adventure';
    }
    
    if (cleanInput.includes('research') || cleanInput.includes('study')) {
      return `Deep Dive into ${plan.domain.charAt(0).toUpperCase() + plan.domain.slice(1)}`;
    }
    
    if (cleanInput.includes('compare') || cleanInput.includes('vs')) {
      return `Strategic Comparison Analysis`;
    }
    
    return `${plan.intent.charAt(0).toUpperCase() + plan.intent.slice(1)} ${plan.domain} Effectively`;
  }

  private generateImmediateAction(input: string, plan: ResponsePlan, reasoningLevel: ReasoningLevel): string {
    const domain = plan.domain.toLowerCase();
    
    if (domain.includes('python')) {
      return "Install Python and VS Code, then create your first 'Hello World' program";
    }
    
    if (domain.includes('web') || domain.includes('javascript')) {
      return "Start with HTML/CSS basics using freeCodeCamp or create a simple personal landing page";
    }
    
    if (domain.includes('data') || domain.includes('machine learning')) {
      return "Set up a Jupyter notebook environment and explore a beginner dataset";
    }
    
    if (plan.intent === 'research') {
      return `Identify 2-3 authoritative sources on ${plan.domain} and create a research outline`;
    }
    
    return `Begin with the fundamentals of ${plan.domain} through hands-on practice`;
  }

  private generateTryThisFirst(input: string, plan: ResponsePlan, reasoningLevel: ReasoningLevel): string {
    const domain = plan.domain.toLowerCase();
    
    if (domain.includes('python')) {
      return "Build a simple calculator that adds, subtracts, multiplies, and divides two numbers.";
    }
    
    if (domain.includes('web')) {
      return "Create a personal portfolio page with your name, photo, and three favorite hobbies.";
    }
    
    if (domain.includes('javascript')) {
      return "Make an interactive button that changes color when clicked.";
    }
    
    if (plan.intent === 'research') {
      return `Find and summarize 3 key insights about ${plan.domain} from reputable sources.`;
    }
    
    return `Complete one small, practical project in ${plan.domain} to get hands-on experience.`;
  }

  private generateLearningOutcome(input: string, plan: ResponsePlan): string {
    const domain = plan.domain.toLowerCase();
    
    if (domain.includes('python')) {
      return "Basic Python syntax, variables, and how to run simple programs on your computer.";
    }
    
    if (domain.includes('web')) {
      return "How web pages are structured with HTML and styled with CSS.";
    }
    
    if (domain.includes('javascript')) {
      return "How to make web pages interactive and respond to user clicks.";
    }
    
    if (plan.intent === 'research') {
      return `Core concepts, current trends, and practical applications in ${plan.domain}.`;
    }
    
    return `Foundational knowledge and practical skills in ${plan.domain}.`;
  }

  private identifySpecificFocus(input: string, plan: ResponsePlan): string {
    // Extract specific focus from input
    if (plan.domain === 'coding' && input.toLowerCase().includes('web')) {
      return 'Frontend Web Development';
    }
    
    if (plan.domain === 'coding' && input.toLowerCase().includes('python')) {
      return 'Python Programming Fundamentals';
    }
    
    return `${plan.domain.charAt(0).toUpperCase() + plan.domain.slice(1)} ${plan.intent.charAt(0).toUpperCase() + plan.intent.slice(1)}`;
  }

  private async generateTargetedSteps(input: string, plan: ResponsePlan, reasoningLevel: ReasoningLevel): Promise<string> {
    const steps = [
      `1. **Week 1**: ${this.generateWeeklyStep(input, plan, 1)}`,
      `2. **Week 2**: ${this.generateWeeklyStep(input, plan, 2)}`,
      `3. **Week 3**: ${this.generateWeeklyStep(input, plan, 3)}`
    ];
    
    return steps.join('\n');
  }

  private generateWeeklyStep(input: string, plan: ResponsePlan, week: number): string {
    const domain = plan.domain.toLowerCase();
    
    if (domain.includes('python')) {
      const pythonSteps = [
        'Learn variables, strings, and basic input/output',
        'Master loops, conditionals, and functions',
        'Build your first real project (to-do list or calculator)'
      ];
      return pythonSteps[week - 1] || 'Continue practicing with personal projects';
    }
    
    if (domain.includes('web')) {
      const webSteps = [
        'HTML structure and CSS styling basics',
        'JavaScript fundamentals and DOM manipulation',
        'Build a complete responsive website'
      ];
      return webSteps[week - 1] || 'Deploy your project online';
    }
    
    return `Focus on ${plan.domain} fundamentals and practice`;
  }

  private extractActionableInsights(knowledgeModules: any[], reasoningLevel: ReasoningLevel): string {
    // Extract the most actionable insights from knowledge modules
    if (knowledgeModules.length > 0) {
      return `${knowledgeModules[0].title || 'Key insight'} - apply this immediately to see results.`;
    }
    return 'Industry best practices suggest starting with fundamentals and building practical projects.';
  }

  private extractBestPractices(searchResponse: any): string {
    // Extract current best practices from search results
    if (searchResponse.results && searchResponse.results.length > 0) {
      const firstResult = searchResponse.results[0];
      return `${firstResult.title} - ${firstResult.snippet?.slice(0, 100)}...`;
    }
    return 'Stay updated with the latest tools and methodologies in your chosen field.';
  }

  private generateTaskTailoredClosing(input: string, plan: ResponsePlan, reasoningLevel: ReasoningLevel): string | null {
    const domain = plan.domain.toLowerCase();
    const intent = plan.intent;
    
    // High confidence - offer specific next steps
    if (plan.confidence >= 0.9) {
      if (domain.includes('python')) {
        return "Ready to write your first Python script? Or want a full 30-day learning roadmap?";
      }
      
      if (domain.includes('web')) {
        return "Want to build your first webpage, or shall I suggest some beginner-friendly tutorials?";
      }
      
      if (intent === 'research') {
        return "Need me to dig deeper into any specific aspect, or ready to start your research?";
      }
      
      if (intent === 'compare') {
        return "Want detailed pros/cons for each option, or ready to make your decision?";
      }
      
      return "Ready to take the next step, or want me to go deeper on any part?";
    }
    
    // Medium confidence - ask for clarification
    if (plan.confidence >= 0.7) {
      return "Want me to go deeper on this, or shall I focus on a different aspect?";
    }
    
    // Lower confidence - request more information
    return "What specific part interests you most, or would you like me to explore a different angle?";
  }

  private async generateKnowledgeSection(input: string): Promise<string | null> {
    const knowledgeModules = await getKnowledgeForInput(input);
    if (knowledgeModules.length > 0) {
      return formatKnowledgeSection(knowledgeModules);
    }
    return null;
  }

  private async generateSearchSection(input: string): Promise<string | null> {
    try {
      const searchAvailable = await isSearchAvailable();
      if (searchAvailable) {
        const searchResponse = await performWebSearch(input, 'research');
        if (searchResponse && searchResponse.results.length > 0) {
          return formatSearchResults(searchResponse);
        }
      }
    } catch (error) {
      console.warn('Web search failed for research agent:', error);
    }
    return null;
  }

  private generateExplorationGuidance(input: string, plan: ResponsePlan): string {
    return `## 🔍 Exploration Direction\n\nBased on your ${plan.domain} inquiry, I recommend we explore this systematically. Your ${plan.intent} goal suggests we should focus on building understanding through structured investigation.`;
  }

  private generateDirectionClarification(input: string, plan: ResponsePlan): string {
    return `## 🎯 Direction Setting\n\nTo provide the most valuable research, could you help me understand the specific direction you'd like to take with this ${plan.domain} topic?`;
  }

  private formatMemoryInsights(entries: any[]): string {
    if (!entries || entries.length === 0) return '';
    
    return entries.map(entry => {
      const cleanSummary = entry.summary
        .replace(/^(research_goal:|ROUTING_HANDOFF:|Agent:)/i, '')
        .trim();
      return `• ${cleanSummary}`;
    }).join('\n');
  }

  private calculateIntentConfidence(intent: { type: string; subject: string; specifics: string[] }): number {
    let confidence = 0.3; // Base confidence
    
    // Increase confidence based on intent clarity
    if (intent.type !== 'general') confidence += 0.3;
    if (intent.subject && intent.subject.length > 3) confidence += 0.2;
    if (intent.specifics.length > 0) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  private analyzeResearchIntent(input: string): { type: string; subject: string; specifics: string[] } {
    const lowerInput = input.toLowerCase().trim();
    
    // Learning patterns
    if (lowerInput.match(/\b(learn|understand|teach me|explain|how to|study|master)\b/)) {
      return {
        type: 'learning',
        subject: this.extractMainSubject(input),
        specifics: this.extractSpecifics(input)
      };
    }
    
    // Comparison patterns
    if (lowerInput.match(/\b(compare|vs|versus|difference|better|choose|alternatives)\b/)) {
      return {
        type: 'comparison',
        subject: this.extractMainSubject(input),
        specifics: this.extractComparables(input)
      };
    }
    
    // Explanation patterns
    if (lowerInput.match(/\b(what is|what are|define|meaning|concept of)\b/)) {
      return {
        type: 'explanation',
        subject: this.extractMainSubject(input),
        specifics: this.extractSpecifics(input)
      };
    }
    
    // Exploration patterns
    if (lowerInput.match(/\b(explore|investigate|research|find out|discover|trends)\b/)) {
      return {
        type: 'exploration',
        subject: this.extractMainSubject(input),
        specifics: this.extractSpecifics(input)
      };
    }
    
    // Analysis patterns
    if (lowerInput.match(/\b(analyze|analysis|evaluate|assess|examine|study)\b/)) {
      return {
        type: 'analysis',
        subject: this.extractMainSubject(input),
        specifics: this.extractSpecifics(input)
      };
    }
    
    return {
      type: 'general',
      subject: this.extractMainSubject(input),
      specifics: this.extractSpecifics(input)
    };
  }

  private generateLearningGuidance(input: string, intent: any): string {
    const subject = intent.subject;
    
    return `Absolutely! Here's a beginner-friendly roadmap to start learning ${subject}:

## 🎯 **Getting Started with ${subject}**

### **Step 1: Foundation Setup**
${this.generateFoundationSteps(subject)}

### **Step 2: Core Concepts**
${this.generateCoreConcepts(subject)}

### **Step 3: Practice & Application**
${this.generatePracticeSteps(subject)}

### **Step 4: Advanced Learning**
${this.generateAdvancedSteps(subject)}

## 📚 **Recommended Resources**
${this.generateResources(subject)}

## 🎯 **Next Steps**
${this.generateNextSteps(subject)}

Would you like me to help you dive deeper into any specific area, or shall we start with your first hands-on project?`;
  }

  private generateComparisonAnalysis(input: string, intent: any): string {
    const comparables = intent.specifics.length > 1 ? intent.specifics : this.inferComparables(intent.subject);
    
    return `Great question! Here's a comprehensive comparison to help you make an informed decision:

## 🔍 **${intent.subject} Comparison**

### **Key Evaluation Criteria:**
${this.generateEvaluationCriteria(intent.subject)}

### **Detailed Comparison:**
${this.generateDetailedComparison(comparables, intent.subject)}

### **Use Case Recommendations:**
${this.generateUseCaseRecommendations(comparables, intent.subject)}

## 🎯 **My Recommendation**
${this.generateRecommendation(comparables, intent.subject)}

## 📊 **Decision Framework**
${this.generateDecisionFramework(intent.subject)}

Need help with any specific aspect of this comparison, or would you like me to research more detailed information about any particular option?`;
  }

  private generateExplanation(input: string, intent: any): string {
    const subject = intent.subject;
    
    return `Let me break down ${subject} for you in clear, practical terms:

## 💡 **What is ${subject}?**
${this.generateConceptDefinition(subject)}

## 🔍 **Key Components**
${this.generateKeyComponents(subject)}

## 🚀 **How It Works**
${this.generateHowItWorks(subject)}

## 🌟 **Why It Matters**
${this.generateWhyItMatters(subject)}

## 📝 **Simple Example**
${this.generateSimpleExample(subject)}

## 🔗 **Related Concepts**
${this.generateRelatedConcepts(subject)}

Does this help clarify things? I'm happy to dive deeper into any part that interests you or explain how this applies to your specific situation!`;
  }

  private generateExplorationGuide(input: string, intent: any): string {
    const subject = intent.subject;
    
    return `Excellent! Let's explore ${subject} systematically. Here's your research roadmap:

## 🗺️ **${subject} Exploration Guide**

### **Phase 1: Current Landscape**
${this.generateCurrentLandscape(subject)}

### **Phase 2: Key Players & Trends**
${this.generateKeyPlayersAndTrends(subject)}

### **Phase 3: Deep Dive Areas**
${this.generateDeepDiveAreas(subject)}

### **Phase 4: Future Outlook**
${this.generateFutureOutlook(subject)}

## 🔍 **Research Methods**
${this.generateResearchMethods(subject)}

## 📊 **What to Look For**
${this.generateWhatToLookFor(subject)}

## 🎯 **Action Items**
${this.generateActionItems(subject)}

Ready to start with Phase 1, or would you prefer to focus on a specific aspect that caught your attention?`;
  }

  private generateAnalysisFramework(input: string, intent: any): string {
    const subject = intent.subject;
    
    return `Perfect! Let's set up a comprehensive analysis framework for ${subject}:

## 📊 **Analysis Framework for ${subject}**

### **1. Analytical Approach**
${this.generateAnalyticalApproach(subject)}

### **2. Data Collection Strategy**
${this.generateDataCollectionStrategy(subject)}

### **3. Evaluation Metrics**
${this.generateEvaluationMetrics(subject)}

### **4. Analysis Methods**
${this.generateAnalysisMethods(subject)}

### **5. Expected Insights**
${this.generateExpectedInsights(subject)}

## 🎯 **Implementation Plan**
${this.generateImplementationPlan(subject)}

## 📈 **Success Indicators**
${this.generateSuccessIndicators(subject)}

Shall we begin with the data collection phase, or would you like to refine any part of this framework first?`;
  }

  private generateGeneralResearch(input: string, intent: any): string {
    const subject = intent.subject;
    
    return `I'll help you research ${subject} thoroughly! Here's how we can approach this:

## 🔬 **Research Strategy for ${subject}**

### **Understanding Your Goals**
${this.generateGoalUnderstanding(subject)}

### **Research Approach**
${this.generateResearchApproach(subject)}

### **Key Questions to Explore**
${this.generateKeyQuestions(subject)}

### **Information Sources**
${this.generateInformationSources(subject)}

### **Next Steps**
${this.generateGeneralNextSteps(subject)}

What specific aspect of ${subject} would you like to focus on first? I can help you develop a more targeted research plan based on your particular interests or needs.`;
  }

  // Helper methods for generating practical, subject-specific content
  
  private extractMainSubject(input: string): string {
    // Remove common question words and extract the main subject
    let cleaned = input.toLowerCase().trim();
    
    // Remove memory artifacts first
    cleaned = cleaned.replace(/\[?\d{4}-\d{2}-\d{2}t[\d:.z-]+\]?\s*/g, '');
    cleaned = cleaned.replace(/building on what we discussed about\s*/g, '');
    cleaned = cleaned.replace(/continuing from your\s*/g, '');
    cleaned = cleaned.replace(/since you're working on\s*/g, '');
    cleaned = cleaned.replace(/\*\*primary question\*\*:\s*/g, '');
    
    // Remove common question prefixes
    cleaned = cleaned.replace(/^(i want to |i'd like to |how to |what is |tell me about |explain |learn |understand |study |help me )/i, '');
    
    // Handle specific coding patterns
    if (/\b(code|coding|programming|program)\b/.test(cleaned)) {
      if (/\bpython\b/.test(cleaned)) return 'Python programming';
      if (/\bjavascript\b/.test(cleaned)) return 'JavaScript programming';
      if (/\bjava\b/.test(cleaned)) return 'Java programming';
      if (/\bweb\b/.test(cleaned)) return 'web development';
      if (/\bapp\b/.test(cleaned)) return 'app development';
      return 'coding';
    }
    
    // Clean up duplicates and normalize
    cleaned = cleaned.replace(/^(learn |learning |how to )+/gi, '');
    cleaned = cleaned.replace(/\b(code|coding)\b.*\b(code|coding)\b/gi, 'coding');
    cleaned = cleaned.replace(/\b(program|programming)\b.*\b(program|programming)\b/gi, 'programming');
    
    const words = cleaned.split(/\s+/).filter(word => word.length > 0);
    
    // Look for key technical terms, proper nouns, or significant concepts
    const significantWords = words.filter(word => 
      word.length > 2 && 
      !['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'how', 'become', 'need', 'guide', 'beginner'].includes(word)
    );
    
    if (significantWords.length === 0) {
      return 'coding';
    }
    
    // Join up to 2 significant words for a clean subject
    const subject = significantWords.slice(0, 2).join(' ');
    
    // Final cleanup and normalization
    return subject.trim() || 'coding';
  }

  private extractSpecifics(input: string): string[] {
    const words = input.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'i', 'want', 'to', 'how', 'what', 'is'];
    return words.filter(word => word.length > 3 && !stopWords.includes(word)).slice(0, 5);
  }

  private extractComparables(input: string): string[] {
    const vsMatches = input.match(/(.+?)\s+(?:vs|versus|compared to|against)\s+(.+)/i);
    if (vsMatches) {
      return [vsMatches[1].trim(), vsMatches[2].trim()];
    }
    
    const orMatches = input.match(/(.+?)\s+or\s+(.+)/i);
    if (orMatches) {
      return [orMatches[1].trim(), orMatches[2].trim()];
    }
    
    return this.extractSpecifics(input);
  }

  // Content generation methods with practical, subject-specific guidance
  
  private generateFoundationSteps(subject: string): string {
    const subjectLower = subject.toLowerCase();
    
    if (subjectLower.includes('python')) {
      return `• Install Python from python.org (choose the latest stable version)
• Set up a code editor (VS Code, PyCharm, or Sublime Text)
• Learn to use the command line/terminal
• Install pip package manager (usually comes with Python)`;
    }
    
    if (subjectLower.includes('javascript') || subjectLower.includes('web development')) {
      return `• Set up a text editor (VS Code recommended)
• Install Node.js from nodejs.org
• Learn HTML and CSS basics first
• Set up a local development environment`;
    }
    
    if (subjectLower.includes('machine learning') || subjectLower.includes('ai')) {
      return `• Strong foundation in Python programming
• Install Anaconda or Miniconda for package management
• Basic statistics and linear algebra knowledge
• Set up a Jupyter notebook environment`;
    }
    
    return `• Identify the core prerequisites and tools needed
• Set up your development/learning environment
• Gather essential resources and documentation
• Create a dedicated learning space and schedule`;
  }

  private generateCoreConcepts(subject: string): string {
    const subjectLower = subject.toLowerCase();
    
    if (subjectLower.includes('python')) {
      return `• Variables and data types (strings, numbers, lists, dictionaries)
• Control structures (if/else, loops)
• Functions and modules
• Object-oriented programming basics
• Error handling with try/except`;
    }
    
    if (subjectLower.includes('machine learning')) {
      return `• Supervised vs unsupervised learning
• Training and testing data concepts
• Common algorithms (linear regression, decision trees, neural networks)
• Model evaluation and validation
• Feature engineering and data preprocessing`;
    }
    
    return `• Fundamental principles and terminology
• Key concepts and their relationships
• Basic operations and processes
• Common patterns and best practices
• Essential tools and methodologies`;
  }

  private generatePracticeSteps(subject: string): string {
    const subjectLower = subject.toLowerCase();
    
    if (subjectLower.includes('python')) {
      return `• Build a simple calculator program
• Create a to-do list application
• Work with files (reading/writing data)
• Try web scraping with BeautifulSoup
• Build a simple game (like number guessing)`;
    }
    
    if (subjectLower.includes('machine learning')) {
      return `• Start with the Iris dataset classification
• Implement linear regression from scratch
• Use scikit-learn for common algorithms
• Work on a data visualization project
• Try a Kaggle competition for beginners`;
    }
    
    return `• Start with simple, hands-on exercises
• Build small projects to apply concepts
• Work through real-world examples
• Join practice communities or challenges
• Create a portfolio of your work`;
  }

  private generateAdvancedSteps(subject: string): string {
    const subjectLower = subject.toLowerCase();
    
    if (subjectLower.includes('python')) {
      return `• Learn advanced libraries (pandas, numpy, matplotlib)
• Understand decorators and context managers
• Explore web frameworks (Django, Flask)
• Master testing and debugging techniques
• Contribute to open-source projects`;
    }
    
    return `• Explore advanced techniques and methodologies
• Work on complex, multi-faceted projects
• Learn related technologies and integrations
• Participate in professional communities
• Consider specialization areas`;
  }

  private generateResources(subject: string): string {
    const subjectLower = subject.toLowerCase();
    
    if (subjectLower.includes('python')) {
      return `• **Online Courses**: Python.org tutorial, Codecademy, freeCodeCamp
• **Books**: "Automate the Boring Stuff with Python", "Python Crash Course"
• **Practice**: LeetCode, HackerRank, Project Euler
• **Documentation**: Official Python docs, Real Python website
• **Communities**: r/Python, Python Discord, Stack Overflow`;
    }
    
    if (subjectLower.includes('machine learning')) {
      return `• **Courses**: Andrew Ng's ML Course, Fast.ai, Kaggle Learn
• **Books**: "Hands-On Machine Learning", "Pattern Recognition and Machine Learning"
• **Platforms**: Google Colab, Jupyter notebooks, Kaggle
• **Libraries**: scikit-learn, TensorFlow, PyTorch
• **Communities**: r/MachineLearning, ML Twitter, Papers with Code`;
    }
    
    return `• **Official Documentation**: Primary source material and guides
• **Online Courses**: Structured learning platforms and MOOCs
• **Books**: Comprehensive textbooks and practical guides
• **Communities**: Forums, Discord servers, and professional networks
• **Practice Platforms**: Hands-on learning and project sites`;
  }

  private generateNextSteps(subject: string): string {
    return `1. **Start Today**: Pick one concept and spend 30 minutes on it
2. **Build Something**: Apply what you learn immediately through projects
3. **Join a Community**: Find others learning ${subject} for support and motivation
4. **Set Milestones**: Create weekly goals to track your progress
5. **Practice Regularly**: Consistency beats intensity - aim for daily practice

**Ready to begin?** I can help you create a personalized learning plan or guide you through your first project step by step!`;
  }

  private inferComparables(subject: string): string[] {
    const subjectLower = subject.toLowerCase();
    
    if (subjectLower.includes('python')) {
      return ['Python', 'JavaScript', 'Java'];
    }
    if (subjectLower.includes('react')) {
      return ['React', 'Vue', 'Angular'];
    }
    if (subjectLower.includes('database')) {
      return ['MySQL', 'PostgreSQL', 'MongoDB'];
    }
    
    return [subject, 'alternatives'];
  }

  // Simplified implementations for other methods (can be expanded based on specific subjects)
  private generateEvaluationCriteria(subject: string): string {
    return `• **Ease of Learning**: How beginner-friendly is each option?
• **Performance**: Speed and efficiency considerations
• **Community Support**: Documentation, tutorials, and help availability
• **Career Prospects**: Industry demand and job opportunities
• **Ecosystem**: Available libraries, tools, and integrations`;
  }

  private generateDetailedComparison(comparables: string[], subject: string): string {
    return comparables.map((item, index) => 
      `**${item}:**
• Strengths: [Key advantages and use cases]
• Weaknesses: [Limitations and challenges] 
• Best For: [Ideal scenarios and applications]`
    ).join('\n\n');
  }

  private generateUseCaseRecommendations(comparables: string[], subject: string): string {
    return `• **For Beginners**: [Most beginner-friendly option with reasoning]
• **For Performance**: [Best option when speed/efficiency is critical]
• **For Large Projects**: [Most suitable for enterprise-level applications]
• **For Quick Prototyping**: [Fastest to get started and build MVPs]`;
  }

  private generateRecommendation(comparables: string[], subject: string): string {
    return `Based on current trends and practical considerations, I'd recommend **${comparables[0] || subject}** for most beginners because:

• It has excellent learning resources and community support
• It's versatile and applicable to many different projects
• There's strong industry demand and career opportunities
• The learning curve is manageable for newcomers

However, the best choice ultimately depends on your specific goals and context. What are you hoping to achieve with ${subject}?`;
  }

  private generateDecisionFramework(subject: string): string {
    return `**Ask Yourself:**
1. What's my primary goal? (learning, career change, specific project)
2. How much time can I dedicate to learning?
3. Do I have any prior experience in related areas?
4. What kind of projects do I want to build?
5. Are there specific industry requirements I need to meet?

**Your answers will help determine the best path forward!**`;
  }

  // Simplified implementations for other template methods
  private generateConceptDefinition(subject: string): string {
    return `${subject} is [practical definition with real-world context and applications].`;
  }

  private generateKeyComponents(subject: string): string {
    return `• Component 1: [Brief description and purpose]
• Component 2: [Brief description and purpose]
• Component 3: [Brief description and purpose]`;
  }

  private generateHowItWorks(subject: string): string {
    return `Here's a simplified overview of how ${subject} works in practice: [step-by-step process with concrete examples].`;
  }

  private generateWhyItMatters(subject: string): string {
    return `${subject} is important because it [real-world impact and practical benefits for users].`;
  }

  private generateSimpleExample(subject: string): string {
    return `**Real-world example:** [Concrete, relatable example that demonstrates the concept in action].`;
  }

  private generateRelatedConcepts(subject: string): string {
    return `• Related Concept 1: [Brief explanation]
• Related Concept 2: [Brief explanation]
• Related Concept 3: [Brief explanation]`;
  }

  // Additional helper methods with simplified implementations
  private generateCurrentLandscape(subject: string): string {
    return `Current state of ${subject}: [overview of current trends, key players, and developments]`;
  }

  private generateKeyPlayersAndTrends(subject: string): string {
    return `Key players and trends in ${subject}: [important companies, technologies, and emerging patterns]`;
  }

  private generateDeepDiveAreas(subject: string): string {
    return `Areas worth exploring in depth: [specific aspects that warrant detailed investigation]`;
  }

  private generateFutureOutlook(subject: string): string {
    return `Future outlook for ${subject}: [predictions and emerging opportunities]`;
  }

  private generateResearchMethods(subject: string): string {
    return `Research methods for ${subject}: [specific approaches and methodologies to investigate this topic]`;
  }

  private generateWhatToLookFor(subject: string): string {
    return `Key indicators to watch: [metrics, signals, and patterns that matter for ${subject}]`;
  }

  private generateActionItems(subject: string): string {
    return `Immediate action items: [specific steps you can take to deepen your understanding]`;
  }

  private generateAnalyticalApproach(subject: string): string {
    return `Analytical approach for ${subject}: [systematic methodology for analysis]`;
  }

  private generateDataCollectionStrategy(subject: string): string {
    return `Data collection strategy: [sources and methods for gathering relevant information]`;
  }

  private generateEvaluationMetrics(subject: string): string {
    return `Key metrics to evaluate: [quantitative and qualitative measures]`;
  }

  private generateAnalysisMethods(subject: string): string {
    return `Analysis methods: [specific techniques and tools for examination]`;
  }

  private generateExpectedInsights(subject: string): string {
    return `Expected insights: [types of findings and conclusions you can anticipate]`;
  }

  private generateImplementationPlan(subject: string): string {
    return `Implementation plan: [step-by-step approach to executing the analysis]`;
  }

  private generateSuccessIndicators(subject: string): string {
    return `Success indicators: [how you'll know the analysis is complete and valuable]`;
  }

  private generateGoalUnderstanding(subject: string): string {
    return `Understanding your research goals for ${subject}: [framework for clarifying objectives]`;
  }

  private generateResearchApproach(subject: string): string {
    return `Research approach: [systematic methodology tailored to ${subject}]`;
  }

  private generateKeyQuestions(subject: string): string {
    return `Key questions to explore: [important questions that will guide your research]`;
  }

  private generateInformationSources(subject: string): string {
    return `Information sources: [reliable sources for researching ${subject}]`;
  }

  private generateGeneralNextSteps(subject: string): string {
    return `Next steps for researching ${subject}: [immediate actions you can take]`;
  }

  private async handleClarificationRequest(
    input: string,
    clarificationResult: any,
    memoryContext: any,
    contextString: string
  ): Promise<{ message: string }> {
    const questions = generateClarifyingQuestions(clarificationResult, 'research', input);
    
    // Create research-focused clarification message
    let clarificationMessage = '🔬 **Research Agent**: I\'d love to help with your research, but I need some clarification to provide the most valuable analysis.\n\n';
    
    // Add reason-specific context for research
    switch (clarificationResult.reason) {
      case 'vague_input':
        clarificationMessage += 'Your research request is quite broad - could you help me focus on the specific area you\'d like to investigate?\n\n';
        break;
      case 'missing_subject':
        clarificationMessage += 'I\'m not sure what topic you\'d like me to research - could you specify the subject area?\n\n';
        break;
      case 'underspecified_goal':
        clarificationMessage += 'I can see you want research done, but I\'m not clear on what type of analysis or outcome you\'re looking for.\n\n';
        break;
      case 'ambiguous_context':
        clarificationMessage += 'I need more context to understand what research focus would be most helpful.\n\n';
        break;
    }
    
    // Add research-specific clarifying questions
    if (questions.length > 0) {
      clarificationMessage += 'To provide thorough research, could you clarify:\n\n';
      questions.forEach((question, index) => {
        clarificationMessage += `• ${question}\n`;
      });
      clarificationMessage += '\n';
    }
    
    // Add memory context if available
    if (contextString && contextString.trim()) {
      clarificationMessage += '📚 **Based on our previous research**, I can build on what we\'ve already discussed. Feel free to reference any prior topics or continue from where we left off.\n\n';
    }
    
    clarificationMessage += 'Once I understand your research needs better, I can provide comprehensive analysis, structured frameworks, and actionable insights!';
    
    return {
      message: clarificationMessage
    };
  }

  private async logInteraction(message: AgentMessage): Promise<void> {
    await this.memoryManager.logMessage(message);
  }

  private generateId(): string {
    return `research_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    
    // Research domain detection
    if (lowerInput.includes('research') || lowerInput.includes('study') || lowerInput.includes('investigate')) {
      return 'research methodology';
    }
    if (lowerInput.includes('data') || lowerInput.includes('analytics') || lowerInput.includes('analysis')) {
      return 'data analysis';
    }
    if (lowerInput.includes('technology') || lowerInput.includes('tech') || lowerInput.includes('software')) {
      return 'technology';
    }
    if (lowerInput.includes('science') || lowerInput.includes('scientific')) {
      return 'scientific research';
    }
    if (lowerInput.includes('business') || lowerInput.includes('market') || lowerInput.includes('industry')) {
      return 'business research';
    }
    
    return undefined;
  }
}