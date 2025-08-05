import { MemoryEntry } from './types';

/**
 * Formats relevant memories into natural language insights
 * Filters out system artifacts and presents user-friendly context
 */
export function formatRelevantMemories(memories: MemoryEntry[], topic: string): string {
  if (!memories || memories.length === 0) return '';
  
  // Filter out system/clarification memories unless directly relevant
  const relevantMemories = memories.filter(memory => {
    const isSystemMemory = memory.type === 'clarification' || 
                          memory.type === 'pattern' ||
                          memory.tags?.includes('vague_input');
    
    // Keep system memories only if they're about the current topic
    if (isSystemMemory) {
      const topicWords = topic.toLowerCase().split(/\s+/);
      const memorySummary = (memory.summary || '').toLowerCase();
      return topicWords.some(word => word.length > 3 && memorySummary.includes(word));
    }
    
    return true;
  });
  
  if (relevantMemories.length === 0) return '';
  
  // Take most recent and relevant memories
  const topMemories = relevantMemories
    .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
    .slice(0, 2);
  
  // Build natural language insights
  const insights = topMemories.map(memory => {
    const summary = cleanMemorySummary(memory.summary || '');
    
    // Skip if summary is too generic
    if (isGenericSummary(summary)) return null;
    
    // Format based on memory type
    switch (memory.type) {
      case 'goal':
      case 'goal_progress':
        return formatGoalMemory(summary, memory);
      case 'session_summary':
        return formatSessionMemory(summary);
      case 'conversation':
        return formatConversationMemory(summary);
      default:
        return formatGeneralMemory(summary);
    }
  }).filter(Boolean);
  
  if (insights.length === 0) return '';
  
  // Join insights naturally
  if (insights.length === 1) {
    return insights[0] as string;
  }
  
  return `${insights[0]}. Also, ${insights[1]?.toLowerCase()}`;
}

/**
 * Removes system artifacts from memory summaries
 */
function cleanMemorySummary(summary: string): string {
  return summary
    // Remove timestamps
    .replace(/\[?\d{4}-\d{2}-\d{2}T[\d:.Z-]+\]?\s*/g, '')
    // Remove memory type prefixes
    .replace(/^(automation_goal:|research_goal:|creative_goal:|ROUTING_HANDOFF:|Agent:)/i, '')
    // Remove response prefixes
    .replace(/^(automation_response:|research_response:|creative_response:)/i, '')
    // Remove reasoning level tags
    .replace(/\|\s*reasoning:\s*\w+/g, '')
    // Remove ellipsis placeholders
    .replace(/\.\.\.\s*$/g, '')
    // Clean up extra whitespace
    .trim();
}

/**
 * Checks if a summary is too generic to be useful
 */
function isGenericSummary(summary: string): boolean {
  const genericPatterns = [
    /^understanding your specific needs/i,
    /^user asked for help/i,
    /^clarification requested/i,
    /^vague input detected/i,
    /^continuing from/i
  ];
  
  return genericPatterns.some(pattern => pattern.test(summary));
}

/**
 * Formats goal-related memories
 */
function formatGoalMemory(summary: string, memory: MemoryEntry): string {
  const goalSummary = memory.goalSummary || summary;
  const cleanGoal = cleanMemorySummary(goalSummary);
  
  if (memory.type === 'goal_progress') {
    return `you mentioned working on ${cleanGoal}`;
  }
  
  return `you're exploring ${cleanGoal}`;
}

/**
 * Formats session summary memories
 */
function formatSessionMemory(summary: string): string {
  const cleanSummary = summary
    .replace(/session summary:/i, '')
    .replace(/generated on \d{1,2}\/\d{1,2}\/\d{4}/i, '')
    .trim();
  
  // Extract key topics from the summary
  const topics = cleanSummary
    .split(/[,.]/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.includes('session'))
    .slice(0, 2);
  
  if (topics.length > 0) {
    return `we previously discussed ${topics.join(' and ')}`;
  }
  
  return '';
}

/**
 * Formats conversation memories
 */
function formatConversationMemory(summary: string): string {
  const cleanSummary = cleanMemorySummary(summary);
  
  // Look for action words to make it more natural
  if (cleanSummary.includes('learn')) {
    return `you were interested in learning ${cleanSummary.replace(/.*learn(ing)?\s+/i, '')}`;
  }
  
  if (cleanSummary.includes('automat')) {
    return `you wanted to automate ${cleanSummary.replace(/.*automat(e|ing)?\s+/i, '')}`;
  }
  
  if (cleanSummary.includes('creat') || cleanSummary.includes('design')) {
    return `you were creating ${cleanSummary.replace(/.*creat(e|ing)?\s+/i, '')}`;
  }
  
  return `you asked about ${cleanSummary}`;
}

/**
 * Formats general memories
 */
function formatGeneralMemory(summary: string): string {
  const cleanSummary = cleanMemorySummary(summary);
  
  // Make it conversational
  if (cleanSummary.length > 50) {
    const firstPart = cleanSummary.substring(0, 50).trim();
    return `you shared thoughts on ${firstPart}`;
  }
  
  return `you mentioned ${cleanSummary}`;
}

/**
 * Generates a natural contextual intro based on memory
 */
export function generateMemoryAwareIntro(memories: MemoryEntry[], topic: string, agentType: string): string {
  const memoryContext = formatRelevantMemories(memories, topic);
  
  if (!memoryContext) {
    return '';
  }
  
  // Agent-specific memory intros
  switch (agentType) {
    case 'research':
      return `Building on what ${memoryContext}, `;
    case 'creative':
      return `Since ${memoryContext}, `;
    case 'automation':
      return `Following up on how ${memoryContext}, `;
    default:
      return `Considering that ${memoryContext}, `;
  }
}