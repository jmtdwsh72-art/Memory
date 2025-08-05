/**
 * Smart Closing Generator
 * 
 * Generates appropriate, context-aware closings that avoid redundancy
 * and adapt to the conversation flow and user intent.
 */

import { MemoryContext, MemoryEntry } from './types';
import { ReasoningLevel } from './reasoning-depth';

export interface SmartClosingOptions {
  agentId: string;
  input: string;
  memoryContext: MemoryContext;
  reasoningLevel: ReasoningLevel;
  confidence: number;
  sessionLength?: number;
  isSessionEnding?: boolean;
  hasAnsweredQuestion?: boolean;
}

export interface SmartClosingResult {
  closing: string;
  shouldInclude: boolean;
  reason: string;
}

/**
 * Generate smart, context-aware closing for agent responses
 */
export function generateSmartClosing(options: SmartClosingOptions): SmartClosingResult {
  const { 
    agentId, 
    input, 
    memoryContext, 
    reasoningLevel, 
    confidence, 
    sessionLength = 1,
    isSessionEnding = false,
    hasAnsweredQuestion = false
  } = options;

  // Check if closing should be suppressed
  const suppressionResult = shouldSuppressClosing(options);
  if (suppressionResult.suppress) {
    return {
      closing: '',
      shouldInclude: false,
      reason: suppressionResult.reason
    };
  }

  // Generate appropriate closing based on context
  const closing = generateContextualClosing(options);
  
  return {
    closing,
    shouldInclude: true,
    reason: 'Generated contextual closing'
  };
}

/**
 * Check if closing should be suppressed based on context
 */
function shouldSuppressClosing(options: SmartClosingOptions): { suppress: boolean; reason: string } {
  const { input, confidence, sessionLength, hasAnsweredQuestion, reasoningLevel } = options;

  // Suppress if user is clearly ending the session
  if (detectGoodbyeIntent(input)) {
    return { suppress: true, reason: 'User ending session' };
  }

  // Suppress redundant "Ready to begin?" if we just provided a comprehensive guide
  if (hasAnsweredQuestion && reasoningLevel === 'basic' && confidence >= 0.8) {
    if (/\b(learn|learning|start|begin|guide)\b/i.test(input)) {
      return { suppress: true, reason: 'Comprehensive answer provided, closing redundant' };
    }
  }

  // Suppress generic follow-ups for very short sessions with complete answers
  if (sessionLength <= 2 && confidence >= 0.9 && hasAnsweredQuestion) {
    return { suppress: true, reason: 'Complete answer in short session' };
  }

  // Suppress if input was very specific and we gave a specific answer
  if (confidence >= 0.9 && input.length > 50 && hasAnsweredQuestion) {
    return { suppress: true, reason: 'Specific question with complete answer' };
  }

  return { suppress: false, reason: 'Closing appropriate' };
}

/**
 * Generate contextual closing based on agent and context
 */
function generateContextualClosing(options: SmartClosingOptions): string {
  const { agentId, input, reasoningLevel, confidence, memoryContext } = options;

  const isCodingQuery = /\b(code|coding|programming|python|javascript|java|web|app)\b/i.test(input);
  const isLearningQuery = /\b(learn|learning|teach|study|understand|beginner|guide)\b/i.test(input);

  // Special handling for coding/learning queries
  if (isCodingQuery && isLearningQuery && reasoningLevel === 'basic') {
    return getCodingLearningClosing(confidence);
  }

  // Agent-specific closings
  switch (agentId) {
    case 'research':
      return getResearchClosing(confidence, reasoningLevel);
    case 'creative':
      return getCreativeClosing(confidence);
    case 'automation':
      return getAutomationClosing(confidence);
    default:
      return getGenericClosing(confidence);
  }
}

/**
 * Get coding/learning specific closing
 */
function getCodingLearningClosing(confidence: number): string {
  if (confidence >= 0.8) {
    const closings = [
      "**Ready to start with your first project?**",
      "**Want me to create a personalized learning plan for you?**",
      "**Should I recommend some beginner-friendly resources to get you started?**"
    ];
    return selectRandom(closings);
  } else {
    const closings = [
      "**What specific area of coding interests you most?**",
      "**Would you like me to suggest a good starting language for your goals?**"
    ];
    return selectRandom(closings);
  }
}

/**
 * Get research agent closing
 */
function getResearchClosing(confidence: number, reasoningLevel: ReasoningLevel): string {
  if (confidence >= 0.8) {
    if (reasoningLevel === 'basic') {
      const closings = [
        "**Want me to dive deeper into any specific area?**",
        "**Ready to explore this topic further?**"
      ];
      return selectRandom(closings);
    } else if (reasoningLevel === 'advanced') {
      const closings = [
        "**Shall I analyze the technical implications or edge cases?**",
        "**Want me to explore the theoretical foundations deeper?**"
      ];
      return selectRandom(closings);
    } else {
      const closings = [
        "**Ready to explore related research questions?**",
        "**Should I dive deeper into any particular aspect?**"
      ];
      return selectRandom(closings);
    }
  } else {
    const closings = [
      "**What specific aspect would you like me to focus on?**",
      "**Would you like me to clarify any particular area?**"
    ];
    return selectRandom(closings);
  }
}

/**
 * Get creative agent closing
 */
function getCreativeClosing(confidence: number): string {
  if (confidence >= 0.8) {
    const closings = [
      "**Ready to brainstorm more creative possibilities?**",
      "**Want to explore a different creative angle?**",
      "**Should we develop any of these ideas further?**"
    ];
    return selectRandom(closings);
  } else {
    const closings = [
      "**What creative direction feels most inspiring to you?**",
      "**Want to explore any wild, unconventional approaches?**"
    ];
    return selectRandom(closings);
  }
}

/**
 * Get automation agent closing
 */
function getAutomationClosing(confidence: number): string {
  if (confidence >= 0.8) {
    const closings = [
      "**Should we test this automation with a real scenario?**",
      "**Want me to create a checklist or template for this process?**",
      "**Ready to optimize the next bottleneck in your workflow?**"
    ];
    return selectRandom(closings);
  } else {
    const closings = [
      "**What specific process would you like to automate?**",
      "**Would you like me to map out your current workflow first?**"
    ];
    return selectRandom(closings);
  }
}

/**
 * Get generic closing
 */
function getGenericClosing(confidence: number): string {
  if (confidence >= 0.8) {
    const closings = [
      "**Want me to explore this topic further?**",
      "**Ready to dive deeper into any specific area?**"
    ];
    return selectRandom(closings);
  } else {
    const closings = [
      "**What would you like me to focus on specifically?**",
      "**Would you like me to clarify anything?**"
    ];
    return selectRandom(closings);
  }
}

/**
 * Detect if user input suggests they're ending the session
 */
function detectGoodbyeIntent(input: string): boolean {
  const lowerInput = input.toLowerCase();
  const goodbyePatterns = [
    'goodbye', 'bye', 'see you', 'thanks for', 'that\'s all', 'that\'s everything',
    'done for now', 'talk later', 'until next time', 'catch you later', 'thanks!',
    'perfect', 'great, thanks', 'that helps', 'got it'
  ];
  
  return goodbyePatterns.some(pattern => lowerInput.includes(pattern));
}

/**
 * Select random item from array
 */
function selectRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Check if input appears to be answered comprehensively
 */
export function detectComprehensiveAnswer(input: string, responseLength: number, confidence: number): boolean {
  const isLearningQuery = /\b(learn|learning|how to|guide|tutorial|start)\b/i.test(input);
  const isLongResponse = responseLength > 1000;
  const isHighConfidence = confidence >= 0.8;
  
  return isLearningQuery && isLongResponse && isHighConfidence;
}