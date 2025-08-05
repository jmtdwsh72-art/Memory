import { MemoryEntry } from './types';

export interface SessionSummaryOptions {
  agentId?: string;
  maxSections?: number;
  includeMetadata?: boolean;
  sessionStartTime?: Date;
}

export interface SessionAnalysis {
  goals: {
    worked_on: string[];
    completed: string[];
    abandoned: string[];
    in_progress: string[];
  };
  questions: string[];
  knowledge_domains: string[];
  reasoning_levels: string[];
  feedback_patterns: string[];
  clarifications: string[];
  total_interactions: number;
  session_duration?: string;
  primary_agent?: string;
}

/**
 * Generate a comprehensive session summary from memory entries
 */
export function generateSessionSummary(
  memory: MemoryEntry[], 
  options: SessionSummaryOptions = {}
): string {
  const { agentId, maxSections = 6, includeMetadata = true } = options;
  
  // Filter memory entries for current session (recent entries)
  const sessionEntries = filterSessionEntries(memory, options.sessionStartTime);
  
  // Analyze session content
  const analysis = analyzeSession(sessionEntries, agentId);
  
  // Generate formatted summary
  return formatSessionSummary(analysis, { maxSections, includeMetadata, agentId });
}

/**
 * Filter memory entries to get current session data
 */
function filterSessionEntries(memory: MemoryEntry[], sessionStartTime?: Date): MemoryEntry[] {
  const cutoffTime = sessionStartTime || new Date(Date.now() - 2 * 60 * 60 * 1000); // Last 2 hours by default
  
  return memory
    .filter(entry => entry.lastAccessed >= cutoffTime)
    .sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime());
}

/**
 * Analyze session entries to extract key information
 */
function analyzeSession(entries: MemoryEntry[], targetAgentId?: string): SessionAnalysis {
  const analysis: SessionAnalysis = {
    goals: {
      worked_on: [],
      completed: [],
      abandoned: [],
      in_progress: []
    },
    questions: [],
    knowledge_domains: [],
    reasoning_levels: [],
    feedback_patterns: [],
    clarifications: [],
    total_interactions: 0,
    primary_agent: targetAgentId
  };
  
  // Filter by agent if specified
  const relevantEntries = targetAgentId 
    ? entries.filter(entry => entry.agentId === targetAgentId)
    : entries;
  
  analysis.total_interactions = relevantEntries.length;
  
  // Determine primary agent if not specified
  if (!analysis.primary_agent && entries.length > 0) {
    const agentCounts = entries.reduce((acc, entry) => {
      acc[entry.agentId] = (acc[entry.agentId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    analysis.primary_agent = Object.entries(agentCounts)
      .sort(([,a], [,b]) => b - a)[0][0];
  }
  
  for (const entry of relevantEntries) {
    // Analyze goals
    if (entry.type === 'goal' || entry.type === 'goal_progress') {
      const goalSummary = entry.goalSummary || extractGoalFromSummary(entry.summary);
      
      if (entry.type === 'goal_progress' && entry.goalStatus) {
        // Map 'new' status to 'worked_on' for consistency
        const statusKey = entry.goalStatus === 'new' ? 'worked_on' : entry.goalStatus;
        if (statusKey in analysis.goals) {
          analysis.goals[statusKey as keyof typeof analysis.goals].push(goalSummary);
        }
      } else if (entry.type === 'goal') {
        analysis.goals.worked_on.push(goalSummary);
      }
    }
    
    // Analyze questions (from input)
    if (isQuestion(entry.input)) {
      analysis.questions.push(entry.input);
    }
    
    // Extract knowledge domains from tags
    const domains = extractDomains(entry.tags || []);
    analysis.knowledge_domains.push(...domains);
    
    // Extract reasoning levels from tags
    const reasoningLevels = extractReasoningLevels(entry.tags || []);
    analysis.reasoning_levels.push(...reasoningLevels);
    
    // Analyze feedback patterns
    if (entry.tags?.includes('feedback')) {
      const feedbackType = entry.tags.find(tag => 
        ['positive', 'confused', 'negative', 'retry', 'neutral'].includes(tag)
      );
      if (feedbackType) {
        analysis.feedback_patterns.push(feedbackType);
      }
    }
    
    // Analyze clarifications
    if (entry.tags?.includes('clarification_requested')) {
      const reason = entry.tags.find(tag => 
        ['vague', 'missing_subject', 'underspecified_goal', 'ambiguous_context'].includes(tag)
      );
      analysis.clarifications.push(reason || 'clarification');
    }
  }
  
  // Deduplicate arrays
  analysis.goals.worked_on = [...new Set(analysis.goals.worked_on)];
  analysis.goals.completed = [...new Set(analysis.goals.completed)];
  analysis.goals.abandoned = [...new Set(analysis.goals.abandoned)];
  analysis.goals.in_progress = [...new Set(analysis.goals.in_progress)];
  analysis.knowledge_domains = [...new Set(analysis.knowledge_domains)];
  analysis.reasoning_levels = [...new Set(analysis.reasoning_levels)];
  analysis.feedback_patterns = [...new Set(analysis.feedback_patterns)];
  analysis.clarifications = [...new Set(analysis.clarifications)];
  
  // Limit questions to prevent overwhelming summaries
  if (analysis.questions.length > 5) {
    analysis.questions = analysis.questions.slice(0, 5);
  }
  
  return analysis;
}

/**
 * Format the session analysis into a readable markdown summary
 */
function formatSessionSummary(
  analysis: SessionAnalysis, 
  options: { maxSections: number; includeMetadata: boolean; agentId?: string }
): string {
  const sections: string[] = [];
  const agentName = getAgentDisplayName(analysis.primary_agent || options.agentId || 'assistant');
  
  // Header
  sections.push(`# 📋 Session Summary - ${agentName}`);
  sections.push('');
  
  let sectionCount = 0;
  
  // Goals Section
  if (hasGoalActivity(analysis.goals) && sectionCount < options.maxSections) {
    sections.push('## ✅ Goals & Progress');
    
    if (analysis.goals.completed.length > 0) {
      sections.push(`**🎉 Completed:** ${analysis.goals.completed.join(', ')}`);
    }
    
    if (analysis.goals.in_progress.length > 0) {
      sections.push(`**🔄 In Progress:** ${analysis.goals.in_progress.join(', ')}`);
    }
    
    if (analysis.goals.worked_on.length > 0) {
      sections.push(`**🎯 Worked On:** ${analysis.goals.worked_on.join(', ')}`);
    }
    
    if (analysis.goals.abandoned.length > 0) {
      sections.push(`**⏸️ Paused:** ${analysis.goals.abandoned.join(', ')}`);
    }
    
    sections.push('');
    sectionCount++;
  }
  
  // Questions Section
  if (analysis.questions.length > 0 && sectionCount < options.maxSections) {
    sections.push('## 🔍 Key Questions Explored');
    analysis.questions.forEach((question, index) => {
      const truncated = question.length > 80 ? question.substring(0, 80) + '...' : question;
      sections.push(`${index + 1}. ${truncated}`);
    });
    sections.push('');
    sectionCount++;
  }
  
  // Knowledge Section
  if (analysis.knowledge_domains.length > 0 && sectionCount < options.maxSections) {
    sections.push('## 🧠 Knowledge Areas');
    sections.push(`**Domains:** ${analysis.knowledge_domains.join(', ')}`);
    
    if (analysis.reasoning_levels.length > 0) {
      sections.push(`**Depth:** ${formatReasoningLevels(analysis.reasoning_levels)}`);
    }
    
    sections.push('');
    sectionCount++;
  }
  
  // Feedback Section
  if (analysis.feedback_patterns.length > 0 && sectionCount < options.maxSections) {
    sections.push('## 🔄 Communication Feedback');
    const feedback = formatFeedbackPatterns(analysis.feedback_patterns);
    sections.push(feedback);
    sections.push('');
    sectionCount++;
  }
  
  // Clarifications Section
  if (analysis.clarifications.length > 0 && sectionCount < options.maxSections) {
    sections.push('## 🗣️ Clarifications Provided');
    const clarifications = formatClarifications(analysis.clarifications);
    sections.push(clarifications);
    sections.push('');
    sectionCount++;
  }
  
  // Metadata Section
  if (options.includeMetadata && sectionCount < options.maxSections) {
    sections.push('## 📊 Session Metrics');
    sections.push(`**Total Interactions:** ${analysis.total_interactions}`);
    sections.push(`**Primary Agent:** ${agentName}`);
    sections.push('');
  }
  
  // Footer with save option
  sections.push('---');
  sections.push('');
  sections.push('💾 **Would you like me to save this summary to your memory?** Just let me know, and I\'ll store it for future reference!');
  
  return sections.join('\n');
}

/**
 * Helper functions
 */

function extractGoalFromSummary(summary: string): string {
  // Extract goal description from various summary formats
  if (summary.includes('goal:')) {
    return summary.split('goal:')[1].split('|')[0].trim();
  }
  
  if (summary.includes('Goal')) {
    return summary.split('Goal')[1].split(' - ')[0].trim();
  }
  
  // Fallback to first meaningful part of summary
  const cleaned = summary.replace(/^(creative_goal:|research_goal:|automation_goal:)/i, '').trim();
  return cleaned.length > 50 ? cleaned.substring(0, 50) + '...' : cleaned;
}

function isQuestion(input: string): boolean {
  const questionWords = ['what', 'how', 'why', 'when', 'where', 'which', 'who', 'can you', 'could you', 'would you'];
  const lowerInput = input.toLowerCase();
  
  return input.includes('?') || 
         questionWords.some(word => lowerInput.startsWith(word)) ||
         lowerInput.includes('explain') ||
         lowerInput.includes('help me understand');
}

function extractDomains(tags: string[]): string[] {
  const knowledgeDomains = tags.filter(tag => 
    !['log', 'feedback', 'clarification_requested', 'goal_tracking', 'user_preference'].includes(tag) &&
    !tag.startsWith('reasoning_') &&
    !tag.startsWith('status_') &&
    tag.length > 2
  );
  
  return knowledgeDomains;
}

function extractReasoningLevels(tags: string[]): string[] {
  return tags
    .filter(tag => tag.startsWith('reasoning_'))
    .map(tag => tag.replace('reasoning_', ''));
}

function hasGoalActivity(goals: SessionAnalysis['goals']): boolean {
  return goals.worked_on.length > 0 || 
         goals.completed.length > 0 || 
         goals.abandoned.length > 0 || 
         goals.in_progress.length > 0;
}

function getAgentDisplayName(agentId: string): string {
  const names: Record<string, string> = {
    'research': '🔬 Research Assistant',
    'creative': '✨ Creative Assistant', 
    'automation': '⚙️ Automation Assistant',
    'router': '🔀 AI Router'
  };
  
  return names[agentId] || '🤖 AI Assistant';
}

function formatReasoningLevels(levels: string[]): string {
  const levelMap: Record<string, string> = {
    'basic': 'Simplified explanations',
    'intermediate': 'Balanced detail',
    'advanced': 'Technical depth'
  };
  
  return levels.map(level => levelMap[level] || level).join(', ');
}

function formatFeedbackPatterns(patterns: string[]): string {
  const patternMap: Record<string, string> = {
    'positive': '✅ Positive responses received',
    'confused': '🤔 Clarification requests addressed', 
    'negative': '🔄 Adjustments made based on feedback',
    'retry': '🔁 Alternative approaches provided',
    'neutral': '⚪ Neutral interactions'
  };
  
  return patterns.map(pattern => patternMap[pattern] || pattern).join('\n');
}

function formatClarifications(clarifications: string[]): string {
  const clarificationMap: Record<string, string> = {
    'vague': 'Helped refine unclear requests',
    'missing_subject': 'Identified missing context',
    'underspecified_goal': 'Clarified objectives and outcomes',
    'ambiguous_context': 'Resolved ambiguous references'
  };
  
  return clarifications.map(c => `• ${clarificationMap[c] || c}`).join('\n');
}

/**
 * Detect if user is requesting a session summary
 */
export function detectSummaryRequest(input: string): boolean {
  const lowerInput = input.toLowerCase();
  
  const summaryTriggers = [
    'summarize this session',
    'summarize our conversation', 
    'what did we do today',
    'what did we accomplish',
    'what have we covered',
    'session summary',
    'recap our discussion',
    'what did we work on',
    'show me what we did',
    'review our session'
  ];
  
  return summaryTriggers.some(trigger => lowerInput.includes(trigger));
}

/**
 * Detect if user wants to save the summary
 */
export function detectSaveSummaryRequest(input: string): boolean {
  const lowerInput = input.toLowerCase();
  
  const saveTriggers = [
    'save this summary',
    'save the summary',
    'store this summary',
    'remember this session',
    'save our conversation',
    'keep this summary',
    'add to memory'
  ];
  
  return saveTriggers.some(trigger => lowerInput.includes(trigger));
}

/**
 * Detect session ending phrases
 */
export function detectSessionEnding(input: string): boolean {
  const lowerInput = input.toLowerCase();
  
  const endingPhrases = [
    'that\'s all for now',
    'thanks for your help',
    'thank you',
    'that\'s everything',
    'we\'re done',
    'that covers it',
    'perfect, thanks',
    'great, that\'s all',
    'goodbye',
    'see you later',
    'that\'s it for today'
  ];
  
  return endingPhrases.some(phrase => lowerInput.includes(phrase));
}

/**
 * Check if session is complex enough to warrant a summary offer
 */
export function shouldOfferSummary(memory: MemoryEntry[], minInteractions: number = 4): boolean {
  const recentEntries = filterSessionEntries(memory);
  const analysis = analyzeSession(recentEntries);
  
  return analysis.total_interactions >= minInteractions || 
         hasGoalActivity(analysis.goals) ||
         analysis.questions.length >= 3 ||
         analysis.knowledge_domains.length >= 2;
}