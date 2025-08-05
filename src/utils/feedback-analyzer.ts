import { MemoryEntry } from './types';
import { ReasoningLevel } from './reasoning-depth';

export interface FeedbackResult {
  type: 'positive' | 'confused' | 'negative' | 'retry' | 'neutral';
  reasoningAdjustment?: 'simplify' | 'expand' | 'retry' | null;
  followUpDetected?: boolean;
  feedbackMemory?: Partial<MemoryEntry>;
  confidence?: number;
  specificFeedback?: string;
}

interface FeedbackPattern {
  patterns: RegExp[];
  keywords: string[];
  type: FeedbackResult['type'];
  reasoningAdjustment?: FeedbackResult['reasoningAdjustment'];
  weight: number;
}

// Feedback detection patterns
const feedbackPatterns: FeedbackPattern[] = [
  // Positive feedback
  {
    patterns: [
      /\b(perfect|excellent|great|awesome|helpful|thanks|thank you|exactly|spot on|brilliant)\b/i,
      /\b(that's (exactly|just) what i (needed|wanted))\b/i,
      /\b(love (it|this|that)|makes sense now)\b/i,
      /\b(cleared? (it|that) up|got it|understand now)\b/i
    ],
    keywords: ['perfect', 'excellent', 'great', 'helpful', 'thanks', 'exactly', 'brilliant', 'awesome'],
    type: 'positive',
    reasoningAdjustment: null,
    weight: 1.0
  },
  
  // Confusion feedback
  {
    patterns: [
      /\b(don't (understand|get it)|confused|confusing|lost me|unclear)\b/i,
      /\b(what (do you mean|does that mean)|can you clarify)\b/i,
      /\b(too (complex|complicated|technical|advanced))\b/i,
      /\b(simpler|easier|basic|layman)\b/i,
      /\b(huh\?|what\?|i'm lost)\b/i
    ],
    keywords: ['confused', 'confusing', 'unclear', 'lost', 'complicated', 'complex', "don't understand"],
    type: 'confused',
    reasoningAdjustment: 'simplify',
    weight: 1.2
  },
  
  // Retry/rephrase feedback
  {
    patterns: [
      /\b(try again|rephrase|say (it|that) differently|another way)\b/i,
      /\b(can you (rephrase|reword|explain differently))\b/i,
      /\b(different (explanation|approach|way))\b/i,
      /\b(not what i (meant|asked|wanted))\b/i
    ],
    keywords: ['try again', 'rephrase', 'differently', 'another way', 'reword'],
    type: 'retry',
    reasoningAdjustment: 'retry',
    weight: 1.3
  },
  
  // Expansion request
  {
    patterns: [
      /\b(go deeper|more (detail|details|depth)|elaborate|expand)\b/i,
      /\b(tell me more|can you (expand|elaborate))\b/i,
      /\b(technical (details|explanation)|advanced)\b/i,
      /\b(specifics|specific (details|information))\b/i
    ],
    keywords: ['deeper', 'more detail', 'elaborate', 'expand', 'technical', 'advanced', 'specifics'],
    type: 'neutral',
    reasoningAdjustment: 'expand',
    weight: 1.0
  },
  
  // Negative feedback
  {
    patterns: [
      /\b(wrong|incorrect|not (right|correct)|that's not)\b/i,
      /\b(terrible|awful|bad|useless|unhelpful)\b/i,
      /\b(didn't help|not helpful|waste)\b/i,
      /\b(completely (wrong|off|missed))\b/i
    ],
    keywords: ['wrong', 'incorrect', 'terrible', 'awful', 'bad', 'unhelpful', 'useless'],
    type: 'negative',
    reasoningAdjustment: 'retry',
    weight: 1.5
  }
];

// Follow-up detection patterns
const followUpPatterns = [
  /\b(okay,? (now|so) what|next step|what('s| is) next)\b/i,
  /\b(continue|go on|keep going|and then)\b/i,
  /\b(what (should i do|do i do) (next|now))\b/i,
  /\b(how do i (proceed|continue|go from here))\b/i,
  /\b(next|proceed|continue)\b/i
];

/**
 * Analyze user feedback to detect sentiment and required adjustments
 */
export function analyzeUserFeedback(
  input: string, 
  lastAgentMessage: string,
  previousMemory?: MemoryEntry[]
): FeedbackResult {
  const lowerInput = input.toLowerCase().trim();
  
  // Check for follow-up detection
  const followUpDetected = followUpPatterns.some(pattern => pattern.test(lowerInput));
  
  // Score each feedback type
  let bestMatch: FeedbackResult = {
    type: 'neutral',
    reasoningAdjustment: null,
    followUpDetected,
    confidence: 0
  };
  
  let highestScore = 0;
  
  for (const pattern of feedbackPatterns) {
    let score = 0;
    let matchDetails: string[] = [];
    
    // Check regex patterns
    for (const regex of pattern.patterns) {
      if (regex.test(lowerInput)) {
        score += 0.5 * pattern.weight;
        const match = lowerInput.match(regex);
        if (match) matchDetails.push(match[0]);
      }
    }
    
    // Check keywords
    const keywordMatches = pattern.keywords.filter(keyword => 
      lowerInput.includes(keyword.toLowerCase())
    );
    
    if (keywordMatches.length > 0) {
      score += (keywordMatches.length * 0.3) * pattern.weight;
      matchDetails.push(...keywordMatches);
    }
    
    // Consider context from last message
    if (lastAgentMessage && pattern.type === 'positive') {
      // If the last message was a question and user responds positively, boost score
      if (lastAgentMessage.includes('?') && score > 0) {
        score += 0.2;
      }
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = {
        type: pattern.type,
        reasoningAdjustment: pattern.reasoningAdjustment,
        followUpDetected,
        confidence: Math.min(score, 1.0),
        specificFeedback: matchDetails.join(', ')
      };
    }
  }
  
  // Create feedback memory if significant feedback detected
  if (bestMatch.type !== 'neutral' || bestMatch.reasoningAdjustment) {
    bestMatch.feedbackMemory = createFeedbackMemory(
      input,
      lastAgentMessage,
      bestMatch,
      previousMemory
    );
  }
  
  return bestMatch;
}

/**
 * Create a memory entry for significant feedback
 */
function createFeedbackMemory(
  userInput: string,
  lastAgentMessage: string,
  feedback: FeedbackResult,
  _previousMemory?: MemoryEntry[]
): Partial<MemoryEntry> {
  const timestamp = new Date();
  
  // Extract key insight from feedback
  let insight = '';
  switch (feedback.type) {
    case 'positive':
      insight = 'User found the explanation helpful and clear';
      break;
    case 'confused':
      insight = 'User needs simpler explanations - adjusting to basic reasoning level';
      break;
    case 'negative':
      insight = 'Response missed the mark - need to retry with different approach';
      break;
    case 'retry':
      insight = 'User requesting alternative explanation - rephrasing needed';
      break;
  }
  
  if (feedback.reasoningAdjustment === 'expand') {
    insight = 'User wants more technical depth - adjusting to advanced reasoning level';
  }
  
  return {
    id: `feedback_${timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
    input: userInput,
    summary: `User feedback: ${feedback.type} - ${insight}`,
    timestamp,
    lastAccessed: timestamp,
    context: lastAgentMessage.substring(0, 200) + '...'
  };
}

/**
 * Determine the appropriate reasoning level based on feedback
 */
export function adjustReasoningLevelFromFeedback(
  currentLevel: ReasoningLevel,
  feedback: FeedbackResult
): ReasoningLevel {
  if (!feedback.reasoningAdjustment) {
    return currentLevel;
  }
  
  switch (feedback.reasoningAdjustment) {
    case 'simplify':
      return 'basic';
    case 'expand':
      return 'advanced';
    case 'retry':
      // On retry, try a different level than current
      if (currentLevel === 'advanced') return 'intermediate';
      if (currentLevel === 'basic') return 'intermediate';
      return currentLevel;
    default:
      return currentLevel;
  }
}

/**
 * Generate feedback acknowledgment message
 */
export function generateFeedbackAcknowledgment(feedback: FeedbackResult): string {
  const markers: Record<string, string> = {
    simplify: '🧠 Feedback detected: Simplifying explanation',
    expand: '🔬 Feedback detected: Adding technical depth',
    retry: '🔄 Feedback detected: Trying a different approach',
    positive: '✅ Feedback detected: Communication style confirmed',
    negative: '⚠️ Feedback detected: Adjusting approach'
  };
  
  if (feedback.reasoningAdjustment) {
    return markers[feedback.reasoningAdjustment] || '';
  }
  
  if (feedback.type === 'positive' || feedback.type === 'negative') {
    return markers[feedback.type] || '';
  }
  
  return '';
}

/**
 * Check if user is requesting continuation of previous topic
 */
export function isContinuationRequest(
  input: string,
  _lastAgentMessage: string,
  feedback: FeedbackResult
): boolean {
  const lowerInput = input.toLowerCase();
  
  // Direct continuation patterns
  const continuationPatterns = [
    /^(yes|yeah|yep|sure|okay|ok|continue|go on)$/i,
    /^(yes|yeah|yep),? (please|thanks|go on|continue)$/i,
    /\b(tell me more about that|keep going|continue with that)\b/i
  ];
  
  const isContinuation = continuationPatterns.some(pattern => pattern.test(lowerInput));
  
  // Also check if follow-up detected without negative feedback
  return isContinuation || (feedback.followUpDetected === true && feedback.type !== 'negative');
}

/**
 * Extract learning preferences from feedback history
 */
export function extractLearningPreferences(
  feedbackHistory: MemoryEntry[]
): {
  preferredLevel: ReasoningLevel;
  feedbackPatterns: Record<string, number>;
} {
  const feedbackCounts = {
    simplify: 0,
    expand: 0,
    positive: 0,
    negative: 0,
    retry: 0
  };
  
  // Analyze recent feedback
  const recentFeedback = feedbackHistory.slice(-20);
  
  for (const entry of recentFeedback) {
    // For now, parse feedback info from summary since metadata structure varies
    const summary = entry.summary.toLowerCase();
    if (summary.includes('simplify')) feedbackCounts.simplify++;
    if (summary.includes('expand') || summary.includes('technical depth')) feedbackCounts.expand++;
    if (summary.includes('positive') || summary.includes('helpful')) feedbackCounts.positive++;
    if (summary.includes('negative') || summary.includes('missed')) feedbackCounts.negative++;
    if (summary.includes('retry') || summary.includes('rephrase')) feedbackCounts.retry++;
  }
  
  // Determine preferred level based on patterns
  let preferredLevel: ReasoningLevel = 'intermediate';
  
  if (feedbackCounts.simplify > feedbackCounts.expand * 2) {
    preferredLevel = 'basic';
  } else if (feedbackCounts.expand > feedbackCounts.simplify * 2) {
    preferredLevel = 'advanced';
  }
  
  return {
    preferredLevel,
    feedbackPatterns: feedbackCounts
  };
}