import { MemoryEntry } from './types';
import { detectDomains } from './knowledge-loader';
import { getReasoningLevel, ReasoningLevel } from './reasoning-depth';
import { detectGoalProgress } from './goal-tracker';
import { detectClarificationNeed } from './clarification-detector';
import { analyzeUserFeedback } from './feedback-analyzer';

export interface AgentContext {
  agentId: string;
  userId?: string;
  memoryEntries: MemoryEntry[];
  lastResponse?: string;
  routingMetadata?: any;
}

export type Intent = 
  | 'learn' | 'analyze' | 'optimize' | 'create' | 'summarize' 
  | 'compare' | 'explain' | 'explore' | 'debug' | 'plan' 
  | 'research' | 'automate' | 'clarify' | 'continue';

export interface ResponsePlan {
  intent: Intent;
  reasoningLevel: ReasoningLevel;
  domain: string;
  confidence: number;
  tools: {
    useMemory: boolean;
    useKnowledge: boolean;
    useSearch: boolean;
    askClarifyingQuestions: boolean;
  };
  planSteps: string[];
  contextualFactors: {
    hasGoalProgress: boolean;
    needsFeedbackHandling: boolean;
    isContinuation: boolean;
    hasMemoryContext: boolean;
  };
  responseStrategy: 'direct_answer' | 'guided_discovery' | 'structured_framework' | 'clarification_first';
}

/**
 * Generate a dynamic response plan based on user input and context
 */
export function generateResponsePlan(input: string, context: AgentContext): ResponsePlan {
  const cleanInput = cleanInputFromMemoryArtifacts(input);
  
  // Core analysis
  const intent = detectIntent(cleanInput, context);
  const domain = detectPrimaryDomain(cleanInput);
  const reasoningLevel = getReasoningLevel(cleanInput, context.memoryEntries, domain);
  const confidence = calculateIntentConfidence(intent, cleanInput, context);
  
  // Contextual analysis
  const contextualFactors = analyzeContextualFactors(input, context);
  const clarificationResult = detectClarificationNeed(cleanInput, context.memoryEntries, contextualFactors.hasMemoryContext);
  
  // Tool requirements
  const tools = determineToolRequirements(intent, domain, reasoningLevel, confidence, contextualFactors);
  
  // Response strategy
  const responseStrategy = determineResponseStrategy(intent, confidence, contextualFactors, clarificationResult.needsClarification);
  
  // Plan steps
  const planSteps = generatePlanSteps(intent, responseStrategy, tools, contextualFactors);
  
  return {
    intent,
    reasoningLevel,
    domain,
    confidence,
    tools,
    planSteps,
    contextualFactors,
    responseStrategy
  };
}

/**
 * Clean input from memory artifacts and routing metadata
 */
function cleanInputFromMemoryArtifacts(input: string): string {
  return input
    .replace(/\[?\d{4}-\d{2}-\d{2}T[\d:.Z-]+\]?\s*/g, '')
    .replace(/Building on what we discussed about\s*/gi, '')
    .replace(/Continuing from your\s*/gi, '')
    .replace(/Since you're working on\s*/gi, '')
    .replace(/\*\*Primary question\*\*:\s*/gi, '')
    .trim();
}

/**
 * Detect the primary intent of the user input
 */
function detectIntent(input: string, context: AgentContext): Intent {
  const lowerInput = input.toLowerCase();
  
  // Check for continuation patterns first
  if (context.lastResponse && isContinuationRequest(lowerInput)) {
    return 'continue';
  }
  
  // Check for clarification needs
  if (isVagueOrUnclear(lowerInput)) {
    return 'clarify';
  }
  
  // Agent-specific intent patterns
  const agentSpecificIntent = getAgentSpecificIntent(lowerInput, context.agentId);
  if (agentSpecificIntent) {
    return agentSpecificIntent;
  }
  
  // General intent patterns
  if (lowerInput.match(/\b(learn|understand|teach me|explain|how to|study|master|beginner|guide|start|new to)\b/)) {
    return 'learn';
  }
  
  if (lowerInput.match(/\b(compare|vs|versus|difference|better|choose|alternatives|options)\b/)) {
    return 'compare';
  }
  
  if (lowerInput.match(/\b(what is|what are|define|meaning|concept of|explain)\b/)) {
    return 'explain';
  }
  
  if (lowerInput.match(/\b(explore|investigate|research|find out|discover|trends|analyze|analysis)\b/)) {
    return context.agentId === 'research' ? 'research' : 'analyze';
  }
  
  if (lowerInput.match(/\b(create|make|build|develop|design|generate|brainstorm|ideate)\b/)) {
    return 'create';
  }
  
  if (lowerInput.match(/\b(optimize|improve|enhance|automate|streamline|efficiency|workflow|process)\b/)) {
    return context.agentId === 'automation' ? 'automate' : 'optimize';
  }
  
  if (lowerInput.match(/\b(plan|organize|structure|strategy|roadmap|steps|approach)\b/)) {
    return 'plan';
  }
  
  if (lowerInput.match(/\b(summarize|summary|recap|overview|brief|concise)\b/)) {
    return 'summarize';
  }
  
  if (lowerInput.match(/\b(debug|fix|solve|error|problem|issue|troubleshoot)\b/)) {
    return 'debug';
  }
  
  // Default based on agent
  return getDefaultAgentIntent(context.agentId);
}

/**
 * Get agent-specific intent patterns
 */
function getAgentSpecificIntent(input: string, agentId: string): Intent | null {
  switch (agentId) {
    case 'research':
      if (input.match(/\b(data|statistics|facts|findings|evidence|sources|study|investigation)\b/)) {
        return 'research';
      }
      if (input.match(/\b(trends|patterns|analysis|insights|review|survey)\b/)) {
        return 'analyze';
      }
      break;
      
    case 'creative':
      if (input.match(/\b(creative|imagination|innovative|original|artistic|inspiration|brainstorm)\b/)) {
        return 'create';
      }
      if (input.match(/\b(ideas|concepts|themes|stories|names|designs|campaigns)\b/)) {
        return 'create';
      }
      break;
      
    case 'automation':
      if (input.match(/\b(automate|automation|workflow|process|efficiency|optimize|streamline)\b/)) {
        return 'automate';
      }
      if (input.match(/\b(template|system|framework|procedure|checklist|pipeline)\b/)) {
        return 'plan';
      }
      break;
  }
  
  return null;
}

/**
 * Get default intent based on agent type
 */
function getDefaultAgentIntent(agentId: string): Intent {
  switch (agentId) {
    case 'research': return 'research';
    case 'creative': return 'create';
    case 'automation': return 'automate';
    default: return 'analyze';
  }
}

/**
 * Detect the primary domain from input
 */
function detectPrimaryDomain(input: string): string {
  const domains = detectDomains(input);
  
  if (domains.length > 0) {
    return domains[0]; // Return the first/primary domain
  }
  
  // Fallback domain detection
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.match(/\b(code|coding|programming|python|javascript|web|app|software|tech)\b/)) {
    return 'coding';
  }
  
  if (lowerInput.match(/\b(business|marketing|sales|strategy|management|finance)\b/)) {
    return 'business';
  }
  
  if (lowerInput.match(/\b(design|creative|art|visual|ui|ux|branding)\b/)) {
    return 'design';
  }
  
  if (lowerInput.match(/\b(data|analytics|statistics|research|analysis|science)\b/)) {
    return 'data';
  }
  
  return 'general';
}

/**
 * Calculate confidence in intent detection
 */
function calculateIntentConfidence(intent: Intent, input: string, context: AgentContext): number {
  let confidence = 0.5; // Base confidence
  
  // Intent-specific confidence adjustments
  if (intent !== 'clarify' && input.length > 10) confidence += 0.2;
  if (intent === 'clarify') confidence = 0.3; // Low confidence for clarification needs
  
  // Memory context boosts confidence
  if (context.memoryEntries.length > 0) confidence += 0.1;
  
  // Specific keywords boost confidence
  const intentKeywords = getIntentKeywords(intent);
  const matchedKeywords = intentKeywords.filter(keyword => 
    input.toLowerCase().includes(keyword)
  );
  confidence += Math.min(matchedKeywords.length * 0.1, 0.3);
  
  // Agent alignment boosts confidence
  if (isIntentAlignedWithAgent(intent, context.agentId)) confidence += 0.15;
  
  return Math.min(confidence, 1.0);
}

/**
 * Get keywords associated with each intent
 */
function getIntentKeywords(intent: Intent): string[] {
  const keywords: Record<Intent, string[]> = {
    learn: ['learn', 'understand', 'teach', 'explain', 'guide', 'tutorial', 'beginner'],
    analyze: ['analyze', 'analysis', 'examine', 'study', 'investigate', 'review'],
    optimize: ['optimize', 'improve', 'enhance', 'better', 'efficiency', 'performance'],
    create: ['create', 'make', 'build', 'generate', 'design', 'develop', 'brainstorm'],
    summarize: ['summarize', 'summary', 'recap', 'overview', 'brief', 'concise'],
    compare: ['compare', 'versus', 'difference', 'choose', 'alternatives', 'options'],
    explain: ['explain', 'what is', 'define', 'meaning', 'concept'],
    explore: ['explore', 'discover', 'investigate', 'find out', 'research'],
    debug: ['debug', 'fix', 'solve', 'error', 'problem', 'troubleshoot'],
    plan: ['plan', 'organize', 'strategy', 'roadmap', 'steps', 'approach'],
    research: ['research', 'data', 'evidence', 'findings', 'study', 'facts'],
    automate: ['automate', 'automation', 'workflow', 'process', 'streamline'],
    clarify: ['help', 'unclear', 'confusing', 'vague', 'what do you mean'],
    continue: ['continue', 'next', 'more', 'keep going', 'proceed']
  };
  
  return keywords[intent] || [];
}

/**
 * Check if intent aligns with agent capabilities
 */
function isIntentAlignedWithAgent(intent: Intent, agentId: string): boolean {
  const agentAlignments: Record<string, Intent[]> = {
    research: ['research', 'analyze', 'explore', 'learn', 'compare', 'explain'],
    creative: ['create', 'explore', 'learn', 'plan'],
    automation: ['automate', 'optimize', 'plan', 'debug', 'analyze']
  };
  
  return agentAlignments[agentId]?.includes(intent) || false;
}

/**
 * Analyze contextual factors that influence response planning
 */
function analyzeContextualFactors(input: string, context: AgentContext): ResponsePlan['contextualFactors'] {
  const goalProgress = detectGoalProgress(input, context.memoryEntries);
  
  let feedbackAnalysis = null;
  if (context.lastResponse) {
    feedbackAnalysis = analyzeUserFeedback(input, context.lastResponse, context.memoryEntries);
  }
  
  return {
    hasGoalProgress: goalProgress.status !== null,
    needsFeedbackHandling: feedbackAnalysis?.type !== null && feedbackAnalysis?.type !== undefined,
    isContinuation: context.routingMetadata?.isContinuation || isContinuationRequest(input.toLowerCase()),
    hasMemoryContext: context.memoryEntries.length > 0
  };
}

/**
 * Check if input is a continuation request
 */
function isContinuationRequest(input: string): boolean {
  const continuationPatterns = [
    /^(continue|keep going|next|more|proceed|go on)$/i,
    /^(and|also|additionally|furthermore)$/i,
    /tell me more/i,
    /what else/i,
    /continue with/i
  ];
  
  return continuationPatterns.some(pattern => pattern.test(input));
}

/**
 * Check if input is vague or unclear
 */
function isVagueOrUnclear(input: string): boolean {
  const vague = input.length < 10 || 
    /^(help|hi|hello|yes|no|ok|sure|maybe|idk|what|how|why)$/i.test(input) ||
    /^(help me|can you help|i need help|assist me)$/i.test(input);
    
  return vague;
}

/**
 * Check if input is vague or ambiguous and needs clarification
 */
function isVagueOrAmbiguous(input: string): boolean {
  const ambiguousPatterns = [
    /^(learn|code|coding|program|programming)$/i,
    /^(create|make|build) (something|anything)$/i,
    /^(help with|work on) (it|this|that)$/i,
    /^(improve|optimize|fix) (my|the) (thing|project|work)$/i
  ];
  
  return ambiguousPatterns.some(pattern => pattern.test(input.trim())) ||
    (input.split(' ').length <= 3 && !containsSpecificDomain(input));
}

/**
 * Check if input contains specific domain indicators
 */
function containsSpecificDomain(input: string): boolean {
  const specificTerms = [
    'python', 'javascript', 'react', 'vue', 'angular', 'nodejs', 'java', 'c++',
    'web development', 'mobile app', 'machine learning', 'data science',
    'automation', 'workflow', 'business', 'marketing', 'design',
    'e-commerce', 'startup', 'ai', 'blockchain', 'api'
  ];
  
  return specificTerms.some(term => input.toLowerCase().includes(term));
}

/**
 * Determine which tools should be used based on the plan
 */
function determineToolRequirements(
  intent: Intent, 
  domain: string, 
  reasoningLevel: ReasoningLevel, 
  confidence: number,
  contextualFactors: ResponsePlan['contextualFactors']
): ResponsePlan['tools'] {
  const tools = {
    useMemory: false,
    useKnowledge: false,
    useSearch: false,
    askClarifyingQuestions: false
  };
  
  // Memory usage
  tools.useMemory = contextualFactors.hasMemoryContext || 
    contextualFactors.isContinuation ||
    contextualFactors.hasGoalProgress;
  
  // Knowledge base usage
  tools.useKnowledge = domain !== 'general' && 
    ['learn', 'explain', 'research', 'analyze'].includes(intent) &&
    reasoningLevel !== 'basic';
  
  // Web search usage
  tools.useSearch = ['research', 'explore', 'analyze'].includes(intent) &&
    confidence > 0.6 &&
    !contextualFactors.isContinuation;
  
  // Clarification questions - use higher threshold for smart consulting
  tools.askClarifyingQuestions = confidence < 0.9 || 
    intent === 'clarify' ||
    (confidence < 0.95 && !contextualFactors.isContinuation && isVagueOrAmbiguous(input));
  
  return tools;
}

/**
 * Determine the overall response strategy
 */
function determineResponseStrategy(
  intent: Intent,
  confidence: number,
  contextualFactors: ResponsePlan['contextualFactors'],
  needsClarification: boolean
): ResponsePlan['responseStrategy'] {
  if (needsClarification || intent === 'clarify' || confidence < 0.9) {
    return 'clarification_first';
  }
  
  // Prioritize direct, actionable responses for high confidence
  if (contextualFactors.isContinuation || confidence >= 0.9) {
    return 'direct_answer';
  }
  
  // Use structured approach only for complex learning scenarios
  if (['learn', 'research'].includes(intent) && confidence < 0.85) {
    return 'structured_framework';
  }
  
  if (['create', 'explore', 'plan'].includes(intent)) {
    return 'guided_discovery';
  }
  
  return 'direct_answer';
}

/**
 * Generate step-by-step plan based on strategy and tools
 */
function generatePlanSteps(
  intent: Intent,
  strategy: ResponsePlan['responseStrategy'],
  tools: ResponsePlan['tools'],
  contextualFactors: ResponsePlan['contextualFactors']
): string[] {
  const steps: string[] = [];
  
  // Handle feedback first if needed
  if (contextualFactors.needsFeedbackHandling) {
    steps.push('Acknowledge feedback');
  }
  
  // Handle goal progress
  if (contextualFactors.hasGoalProgress) {
    steps.push('Address goal progress');
  }
  
  // Strategy-specific steps - focused on actionable consulting
  switch (strategy) {
    case 'clarification_first':
      steps.push('Ask focused clarifying questions');
      if (tools.useMemory) steps.push('Reference relevant context');
      steps.push('Provide immediate first step');
      break;
      
    case 'direct_answer':
      if (tools.useMemory) steps.push('Build on previous context');
      steps.push('Interpret goal with nuance');
      steps.push('Provide actionable plan');
      if (tools.useKnowledge) steps.push('Add domain expertise');
      if (tools.useSearch) steps.push('Include current best practices');
      break;
      
    case 'structured_framework':
      if (tools.useMemory) steps.push('Connect to previous discussions');
      steps.push('Clarify specific focus area');
      steps.push('Provide targeted learning path');
      if (tools.useKnowledge) steps.push('Include expert recommendations');
      break;
      
    case 'guided_discovery':
      if (tools.useMemory) steps.push('Build on previous work');
      steps.push('Suggest specific creative direction');
      steps.push('Provide concrete next action');
      if (tools.useKnowledge) steps.push('Share relevant insights');
      break;
  }
  
  return steps;
}

/**
 * Export helper functions for use in agents
 */
export { cleanInputFromMemoryArtifacts, detectIntent, calculateIntentConfidence };