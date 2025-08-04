import { MemoryManager } from './memory-manager';

export interface ConversationState {
  stage: 'initial' | 'clarifying' | 'responding';
  clarificationAsked: boolean;
  userContext?: Record<string, any>;
}

export class ConversationalBehavior {
  private memoryManager: MemoryManager;
  
  constructor() {
    this.memoryManager = new MemoryManager();
  }

  /**
   * Analyzes if the agent should ask clarifying questions based on input
   */
  shouldAskClarification(
    input: string,
    intentConfidence: number,
    userId?: string
  ): boolean {
    // Don't ask clarification for very clear requests
    if (intentConfidence > 0.85) return false;
    
    // Check if it's a follow-up to a recent clarification
    if (this.isFollowUpResponse(input)) return false;
    
    // Check if user has provided enough context
    const contextLevel = this.assessContextLevel(input);
    if (contextLevel === 'high') return false;
    
    // For medium confidence with low context, ask clarification
    return intentConfidence < 0.7 && contextLevel === 'low';
  }

  /**
   * Generates a conversational acknowledgment for the user's request
   */
  generateAcknowledgment(agentType: string, intent: any): string {
    const acknowledgments = {
      research: [
        "Great question! I'd love to help you explore that.",
        "Interesting topic! Let me help you dive deeper.",
        "I can definitely help you research that.",
      ],
      creative: [
        "What a creative challenge! I'm excited to help.",
        "I love helping with creative projects!",
        "That sounds like a fun creative task!",
      ],
      automation: [
        "I can help you streamline that process!",
        "Let's work on making that more efficient.",
        "Great idea for automation!",
      ],
    };

    const agentAcks = acknowledgments[agentType as keyof typeof acknowledgments] || [
      "I'd be happy to help with that!",
      "Let me assist you with that.",
    ];

    return agentAcks[Math.floor(Math.random() * agentAcks.length)];
  }

  /**
   * Generates clarifying questions based on the agent type and intent
   */
  generateClarifyingQuestions(
    agentType: string,
    input: string,
    intent: any
  ): string[] {
    const questions: string[] = [];

    switch (agentType) {
      case 'research':
        questions.push(...this.getResearchClarifications(input, intent));
        break;
      case 'creative':
        questions.push(...this.getCreativeClarifications(input, intent));
        break;
      case 'automation':
        questions.push(...this.getAutomationClarifications(input, intent));
        break;
    }

    return questions.slice(0, 2); // Return max 2 questions
  }

  private getResearchClarifications(input: string, intent: any): string[] {
    const questions: string[] = [];
    const lowerInput = input.toLowerCase();

    // Depth clarification
    if (!lowerInput.includes('beginner') && !lowerInput.includes('advanced') && !lowerInput.includes('expert')) {
      questions.push("What's your current knowledge level on this topic - are you a complete beginner or do you have some background?");
    }

    // Scope clarification
    if (intent.subject && !lowerInput.includes('specific') && !lowerInput.includes('general')) {
      questions.push(`Are you looking for a broad overview of ${intent.subject} or something more specific?`);
    }

    // Purpose clarification
    if (!lowerInput.includes('project') && !lowerInput.includes('homework') && !lowerInput.includes('curiosity')) {
      questions.push("Is this for a specific project, academic work, or general learning?");
    }

    return questions;
  }

  private getCreativeClarifications(input: string, intent: any): string[] {
    const questions: string[] = [];
    const lowerInput = input.toLowerCase();

    // Style/tone clarification
    if (lowerInput.includes('name') || lowerInput.includes('brand')) {
      questions.push("What style or tone are you going for - professional, playful, modern, classic?");
    }

    // Audience clarification
    if (!lowerInput.includes('audience') && !lowerInput.includes('for')) {
      questions.push("Who is your target audience or who will be using this?");
    }

    // Constraints clarification
    questions.push("Are there any specific requirements or constraints I should know about?");

    return questions;
  }

  private getAutomationClarifications(input: string, intent: any): string[] {
    const questions: string[] = [];
    const lowerInput = input.toLowerCase();

    // Current process clarification
    questions.push("Can you describe your current process or workflow?");

    // Scale clarification
    if (!lowerInput.includes('daily') && !lowerInput.includes('weekly') && !lowerInput.includes('monthly')) {
      questions.push("How often do you need to do this task - daily, weekly, or occasionally?");
    }

    // Tools clarification
    questions.push("What tools or systems are you currently using?");

    return questions;
  }

  /**
   * Formats the conversational response with acknowledgment and questions
   */
  formatConversationalResponse(
    acknowledgment: string,
    clarifyingQuestions: string[]
  ): string {
    let response = acknowledgment;
    
    if (clarifyingQuestions.length > 0) {
      response += " Just to make sure I give you the best help possible:\n\n";
      response += clarifyingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n');
    }

    return response;
  }

  /**
   * Checks if this is likely a follow-up response to a clarification
   */
  private isFollowUpResponse(input: string): boolean {
    const lowerInput = input.toLowerCase();
    const followUpIndicators = [
      'yes', 'no', 'beginner', 'advanced', 'intermediate',
      'project', 'homework', 'learning', 'professional',
      'playful', 'modern', 'classic', 'daily', 'weekly'
    ];

    // Very short responses are likely follow-ups
    if (input.split(' ').length < 5) {
      return followUpIndicators.some(indicator => lowerInput.includes(indicator));
    }

    return false;
  }

  /**
   * Assesses the context level provided in the input
   */
  private assessContextLevel(input: string): 'low' | 'medium' | 'high' {
    const wordCount = input.split(' ').filter(w => w.length > 0).length;
    
    // Very short inputs have low context
    if (wordCount < 5) return 'low';
    
    // Long inputs usually have high context
    if (wordCount > 20) return 'high';
    
    // Check for context indicators
    const contextIndicators = [
      'for', 'because', 'to', 'in order to', 'specifically',
      'about', 'regarding', 'concerning', 'need', 'want'
    ];
    
    const hasContextIndicators = contextIndicators.some(indicator => 
      input.toLowerCase().includes(indicator)
    );
    
    return hasContextIndicators ? 'medium' : 'low';
  }

  /**
   * Checks if the user has recently had a conversation with this agent
   */
  async checkRecentInteraction(
    agentId: string,
    userId?: string,
    timeWindowMinutes: number = 5
  ): Promise<boolean> {
    if (!userId) return false;

    try {
      const recentMemories = await this.memoryManager.searchMemory(
        agentId,
        'conversation',
        3
      );

      const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
      return recentMemories.some(memory => 
        memory.lastAccessed > cutoffTime
      );
    } catch (error) {
      console.error('[ConversationalBehavior] Error checking recent interaction:', error);
      return false;
    }
  }
}