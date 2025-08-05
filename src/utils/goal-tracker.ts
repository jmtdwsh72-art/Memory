import { MemoryEntry } from './types';

export interface GoalProgressResult {
  status: 'in_progress' | 'completed' | 'abandoned' | null;
  reason?: string;
  confidence?: number;
  relatedGoalId?: string;
  progressIndicators?: string[];
}

interface ProgressPattern {
  type: GoalProgressResult['status'];
  patterns: RegExp[];
  keywords: string[];
  weight: number;
  reasons: string[];
}

// Patterns that indicate goal progress updates
const progressPatterns: ProgressPattern[] = [
  // Completion patterns
  {
    type: 'completed',
    patterns: [
      /^(it's|its|i've|ive)\s+(done|finished|complete|completed|ready|working|live)$/i,
      /^(i\s+)?(finished|completed|done with|wrapped up|launched|deployed|shipped)(\s+the|\s+it|\s+this|\s+that)?$/i,
      /^(all\s+)?(done|finished|complete|sorted|working|ready)(\s+now|\s+finally)?(\!|\.)?$/i,
      /^(thanks|thank you|great|perfect|awesome),?\s+(all\s+)?(done|finished|sorted|complete|working)$/i,
      /^(success|successfully|got it working|it works|working now|up and running)(\!|\.)?$/i
    ],
    keywords: [
      'finished', 'completed', 'done', 'launched', 'deployed', 'shipped', 'ready',
      'working', 'live', 'success', 'successfully', 'accomplished', 'achieved',
      'wrapped up', 'all set', 'sorted', 'complete', 'finalized'
    ],
    weight: 1.2,
    reasons: [
      'User indicated task completion',
      'Goal achieved successfully',
      'Project launched or deployed',
      'Work finished and functional'
    ]
  },
  
  // In-progress patterns
  {
    type: 'in_progress',
    patterns: [
      /^(i\s+)?(finished|completed|done with)\s+(the\s+)?(first|second|third|next|\d+\w*)\s+(part|step|stage|phase)$/i,
      /^(i've|ive)\s+(now|just|already)\s+(set up|configured|installed|created|built)(\s+the)?$/i,
      /^(making\s+)?(good\s+)?progress(\s+on|\s+with)?(\s+the|\s+this|\s+it)?$/i,
      /^(got|have)\s+(the\s+)?(first|initial|basic)\s+(part|version|setup)\s+(done|working)$/i,
      /^(halfway|partway|almost)\s+(done|there|finished)$/i
    ],
    keywords: [
      'progress', 'halfway', 'partway', 'continuing', 'working on', 'in the middle',
      'next step', 'moving forward', 'making headway', 'getting there', 'ongoing',
      'currently working', 'just finished the', 'completed part', 'done with the first'
    ],
    weight: 1.0,
    reasons: [
      'User reported partial completion',
      'Working through multiple steps',
      'Making incremental progress',
      'Continuing previous work'
    ]
  },
  
  // Abandonment patterns
  {
    type: 'abandoned',
    patterns: [
      /^(i've|ive)\s+(decided|chosen)\s+(not\s+to|against)(\s+continue|\s+proceeding|\s+doing)(\s+this|\s+it|\s+that)?$/i,
      /^(not\s+)?(relevant|needed|important|priority)\s+(anymore|any\s+more|now)$/i,
      /^(gave\s+up|giving\s+up|stopped\s+working)\s+(on\s+)?(this|it|that)$/i,
      /^(different\s+)?(approach|direction|priority|focus)\s+(now|instead)$/i,
      /^(shelving|postponing|pausing|putting\s+on\s+hold)\s+(this|it|that)(\s+for\s+now)?$/i
    ],
    keywords: [
      'gave up', 'giving up', 'stopped', 'not relevant', 'different approach',
      'changed mind', 'not needed', 'shelving', 'postponing', 'putting on hold',
      'decided against', 'no longer', 'different priority', 'abandoned',
      'cancelled', 'not pursuing', 'different direction'
    ],
    weight: 1.1,
    reasons: [
      'User decided to discontinue',
      'Changed priorities or approach',
      'No longer relevant or needed',
      'Project put on hold'
    ]
  }
];

// Progress indicator phrases that suggest ongoing work
const progressIndicators = [
  'working on', 'in progress', 'currently', 'next step', 'moving forward',
  'getting there', 'making progress', 'continuing with', 'halfway through',
  'almost done', 'getting close', 'on track', 'proceeding with'
];

// Completion indicator phrases
const completionIndicators = [
  'all done', 'finished', 'completed', 'ready', 'working', 'live',
  'deployed', 'launched', 'shipped', 'success', 'accomplished',
  'achieved', 'wrapped up', 'sorted', 'complete', 'finalized'
];

// Abandonment indicator phrases
const abandonmentIndicators = [
  'gave up', 'stopped', 'not relevant', 'decided against', 'different approach',
  'changed mind', 'shelving', 'postponing', 'no longer', 'cancelled'
];

/**
 * Detect goal progress updates from user input
 */
export function detectGoalProgress(
  input: string,
  memory: MemoryEntry[]
): GoalProgressResult {
  const trimmedInput = input.trim();
  const lowerInput = trimmedInput.toLowerCase();
  
  // Skip very short inputs that are unlikely to contain progress updates
  if (trimmedInput.length < 8) {
    return { status: null };
  }
  
  // Get recent goals from memory for context
  const recentGoals = getRecentGoals(memory);
  
  let bestMatch: GoalProgressResult = {
    status: null,
    confidence: 0,
    progressIndicators: []
  };
  
  // Check each progress pattern
  for (const pattern of progressPatterns) {
    let patternScore = 0;
    const matchedIndicators: string[] = [];
    
    // Check regex patterns
    for (const regex of pattern.patterns) {
      if (regex.test(lowerInput)) {
        patternScore += 0.6 * pattern.weight;
        break;
      }
    }
    
    // Check keywords
    const keywordMatches = pattern.keywords.filter(keyword => 
      lowerInput.includes(keyword.toLowerCase())
    );
    
    if (keywordMatches.length > 0) {
      patternScore += (keywordMatches.length * 0.4) * pattern.weight;
      matchedIndicators.push(...keywordMatches);
    }
    
    // Boost score if we have context from recent goals
    if (patternScore > 0 && recentGoals.length > 0) {
      patternScore += 0.2; // Context boost
    }
    
    // Update best match if this pattern scores higher
    if (patternScore > (bestMatch.confidence || 0)) {
      const relatedGoal = findMostRelevantGoal(input, recentGoals);
      
      bestMatch = {
        status: pattern.type,
        reason: pattern.reasons[Math.floor(Math.random() * pattern.reasons.length)],
        confidence: Math.min(patternScore, 1.0),
        relatedGoalId: relatedGoal?.goalId,
        progressIndicators: matchedIndicators
      };
    }
  }
  
  // Only return results with reasonable confidence
  if ((bestMatch.confidence || 0) >= 0.5) {
    return bestMatch;
  }
  
  return { status: null };
}

/**
 * Get recent goals from memory for context
 */
function getRecentGoals(memory: MemoryEntry[]): MemoryEntry[] {
  return memory
    .filter(entry => 
      (entry.type === 'goal' || entry.type === 'goal_progress') && 
      entry.goalId && 
      entry.goalStatus !== 'completed' && 
      entry.goalStatus !== 'abandoned'
    )
    .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
    .slice(0, 5); // Get up to 5 most recent active goals
}

/**
 * Find the most relevant goal based on input content
 */
function findMostRelevantGoal(input: string, goals: MemoryEntry[]): MemoryEntry | null {
  if (goals.length === 0) return null;
  
  const inputWords = input.toLowerCase().split(/\s+/);
  
  let bestGoal: MemoryEntry | null = null;
  let bestScore = 0;
  
  for (const goal of goals) {
    const goalWords = [
      ...(goal.goalSummary || '').toLowerCase().split(/\s+/),
      ...(goal.summary || '').toLowerCase().split(/\s+/),
      ...(goal.input || '').toLowerCase().split(/\s+/)
    ];
    
    // Calculate word overlap score
    const overlap = inputWords.filter(word => 
      word.length > 3 && goalWords.some(goalWord => 
        goalWord.includes(word) || word.includes(goalWord)
      )
    ).length;
    
    const score = overlap / Math.max(inputWords.length, goalWords.length);
    
    if (score > bestScore) {
      bestScore = score;
      bestGoal = goal;
    }
  }
  
  // Return best goal if relevance score is reasonable
  return bestScore > 0.1 ? bestGoal : goals[0]; // Fallback to most recent
}

/**
 * Create a goal progress memory entry
 */
export function createGoalProgressMemory(
  originalInput: string,
  progressResult: GoalProgressResult,
  agentId: string,
  userId?: string
): Partial<MemoryEntry> {
  const timestamp = new Date();
  const goalId = progressResult.relatedGoalId || `goal_${timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: `progress_${timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
    agentId,
    userId,
    type: 'goal_progress',
    input: originalInput,
    summary: `Goal ${progressResult.status}: ${progressResult.reason}`,
    context: `Progress update detected: ${progressResult.progressIndicators?.join(', ') || 'status change'}`,
    goalId,
    goalSummary: `Goal tracked by ${agentId}`,
    goalStatus: progressResult.status || 'in_progress',
    lastAccessed: timestamp,
    createdAt: timestamp,
    frequency: 1,
    tags: [
      'goal_tracking',
      `status_${progressResult.status}`,
      agentId,
      'progress_update'
    ]
  };
}

/**
 * Get status-aware greeting based on user's goal history
 */
export function getStatusAwareGreeting(
  memory: MemoryEntry[],
  agentId: string
): string | null {
  const recentGoals = memory
    .filter(entry => 
      (entry.type === 'goal_progress' || entry.type === 'goal') && 
      entry.agentId === agentId
    )
    .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
    .slice(0, 3);
  
  if (recentGoals.length === 0) return null;
  
  const mostRecent = recentGoals[0];
  const goalSummary = mostRecent.goalSummary || 'your project';
  
  switch (mostRecent.goalStatus) {
    case 'in_progress':
      return `Welcome back! You're working on ${goalSummary} — want to continue where we left off?`;
    case 'completed':
      return `Great to see you again! Looks like you wrapped up ${goalSummary} — ready for the next challenge?`;
    case 'abandoned':
      return `Hey there! I see we paused work on ${goalSummary} — want to revisit it or tackle something new?`;
    default:
      return `Welcome back! I remember we were discussing ${goalSummary} — how can I help today?`;
  }
}

/**
 * Get congratulatory message for completed goals
 */
export function getCongratulationsMessage(goalSummary: string): string {
  const messages = [
    `🎉 Congratulations on completing ${goalSummary}! That's a significant achievement.`,
    `✅ Fantastic work finishing ${goalSummary}! You should be proud of that accomplishment.`,
    `🚀 Amazing! You've successfully completed ${goalSummary}. What's next on your horizon?`,
    `🌟 Excellent job wrapping up ${goalSummary}! Your persistence really paid off.`,
    `🎯 Outstanding! Completing ${goalSummary} shows great dedication and skill.`
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get supportive message for abandoned goals
 */
export function getAbandonmentMessage(goalSummary: string): string {
  const messages = [
    `I understand you've decided to step back from ${goalSummary}. That's perfectly okay — priorities change!`,
    `No worries about pausing ${goalSummary}. Sometimes the best decision is knowing when to pivot.`,
    `It's totally fine to shelf ${goalSummary} for now. Want to explore a different direction instead?`,
    `I see you've moved on from ${goalSummary}. That's part of the process — want to discuss what's next?`,
    `Completely understandable about ${goalSummary}. Ready to focus your energy on something else?`
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get encouraging message for ongoing progress
 */
export function getProgressMessage(goalSummary: string): string {
  const messages = [
    `Great progress on ${goalSummary}! You're really moving forward with this.`,
    `Nice work continuing with ${goalSummary}! Every step counts toward your goal.`,
    `Excellent momentum on ${goalSummary}! I can see you're making steady progress.`,
    `Fantastic job advancing ${goalSummary}! Your consistent effort is paying off.`,
    `Really pleased to see your progress on ${goalSummary}! You're on the right track.`
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
}