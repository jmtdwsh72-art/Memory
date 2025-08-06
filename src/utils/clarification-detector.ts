import { MemoryEntry } from './types';

export interface ClarificationResult {
  needsClarification: boolean;
  reason?: 'vague_input' | 'missing_subject' | 'underspecified_goal' | 'ambiguous_context';
  suggestedQuestions?: string[];
  confidence?: number;
  specificIssues?: string[];
}

interface ClarificationPattern {
  type: ClarificationResult['reason'];
  patterns: RegExp[];
  keywords: string[];
  weight: number;
  questions: string[];
}

// Patterns that indicate need for clarification
const clarificationPatterns: ClarificationPattern[] = [
  // Vague input patterns
  {
    type: 'vague_input',
    patterns: [
      /^(help|assist|support|please)$/i,
      /^(what do you think|any ideas|suggestions)$/i,
      /^(can you help|could you help|help me)$/i,
      /^(do something|make something|create something)$/i
    ],
    keywords: ['help', 'assist', 'something', 'anything', 'whatever'],
    weight: 1.0,
    questions: [
      'What specific task or goal are you working on?',
      'Could you describe what you\'d like to accomplish?',
      'What area would you like help with?'
    ]
  },
  
  // Missing subject patterns
  {
    type: 'missing_subject',
    patterns: [
      /^(improve|optimize|fix|enhance|update|change) (it|this|that)$/i,
      /^(make it|make this|make that) (better|good|work|nice)$/i,
      /^(work on|focus on|deal with) (it|this|that)$/i,
      /^(analyze|research|study) (it|this|that)$/i
    ],
    keywords: ['it', 'this', 'that', 'the thing', 'the project'],
    weight: 1.2,
    questions: [
      'What specifically are you referring to?',
      'Could you tell me more about the subject you\'d like me to work with?',
      'What is "it" that you\'d like me to help with?'
    ]
  },
  
  // Underspecified goal patterns  
  {
    type: 'underspecified_goal',
    patterns: [
      /^(make it better|improve|optimize|enhance)$/i,
      /^(do something creative|be creative|think of something)$/i,
      /^(solve|fix|handle) (the problem|this issue)$/i,
      /^(plan|organize|structure) (something|things)$/i
    ],
    keywords: ['better', 'improve', 'optimize', 'creative', 'solve', 'fix'],
    weight: 1.1,
    questions: [
      'What outcome are you hoping to achieve?',
      'What would "better" look like to you?',
      'What specific improvements are you looking for?',
      'What success criteria do you have in mind?'
    ]
  },

  // Ambiguous context patterns
  {
    type: 'ambiguous_context',
    patterns: [
      /^(continue|keep going|next|more|proceed)$/i,
      /^(what about|how about|consider) (.{1,10})$/i,
      /^(tell me about|explain) (.{1,15})$/i
    ],
    keywords: ['continue', 'next', 'more', 'about', 'regarding'],
    weight: 0.8,
    questions: [
      'Could you provide more context about what you\'re referring to?',
      'Are you continuing from a previous topic or starting something new?',
      'What specific aspect would you like me to focus on?'
    ]
  }
];

// Very short inputs that likely need clarification
const shortInputThreshold = 15; // characters
const veryShortInputs = [
  'help', 'hi', 'hello', 'yes', 'no', 'ok', 'sure', 'maybe', 'idk', 
  'what', 'how', 'why', 'when', 'where', 'please', 'thanks'
];

// Generic requests that need more specificity
const genericRequests = [
  'help me', 'can you help', 'i need help', 'assist me', 'support me',
  'what do you think', 'any ideas', 'suggestions', 'advice',
  'make it better', 'improve this', 'optimize it', 'fix it',
  'something creative', 'be creative', 'think of something'
];

/**
 * Detect if user input needs clarification before proceeding
 */
export function detectClarificationNeed(
  input: string, 
  previousMemory?: MemoryEntry[],
  hasContext?: boolean
): ClarificationResult {
  const trimmedInput = input.trim();
  const lowerInput = trimmedInput.toLowerCase();
  
  // Skip clarification for very basic greetings and confirmations
  if (isBasicGreetingOrConfirmation(lowerInput)) {
    return { needsClarification: false };
  }
  
  let clarificationScore = 0;
  let bestMatch: ClarificationResult = {
    needsClarification: false,
    confidence: 0,
    specificIssues: []
  };
  
  // Check for very short input
  if (trimmedInput.length <= shortInputThreshold) {
    if (veryShortInputs.includes(lowerInput)) {
      clarificationScore += 0.8;
      bestMatch.specificIssues?.push('Input too brief');
    }
  }
  
  // Check for generic requests
  const isGeneric = genericRequests.some(generic => 
    lowerInput.includes(generic) || lowerInput === generic
  );
  if (isGeneric) {
    clarificationScore += 0.6;
    bestMatch.specificIssues?.push('Request too generic');
  }
  
  // Check clarification patterns
  for (const pattern of clarificationPatterns) {
    let patternScore = 0;
    
    // Check regex patterns
    for (const regex of pattern.patterns) {
      if (regex.test(lowerInput)) {
        patternScore += 0.5 * pattern.weight;
        break;
      }
    }
    
    // Check keywords (with word boundary checking)
    const keywordMatches = pattern.keywords.filter(keyword => {
      const keywordLower = keyword.toLowerCase();
      // Check for whole word match, not substring
      const wordRegex = new RegExp(`\\b${keywordLower}\\b`, 'i');
      return wordRegex.test(lowerInput);
    });
    
    if (keywordMatches.length > 0) {
      patternScore += (keywordMatches.length * 0.3) * pattern.weight;
    }
    
    if (patternScore > 0) {
      clarificationScore += patternScore;
      
      if (patternScore > (bestMatch.confidence || 0)) {
        bestMatch = {
          needsClarification: true,
          reason: pattern.type,
          suggestedQuestions: pattern.questions,
          confidence: Math.min(patternScore, 1.0),
          specificIssues: bestMatch.specificIssues
        };
      }
    }
  }
  
  // Check for pronoun references without context
  if (!hasContext && containsAmbiguousPronouns(lowerInput)) {
    clarificationScore += 0.4;
    bestMatch.specificIssues?.push('Ambiguous pronouns without context');
  }
  
  // Check for missing action verbs or subjects
  const missingElements = analyzeMissingElements(trimmedInput);
  if (missingElements.length > 0) {
    clarificationScore += 0.3 * missingElements.length;
    bestMatch.specificIssues?.push(...missingElements);
  }
  
  // Consider previous memory context
  if (previousMemory && previousMemory.length > 0) {
    const hasRecentClarifications = previousMemory.slice(-5).some(entry =>
      entry.summary.includes('clarification_requested')
    );
    
    if (hasRecentClarifications && clarificationScore > 0.3) {
      // User might be providing clarification to previous request
      clarificationScore *= 0.7; // Reduce threshold
    }
  }
  
  // Final decision based on total score
  const needsClarification = clarificationScore >= 0.8;
  
  if (needsClarification && !bestMatch.reason) {
    bestMatch.reason = 'vague_input';
    bestMatch.suggestedQuestions = [
      'Could you provide more details about what you\'d like help with?',
      'What specific task or goal are you working on?',
      'What outcome are you hoping to achieve?'
    ];
  }
  
  return {
    ...bestMatch,
    needsClarification,
    confidence: clarificationScore
  };
}

/**
 * Check if input is a basic greeting or confirmation that doesn't need clarification
 */
function isBasicGreetingOrConfirmation(input: string): boolean {
  const basicPatterns = [
    /^(hi|hello|hey|greetings|good morning|good afternoon|good evening)(\s|$)/i,
    /^(yes|yeah|yep|yup|sure|okay|ok|alright|fine|sounds good)(\s|$)/i,
    /^(no|nope|nah|not really|never mind)(\s|$)/i,
    /^(thank you|thanks|thx|appreciate it|got it|understood)(\s|$)/i
  ];
  
  return basicPatterns.some(pattern => pattern.test(input));
}

/**
 * Check for ambiguous pronouns that need clarification
 */
function containsAmbiguousPronouns(input: string): boolean {
  const ambiguousPronouns = ['it', 'this', 'that', 'they', 'them', 'these', 'those'];
  const words = input.split(/\s+/);
  
  // Check if pronouns appear without clear antecedents
  return ambiguousPronouns.some(pronoun => {
    const index = words.indexOf(pronoun);
    if (index === -1) return false;
    
    // Very simple check: if pronoun is at start or has no clear noun before it
    if (index === 0) return true;
    
    // Look for nouns in the previous few words
    const previousWords = words.slice(Math.max(0, index - 3), index);
    const hasNoun = previousWords.some(word => 
      !['the', 'a', 'an', 'my', 'your', 'his', 'her', 'our', 'their'].includes(word.toLowerCase())
    );
    
    return !hasNoun;
  });
}

/**
 * Analyze what key elements might be missing from the input
 */
function analyzeMissingElements(input: string): string[] {
  const issues: string[] = [];
  const words = input.toLowerCase().split(/\s+/);
  
  // Check for action verbs
  const actionVerbs = [
    'create', 'make', 'build', 'develop', 'design', 'write', 'generate',
    'analyze', 'research', 'study', 'investigate', 'explore', 'examine',
    'improve', 'optimize', 'enhance', 'fix', 'solve', 'resolve',
    'plan', 'organize', 'structure', 'arrange', 'schedule',
    'explain', 'describe', 'tell', 'show', 'demonstrate', 'teach'
  ];
  
  const hasActionVerb = actionVerbs.some(verb => words.includes(verb));
  if (!hasActionVerb && words.length > 2) {
    issues.push('Missing clear action or goal');
  }
  
  // Check for subjects/objects (basic noun detection)
  const commonNouns = words.filter(word => 
    word.length > 3 && 
    !['with', 'from', 'about', 'would', 'could', 'should', 'might'].includes(word)
  );
  
  if (commonNouns.length === 0 && words.length > 3) {
    issues.push('Missing specific subject or topic');
  }
  
  return issues;
}

/**
 * Generate contextually appropriate clarifying questions based on agent type
 */
export function generateClarifyingQuestions(
  clarificationResult: ClarificationResult,
  agentId: string,
  userInput: string
): string[] {
  if (!clarificationResult.needsClarification || !clarificationResult.suggestedQuestions) {
    return [];
  }
  
  // Get base questions
  let questions = [...clarificationResult.suggestedQuestions];
  
  // Add agent-specific questions
  const agentSpecificQuestions = getAgentSpecificQuestions(agentId, clarificationResult.reason, userInput);
  
  // Combine and limit to 3-4 questions
  const allQuestions = [...questions, ...agentSpecificQuestions];
  return allQuestions.slice(0, 4);
}

/**
 * Get clarifying questions specific to each agent type
 */
function getAgentSpecificQuestions(
  agentId: string,
  reason?: ClarificationResult['reason'],
  userInput?: string
): string[] {
  const questions: Record<string, Record<string, string[]>> = {
    research: {
      vague_input: [
        'What topic or question would you like me to research?',
        'Are you looking for background information or analysis of specific data?'
      ],
      missing_subject: [
        'What specific subject should I focus my research on?',
        'Could you specify the topic you\'d like me to investigate?'
      ],
      underspecified_goal: [
        'What type of research outcome are you looking for - analysis, comparison, or recommendations?',
        'Should I focus on current trends, historical data, or future projections?'
      ]
    },
    creative: {
      vague_input: [
        'What type of creative project are you envisioning?',
        'Are you looking for ideas, names, stories, or visual concepts?'
      ],
      missing_subject: [
        'What creative project or concept should I focus on?',
        'Could you describe the creative challenge you\'re facing?'
      ],
      underspecified_goal: [
        'What creative outcome would make this a success for you?',
        'What style, tone, or mood are you aiming for?'
      ]
    },
    automation: {
      vague_input: [
        'What process or workflow would you like me to help optimize?',
        'Are you looking to automate a specific task or improve an existing system?'
      ],
      missing_subject: [
        'Which specific process or system should I focus on?',
        'Could you describe the workflow that needs optimization?'
      ],
      underspecified_goal: [
        'What efficiency gains or improvements are you hoping to achieve?',
        'Should I focus on time savings, error reduction, or scalability?'
      ]
    }
  };
  
  const agentQuestions = questions[agentId];
  if (!agentQuestions || !reason) return [];
  
  return agentQuestions[reason] || [];
}

/**
 * Create a memory entry for clarification requests
 */
export function createClarificationMemory(
  originalInput: string,
  clarificationResult: ClarificationResult,
  agentId: string
): Partial<MemoryEntry> {
  const timestamp = new Date();
  
  return {
    id: `clarification_${timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
    input: originalInput,
    summary: `Clarification requested: ${clarificationResult.reason} - Agent: ${agentId}`,
    timestamp,
    lastAccessed: timestamp,
    context: `Original unclear input: "${originalInput}" - Issues: ${clarificationResult.specificIssues?.join(', ')}`
  };
}