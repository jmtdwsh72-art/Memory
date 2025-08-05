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
import { composeFinalResponse, FinalResponseContext, assessSessionComplexity, shouldOfferMemoryStorage } from '../utils/final-response-composer';
import { generateAgentResponse } from '../utils/agent-core-response';

export class AutomationAgent {
  private config: AgentConfig;
  private memoryManager: MemoryManager;

  constructor() {
    this.config = getAgentConfig('automation');
    this.memoryManager = new MemoryManager();
  }

  async processInput(input: string, userId?: string, routingMetadata?: any): Promise<AgentResponse> {
    try {
      const memory = useAgentMemoryWithPreset(this.config.id, 'automation', userId);
      const memoryContext = await memory.recallWithPreset(input);
      const contextString = memory.buildContext(memoryContext);
      
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
      
      const goalProgress = detectGoalProgress(input, memoryContext.entries);
      if (goalProgress.status) {
        const progressMemory = createGoalProgressMemory(input, goalProgress, this.config.id, userId);
        await memory.saveMemory(
          progressMemory.input || input,
          progressMemory.summary || '',
          progressMemory.context || '',
          'goal_progress',
          progressMemory.tags || []
        );
        
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
      
      if (!goalProgressMessage && !feedbackAcknowledgment && !routingMetadata?.isContinuation) {
        const greeting = getStatusAwareGreeting(memoryContext.entries, this.config.id);
        if (greeting) {
          statusGreeting = greeting;
        }
      }
      
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
            sessionAnalysis: true
          }
        };
      }
      
      if (detectSaveSummaryRequest(input)) {
        const sessionSummary = generateSessionSummary(memoryContext.entries, { 
          agentId: this.config.id,
          includeMetadata: true 
        });
        
        await memory.saveMemory(
          'Session Summary Request',
          sessionSummary,
          `Automation session summary generated on ${new Date().toLocaleDateString()}`,
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
            summarySaved: true
          }
        };
      }
      
      const consulting = getConsultingPatterns('automation');
      const injectedContext = ContextInjector.injectMemoryAwareness({
        agentId: this.config.id,
        input,
        memoryContext,
        routingMetadata,
        userId
      });
      
      if (!routingMetadata?.isContinuation && !routingMetadata?.awaitingClarification && !adjustedReasoningLevel) {
        const clarificationResult = detectClarificationNeed(input, memoryContext.entries, contextString.length > 0);
        
        if (clarificationResult.needsClarification) {
          const clarificationMemory = createClarificationMemory(input, clarificationResult, this.config.id);
          await memory.saveMemory(
            clarificationMemory.input || input,
            clarificationMemory.summary || '',
            clarificationMemory.summary || '',
            'pattern',
            ['clarification_requested', clarificationResult.reason || 'vague', 'automation']
          );
          
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
              clarificationReason: clarificationResult.reason,
              confidence: clarificationResult.confidence
            }
          };
        }
      }
      
      const finalReasoningLevel: ReasoningLevel = adjustedReasoningLevel || getReasoningLevel(input, memoryContext.entries, 'automation');
      
      const response = await this.buildPlannedAutomationResponse(input, {
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
      
      sessionTracker.setLastResponse(
        sessionUserId,
        this.config.id,
        response,
        finalReasoningLevel,
        { taskType: 'automation', confidence: 0.8 }
      );
      
      await memory.saveMemory(
        input, 
        response, 
        `automation_response: ${input.slice(0, 50)}... | reasoning: ${finalReasoningLevel}`,
        'goal',
        ['automation', 'automation_goal', `reasoning_${finalReasoningLevel}`]
      );

      await this.logInteraction({
        id: this.generateId(),
        timestamp: new Date(),
        agentName: this.config.id,
        input,
        output: response,
        memoryUsed: memoryContext.entries.map(m => m.id)
      });

      const recentGoal = await this.getRecentGoal(memoryContext.entries);
      const isSessionEnding = detectSessionEnding(input);
      const shouldOfferSummaryFlag = shouldOfferSummary(memoryContext.entries);
      
      const finalResponseContext: FinalResponseContext = {
        recentGoal,
        reasoningLevel: finalReasoningLevel,
        feedbackType: null,
        isSessionEnd: isSessionEnding,
        agentPersonality: 'automation',
        knowledgeDomain: this.extractKnowledgeDomain(input),
        userInput: input,
        hasMemoryContext: memoryContext.entries.length > 0,
        sessionComplexity: assessSessionComplexity({
          recentGoal,
          reasoningLevel: finalReasoningLevel,
          feedbackType: null,
          isSessionEnd: isSessionEnding,
          agentPersonality: 'automation',
          knowledgeDomain: this.extractKnowledgeDomain(input),
          userInput: input,
          hasMemoryContext: memoryContext.entries.length > 0
        })
      };

      // Skip template closings - they're now handled in generateAgentResponse
      const finalResponse = response;

      return {
        success: true,
        message: finalResponse,
        memoryUpdated: true,
        metadata: {
          agentId: this.config.id,
          hasMemoryContext: memoryContext.entries.length > 0,
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

  private async buildPlannedAutomationResponse(input: string, options: {
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
    const memoryStrings = options.memoryContext.entries
      .slice(0, 3)
      .map((entry: any) => entry.summary || '')
      .filter((s: string) => s.length > 0);
    
    const coreResponse = await generateAgentResponse({
      userInput: input,
      memoryContext: memoryStrings,
      agentType: 'automation',
      personality: 'directive'
    });
    
    const prefixes = [];
    if (options.statusGreeting) prefixes.push(options.statusGreeting);
    if (options.feedbackAcknowledgment) prefixes.push(options.feedbackAcknowledgment);
    if (options.goalProgressMessage) prefixes.push(options.goalProgressMessage);
    
    if (prefixes.length > 0) {
      return prefixes.join('\n\n') + '\n\n' + coreResponse;
    }
    
    return coreResponse;
  }

  private async generateResponse(input: string, memoryContext: string): Promise<string> {
    const taskType = this.identifyTaskType(input);
    let response = '';

    switch (taskType) {
      case 'automation':
        response = this.generateWorkflowAutomation(input);
        break;
      case 'integration':
        response = this.generateIntegrationSolution(input);
        break;  
      default:
        response = this.generateGeneralAutomation(input);
        break;
    }

    if (memoryContext && memoryContext.trim()) {
      response += `\n\n📋 **Related Process History:**\n${memoryContext}`;
    }
    
    return response;
  }

  private identifyTaskType(input: string): string {
    const lowerInput = input.toLowerCase().trim();
    
    if (lowerInput.match(/\b(automate|automation|workflow|process|streamline|optimize)\b/)) {
      return 'automation';
    }
    
    if (lowerInput.match(/\b(integrate|connect|sync|api|webhook)\b/)) {
      return 'integration';
    }
    
    return 'general';
  }

  private generateWorkflowAutomation(input: string): string {
    return `Here's how I can help automate your workflow:

## 🔄 **Process Analysis**
I'll map out your current process to identify automation opportunities and bottlenecks.

## ⚙️ **Automation Strategy**
- **Trigger Events**: What starts the process?  
- **Decision Points**: Where human judgment is needed vs. automated  
- **Data Flow**: How information moves through each step  
- **Output Goals**: What successful completion looks like  

## 🛠️ **Implementation Options**
- **Low-Code Solutions**: Zapier, Microsoft Power Automate, IFTTT
- **API Integrations**: Connect your existing tools seamlessly  
- **Custom Scripts**: Python, JavaScript, or other automation scripts  
- **Workflow Platforms**: GitHub Actions, Jenkins, or similar CI/CD tools  

What specific workflow would you like to automate first?`;
  }

  private generateIntegrationSolution(input: string): string {
    return `Let's connect your systems efficiently:

## 🔗 **Integration Strategy**

### **Assessment Phase**
- Current tools and platforms in use  
- Data formats and compatibility requirements  
- Security and permission considerations  

### **Connection Methods**
- **APIs**: Direct system-to-system communication  
- **Webhooks**: Real-time event-driven updates  
- **File Sync**: Automated data transfers  

Which systems are you looking to connect?`;
  }

  private generateGeneralAutomation(input: string): string {
    return `Let me help you automate this process:

## 🎯 **Automation Approach**

### **Discovery Questions**
- What manual steps are you currently doing?  
- How often does this process need to run?  
- What tools and systems are involved?  

### **Quick Wins**
- Eliminate repetitive data entry  
- Automate file organization and transfers  
- Set up automatic notifications and reminders  

What specific task would benefit most from automation?`;
  }

  private async handleClarificationRequest(
    input: string,
    clarificationResult: any,
    memoryContext: any,
    contextString: string
  ): Promise<{ message: string }> {
    const questions = generateClarifyingQuestions(clarificationResult, 'automation', input);
    
    let clarificationMessage = '⚙️ **Automation Agent**: I\'d love to help streamline your process, but I need some clarification to design the most effective automation.\n\n';
    
    switch (clarificationResult.reason) {
      case 'vague_input':
        clarificationMessage += 'Your automation request is quite broad - could you help me focus on the specific process you\'d like to optimize?\n\n';
        break;
      case 'missing_subject':
        clarificationMessage += 'I\'m not sure what process you\'d like me to automate - could you specify the workflow or task?\n\n';
        break;
      case 'underspecified_goal':
        clarificationMessage += 'I can see you want automation, but I\'m not clear on what type of process or outcome you\'re looking for.\n\n';
        break;
      case 'ambiguous_context':
        clarificationMessage += 'I need more context to understand what automation approach would be most helpful.\n\n';
        break;
    }
    
    if (questions.length > 0) {
      clarificationMessage += 'To design effective automation, could you clarify:\n\n';
      questions.forEach((question, index) => {
        clarificationMessage += `• ${question}\n`;
      });
      clarificationMessage += '\n';
    }
    
    if (contextString && contextString.trim()) {
      clarificationMessage += '🔧 **Based on our previous automation work**, I can build on what we\'ve already discussed. Feel free to reference any prior processes or continue from where we left off.\n\n';
    }
    
    clarificationMessage += 'Once I understand your automation needs better, I can provide streamlined solutions, implementation plans, and actionable next steps!';
    
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

  private async getRecentGoal(memoryEntries: MemoryEntry[]): Promise<string | undefined> {
    const goalEntries = memoryEntries
      .filter(entry => entry.type === 'goal' || entry.type === 'goal_progress')
      .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
    
    return goalEntries.length > 0 ? goalEntries[0].goalSummary || goalEntries[0].summary : undefined;
  }

  private extractKnowledgeDomain(input: string): string | undefined {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('workflow') || lowerInput.includes('process') || lowerInput.includes('automate')) {
      return 'process automation';
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