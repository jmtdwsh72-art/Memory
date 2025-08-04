import { MemoryManager } from './memory-manager';
import { researchClarification } from '../agents/agent-research.config';
import { creativeClarification } from '../agents/agent-creative.config';
import { automationClarification } from '../agents/agent-automation.config';
import { routerClarification } from '../agents/agent-router.config';

export interface ClarificationContext {
  input: string;
  agentId: string;
  userId?: string;
  sessionId?: string;
  confidence: number;
  previousMessages?: any[];
}

export interface ClarificationResponse {
  shouldClarify: boolean;
  questions: string[];
  context?: any;
}

// Agent clarification handlers registry
const CLARIFICATION_HANDLERS = {
  research: researchClarification,
  creative: creativeClarification,
  automation: automationClarification,
  router: routerClarification,
  general: routerClarification, // General uses router clarification
};

export class ConversationalHandler {
  private memoryManager: MemoryManager;
  
  constructor() {
    this.memoryManager = new MemoryManager();
  }

  /**
   * Determine if agent should ask clarifying questions
   */
  shouldAskClarification(context: ClarificationContext): ClarificationResponse {
    const { input, agentId, confidence } = context;
    
    // Don't ask clarification for very clear requests
    if (confidence > 0.85) {
      return { shouldClarify: false, questions: [] };
    }
    
    // Check if it's a follow-up to a recent clarification
    if (this.isFollowUpResponse(input)) {
      return { shouldClarify: false, questions: [] };
    }
    
    // Check if user has provided enough context
    const contextLevel = this.assessContextLevel(input);
    if (contextLevel === 'high') {
      return { shouldClarify: false, questions: [] };
    }
    
    // For medium confidence with low context, ask clarification
    if (confidence < 0.7 && contextLevel === 'low') {
      const handler = CLARIFICATION_HANDLERS[agentId as keyof typeof CLARIFICATION_HANDLERS];
      if (handler) {
        const questions = handler.clarifyUserIntent(input, context);
        return {
          shouldClarify: true,
          questions,
          context: { agentId, confidence, contextLevel }
        };
      }
    }
    
    return { shouldClarify: false, questions: [] };
  }

  /**
   * Save user goals to memory after clarification
   */
  async saveUserGoal(agentId: string, goalType: string, details: string, tags: string[] = []) {
    const handler = CLARIFICATION_HANDLERS[agentId as keyof typeof CLARIFICATION_HANDLERS];
    if (handler) {
      const memoryEntry = handler.saveUserGoal(goalType, details, tags);
      
      // Note: Actual memory saving is handled by individual agents using useAgentMemory
      // This method returns the formatted memory entry for agents to save
      return { success: true, memoryEntry };
    }
    
    return { success: false, error: 'No handler found for agent' };
  }

  /**
   * Check if input is a follow-up response to clarification
   */
  private isFollowUpResponse(input: string): boolean {
    const followUpIndicators = [
      'yes', 'no', 'exactly', 'that\'s right', 'correct',
      'actually', 'specifically', 'to clarify', 'what i mean',
      'let me explain', 'i meant', 'more specifically'
    ];
    
    return followUpIndicators.some(indicator => 
      input.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Assess the context level of user input
   */
  private assessContextLevel(input: string): 'low' | 'medium' | 'high' {
    // Simple heuristic based on input length and specificity
    const words = input.split(' ').length;
    const hasSpecificTerms = /\b(specific|detailed|exactly|precisely|particular)\b/i.test(input);
    const hasContextClues = /\b(because|for|since|in order to|so that)\b/i.test(input);
    
    if (words > 20 || (hasSpecificTerms && hasContextClues)) {
      return 'high';
    } else if (words > 10 || hasSpecificTerms || hasContextClues) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate contextual acknowledgment based on agent type and user intent
   */
  generateAcknowledgment(agentId: string, intent?: any): string {
    const acknowledgments = {
      research: [
        "Great question! I'd love to help you explore that.",
        "Interesting topic! Let me help you dive deeper.",
        "I can definitely help you research that.",
      ],
      creative: [
        "What a creative challenge! I'm excited to help.",
        "I love helping with creative projects!",
        "Let's brainstorm something amazing together!",
      ],
      automation: [
        "Perfect! I can help streamline that for you.",
        "Let's automate that process efficiently.",
        "I'll help you optimize your workflow.",
      ],
      router: [
        "I'm here to help! Let me connect you with the right specialist.",
        "I can handle that directly or route you to an expert.",
        "Let's get you the best assistance for this task.",
      ]
    };
    
    const agentAcknowledgments = acknowledgments[agentId as keyof typeof acknowledgments] || acknowledgments.router;
    return agentAcknowledgments[Math.floor(Math.random() * agentAcknowledgments.length)];
  }

  /**
   * Format clarification questions for display
   */
  formatClarificationQuestions(questions: string[], agentId: string): string {
    const agentNames = {
      research: 'Research Agent',
      creative: 'Creative Agent', 
      automation: 'Automation Agent',
      router: 'General Agent'
    };
    
    const agentName = agentNames[agentId as keyof typeof agentNames] || 'Assistant';
    
    if (questions.length === 1) {
      return `${agentName} asks: "${questions[0]}"`;
    } else if (questions.length > 1) {
      const questionList = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
      return `${agentName} has a few questions to help you better:\n\n${questionList}`;
    }
    
    return '';
  }
}