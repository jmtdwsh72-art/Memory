import { MemoryEntry } from './types';

export type ReasoningLevel = 'basic' | 'intermediate' | 'advanced';

interface ReasoningKeywords {
  basic: string[];
  advanced: string[];
  simplify: string[];
}

const REASONING_KEYWORDS: ReasoningKeywords = {
  basic: [
    'explain simply',
    'simple terms',
    'eli5',
    'explain like i\'m five',
    'basic explanation',
    'layman\'s terms',
    'non-technical',
    'beginner',
    'overview',
    'summarize briefly'
  ],
  advanced: [
    'go deep',
    'technical breakdown',
    'in detail',
    'deep dive',
    'technical details',
    'advanced explanation',
    'expert level',
    'comprehensive analysis',
    'theoretical background',
    'mathematical proof',
    'implementation details'
  ],
  simplify: [
    'simplify that',
    'break that down',
    'explain it simpler',
    'too complex',
    'easier explanation',
    'more basic terms'
  ]
};

const DOMAIN_COMPLEXITY: Record<string, ReasoningLevel> = {
  // Basic domains
  'general': 'basic',
  'chat': 'basic',
  'weather': 'basic',
  'time': 'basic',
  
  // Intermediate domains
  'python': 'intermediate',
  'javascript': 'intermediate',
  'web development': 'intermediate',
  'business': 'intermediate',
  'marketing': 'intermediate',
  'react': 'intermediate',
  'nodejs': 'intermediate',
  
  // Advanced domains
  'quantum mechanics': 'advanced',
  'machine learning': 'advanced',
  'cryptography': 'advanced',
  'distributed systems': 'advanced',
  'theoretical physics': 'advanced',
  'advanced mathematics': 'advanced',
  'compiler design': 'advanced',
  'operating systems': 'advanced'
};

export function detectSimplificationRequest(input: string): boolean {
  const lowerInput = input.toLowerCase();
  return REASONING_KEYWORDS.simplify.some(keyword => lowerInput.includes(keyword));
}

export function getReasoningLevel(
  input: string,
  memory: MemoryEntry[],
  domain: string
): ReasoningLevel {
  const lowerInput = input.toLowerCase();
  
  // Check for explicit basic keywords
  const hasBasicKeywords = REASONING_KEYWORDS.basic.some(keyword => 
    lowerInput.includes(keyword)
  );
  
  // Check for explicit advanced keywords
  const hasAdvancedKeywords = REASONING_KEYWORDS.advanced.some(keyword => 
    lowerInput.includes(keyword)
  );
  
  // If explicit keywords found, use them
  if (hasBasicKeywords) return 'basic';
  if (hasAdvancedKeywords) return 'advanced';
  
  // Check memory for user's preferred learning level
  const learningLevelFromMemory = extractLearningLevelFromMemory(memory);
  if (learningLevelFromMemory) {
    return learningLevelFromMemory;
  }
  
  // Use domain complexity as fallback
  const domainLevel = DOMAIN_COMPLEXITY[domain.toLowerCase()] || 'intermediate';
  
  // Additional heuristics based on input patterns
  if (containsTechnicalTerms(lowerInput)) {
    return 'advanced';
  }
  
  if (isQuestionSimple(lowerInput)) {
    return 'basic';
  }
  
  return domainLevel;
}

function extractLearningLevelFromMemory(memory: MemoryEntry[]): ReasoningLevel | null {
  // Look for recent memory entries that indicate learning preference
  const recentMemories = memory.slice(-10); // Last 10 entries
  
  for (const entry of recentMemories) {
    const content = (entry.summary || '').toLowerCase();
    
    if (content.includes('prefers simple explanations') || 
        content.includes('learning level: basic')) {
      return 'basic';
    }
    
    if (content.includes('prefers technical details') || 
        content.includes('learning level: advanced')) {
      return 'advanced';
    }
  }
  
  return null;
}

function containsTechnicalTerms(input: string): boolean {
  const technicalPatterns = [
    /algorithm/i,
    /implementation/i,
    /architecture/i,
    /optimization/i,
    /performance/i,
    /complexity/i,
    /theorem/i,
    /proof/i,
    /equation/i,
    /formula/i
  ];
  
  return technicalPatterns.some(pattern => pattern.test(input));
}

function isQuestionSimple(input: string): boolean {
  // Simple questions are typically short and use basic verbs
  const simplePatterns = [
    /^what is/i,
    /^who is/i,
    /^when is/i,
    /^where is/i,
    /^how do i/i,
    /^can you/i
  ];
  
  return input.length < 50 && simplePatterns.some(pattern => pattern.test(input));
}

export function adjustResponseForLevel(
  content: string,
  level: ReasoningLevel,
  includeExamples: boolean = true
): string {
  switch (level) {
    case 'basic':
      return formatBasicResponse(content, includeExamples);
    case 'intermediate':
      return content; // Default formatting
    case 'advanced':
      return formatAdvancedResponse(content, includeExamples);
  }
}

function formatBasicResponse(content: string, includeExamples: boolean): string {
  // Simplify language and add helpful context
  let simplified = content;
  
  // Add simple introduction if needed
  if (!content.startsWith('Simply put')) {
    simplified = `Simply put: ${content}`;
  }
  
  if (includeExamples) {
    simplified += '\n\nThink of it like this: [concrete everyday example]';
  }
  
  return simplified;
}

function formatAdvancedResponse(content: string, includeExamples: boolean): string {
  // Add technical depth and theoretical context
  let advanced = content;
  
  // Add technical context if not present
  if (!content.includes('Technical details:')) {
    advanced += '\n\n**Technical Details:**\n[Implementation specifics, performance considerations, theoretical foundations]';
  }
  
  if (includeExamples) {
    advanced += '\n\n**Advanced Example:**\n[Code snippets, mathematical proofs, or system diagrams]';
  }
  
  return advanced;
}

export function getReasoningPromptModifier(level: ReasoningLevel): string {
  switch (level) {
    case 'basic':
      return 'Explain in simple, everyday terms. Avoid jargon and technical language. Use analogies and real-world examples.';
    case 'intermediate':
      return 'Provide a balanced explanation with some technical details but remain accessible. Include practical examples.';
    case 'advanced':
      return 'Provide comprehensive technical analysis. Include implementation details, theoretical foundations, and performance considerations. Assume expert-level understanding.';
  }
}