export interface FinalResponseContext {
  recentGoal?: string;
  reasoningLevel: 'basic' | 'intermediate' | 'advanced';
  feedbackType?: 'positive' | 'confused' | 'request_clarification' | null;
  isSessionEnd: boolean;
  agentPersonality: string;
  knowledgeDomain?: string;
  userInput: string;
  hasMemoryContext: boolean;
  sessionComplexity?: 'simple' | 'moderate' | 'complex';
  responseStrategy?: 'direct_answer' | 'guided_discovery' | 'structured_framework' | 'clarification_first';
  confidence?: number;
  toolsUsed?: {
    useMemory: boolean;
    useKnowledge: boolean;
    useSearch: boolean;
    askClarifyingQuestions: boolean;
  };
}

export interface FinalResponseOptions {
  includeFollowUp?: boolean;
  maxLines?: number;
  includeMemoryOffer?: boolean;
}

interface AgentPersonality {
  sessionEndClosings: string[];
  goalProgressReflections: string[];
  confusedApologies: string[];
  defaultFollowUps: string[];
  memoryOffers: string[];
  signature: string;
}

/**
 * Compose a thoughtful, goal-aware closing for agent responses
 */
export function composeFinalResponse(
  agentId: string, 
  context: FinalResponseContext,
  options: FinalResponseOptions = {}
): string {
  const { 
    includeFollowUp = true, 
    maxLines = 4, 
    includeMemoryOffer = false 
  } = options;
  
  const personality = getAgentPersonality(agentId);
  const sections: string[] = [];
  
  // 1. Handle confusion/clarification requests first
  if (context.feedbackType === 'confused' || context.feedbackType === 'request_clarification') {
    const apology = selectRandomItem(personality.confusedApologies);
    sections.push(apology);
  }
  
  // 2. Reflect on goal progress if applicable
  if (context.recentGoal && !context.isSessionEnd) {
    const goalReflection = selectRandomItem(personality.goalProgressReflections)
      .replace('[goal]', context.recentGoal);
    sections.push(goalReflection);
  }
  
  // 3. Handle session endings with special closings
  if (context.isSessionEnd) {
    const sessionClosing = selectRandomItem(personality.sessionEndClosings);
    sections.push(sessionClosing);
    
    // Add memory storage offer for session endings
    if (includeMemoryOffer || context.sessionComplexity === 'complex') {
      const memoryOffer = selectRandomItem(personality.memoryOffers);
      sections.push(memoryOffer);
    }
  } else if (includeFollowUp) {
    // 4. Add contextual follow-up questions/invitations
    // Special handling for basic coding/learning - avoid "Would you like me to help..." unless low confidence
    const shouldSuppressFollowUp = (
      context.reasoningLevel === 'basic' && 
      context.knowledgeDomain === 'coding' &&
      !context.feedbackType
    );
    
    if (!shouldSuppressFollowUp) {
      const followUp = generateContextualFollowUp(agentId, context, personality);
      if (followUp) {
        sections.push(followUp);
      }
    }
  }
  
  // 5. Add agent signature (if space allows)
  if (sections.length < maxLines) {
    sections.push(personality.signature);
  }
  
  // Combine sections and ensure we don't exceed maxLines
  const finalClosing = sections.slice(0, maxLines).join('\n\n');
  
  return finalClosing;
}

/**
 * Generate contextual follow-up based on agent type and context
 */
function generateContextualFollowUp(
  agentId: string,
  context: FinalResponseContext,
  personality: AgentPersonality
): string | null {
  // Don't add follow-ups if user is clearly ending session
  if (detectGoodbyeIntent(context.userInput)) {
    return null;
  }
  
  const followUps = getContextualFollowUps(agentId, context);
  
  // Fallback to default personality follow-ups
  if (followUps.length === 0) {
    return selectRandomItem(personality.defaultFollowUps);
  }
  
  return selectRandomItem(followUps);
}

/**
 * Get contextual follow-ups based on agent and domain
 */
function getContextualFollowUps(agentId: string, context: FinalResponseContext): string[] {
  const followUps: string[] = [];
  
  // Add strategy-specific follow-ups based on the response strategy used
  if (context.responseStrategy) {
    const strategyFollowUps = getStrategySpecificFollowUps(context.responseStrategy, context);
    followUps.push(...strategyFollowUps);
  }
  
  // Add tool-usage specific follow-ups
  if (context.toolsUsed) {
    const toolFollowUps = getToolBasedFollowUps(context.toolsUsed, context);
    followUps.push(...toolFollowUps);
  }
  
  switch (agentId) {
    case 'research':
      if (context.knowledgeDomain) {
        followUps.push(
          `**Want me to explore ${context.knowledgeDomain} further or move to a related area?**`,
          `**Should I log this ${context.knowledgeDomain} research for your next session?**`,
          `**Ready to dive deeper into any specific aspect of ${context.knowledgeDomain}?**`
        );
      }
      
      if (context.reasoningLevel === 'basic') {
        // For basic coding queries, use more actionable follow-ups
        if (context.knowledgeDomain === 'coding') {
          followUps.push(
            '**Ready to start with a simple first project?**',
            '**Want me to suggest some beginner-friendly resources?**',
            '**Should I create a study plan for your learning goals?**'
          );
        } else {
          followUps.push(
            '**Want me to break this down into even simpler steps?**',
            '**Should I provide some examples to make this clearer?**'
          );
        }
      } else if (context.reasoningLevel === 'advanced') {
        followUps.push(
          '**Shall I analyze the technical implications or edge cases?**',
          '**Want me to explore the theoretical foundations deeper?**'
        );
      }
      break;
      
    case 'creative':
      if (context.knowledgeDomain) {
        followUps.push(
          `**Ready to brainstorm more ${context.knowledgeDomain} concepts?**`,
          `**Want to explore a different creative angle on ${context.knowledgeDomain}?**`,
          `**Should we develop any of these ${context.knowledgeDomain} ideas further?**`
        );
      }
      
      if (context.recentGoal) {
        followUps.push(
          `**Excited to iterate on ${context.recentGoal} with you—what's calling to you most?**`,
          `**Ready to bring ${context.recentGoal} to the next creative level?**`
        );
      }
      
      followUps.push(
        '**Which creative direction feels most inspiring to you right now?**',
        '**Want to explore any wild, unconventional approaches?**',
        '**Should we create variations on the theme or go in a completely new direction?**'
      );
      break;
      
    case 'automation':
      if (context.knowledgeDomain) {
        followUps.push(
          `**Want me to optimize the ${context.knowledgeDomain} workflow further?**`,
          `**Should I create templates or scripts for this ${context.knowledgeDomain} process?**`,
          `**Ready to automate another aspect of ${context.knowledgeDomain}?**`
        );
      }
      
      if (context.recentGoal) {
        followUps.push(
          `**Ready to test the ${context.recentGoal} system we've built?**`,
          `**Want me to document the ${context.recentGoal} process for future use?**`
        );
      }
      
      followUps.push(
        '**Should we test this automation with a real scenario?**',
        '**Want me to create a checklist or template for this process?**',
        '**Ready to optimize the next bottleneck in your workflow?**'
      );
      break;
  }
  
  return followUps;
}

/**
 * Get agent personality configuration
 */
function getAgentPersonality(agentId: string): AgentPersonality {
  const personalities: Record<string, AgentPersonality> = {
    research: {
      sessionEndClosings: [
        'Great research session! I\'ve gathered valuable insights to build on next time.',
        'Excellent analysis work. These findings will serve as a solid foundation.',
        'Productive research! I\'ll remember these insights for our future investigations.',
        'Solid progress on the research front. Ready to dive deeper anytime!'
      ],
      goalProgressReflections: [
        'You\'re building excellent momentum on [goal]—the research is really paying off.',
        'Your progress on [goal] shows thoughtful, systematic investigation.',
        'The [goal] research is developing nicely with these structured insights.'
      ],
      confusedApologies: [
        'Let me clarify that better—I want to make sure this research is crystal clear.',
        'I may have jumped ahead too quickly. Let me break this down step by step.',
        'That explanation might have been too dense. Let me approach it differently.'
      ],
      defaultFollowUps: [
        '**Want me to log this insight and prepare for next steps?**',
        '**Ready to explore related research questions?**',
        '**Should I dive deeper into any particular aspect?**'
      ],
      memoryOffers: [
        '**I can store today\'s research findings for future reference—shall I do that?**',
        '**Want me to log these insights as a research milestone?**'
      ],
      signature: '🔬 *Always here for your next research deep-dive.*'
    },
    
    creative: {
      sessionEndClosings: [
        'What a fantastic creative journey! Your imagination is really flourishing.',
        'Amazing creative work today! Those ideas have so much potential.',
        'Brilliant brainstorming session! I can feel the creative energy building.',
        'Incredible creative exploration! You\'re onto something truly exciting.'
      ],
      goalProgressReflections: [
        'You\'re on the edge of something exciting with [goal]—the creative energy is flowing!',
        'Your [goal] vision is really taking shape beautifully.',
        'The [goal] concepts are evolving wonderfully—you\'re in the creative zone!'
      ],
      confusedApologies: [
        'Let me spark a clearer creative direction—I want these ideas to truly inspire you.',
        'My creative enthusiasm might have gotten ahead of clarity. Let me refocus.',
        'That creative leap might have been too big. Let me build up to it more gradually.'
      ],
      defaultFollowUps: [
        '**You\'re on the edge of something exciting—shall we refine this further?**',
        '**Ready to explore even wilder creative possibilities?**',
        '**Want to develop any of these concepts into something concrete?**'
      ],
      memoryOffers: [
        '**I can preserve today\'s creative insights for future inspiration—interested?**',
        '**Want me to save these creative concepts as a creative milestone?**'
      ],
      signature: '✨ *Always ready to spark your next creative breakthrough.*'
    },
    
    automation: {
      sessionEndClosings: [
        'Excellent optimization work! These process improvements will save significant time.',
        'Great automation session! Your workflows are becoming much more efficient.',
        'Solid process engineering! These systems will run like clockwork.',
        'Outstanding efficiency gains! Your automated workflows are really taking shape.'
      ],
      goalProgressReflections: [
        'We\'re optimizing [goal] beautifully—the efficiency gains are really adding up.',
        'Your [goal] automation is developing excellent systematic improvements.',
        'The [goal] workflow is becoming increasingly streamlined and effective.'
      ],
      confusedApologies: [
        'Let me simplify that process—I want these automations to be completely clear.',
        'That workflow might have been too complex. Let me break it into clearer steps.',
        'I may have over-engineered that solution. Let me focus on the essentials.'
      ],
      defaultFollowUps: [
        '**We\'re optimizing well—should I save this system for later use?**',
        '**Ready to test this automation with real data?**',
        '**Want to streamline another process while we\'re in optimization mode?**'
      ],
      memoryOffers: [
        '**I can document this automation strategy for future process improvements—useful?**',
        '**Want me to save these workflow optimizations as a process milestone?**'
      ],
      signature: '⚙️ *Always here to streamline your next workflow challenge.*'
    }
  };
  
  return personalities[agentId] || personalities.research;
}

/**
 * Detect if user input suggests they're ending the session
 */
function detectGoodbyeIntent(input: string): boolean {
  const lowerInput = input.toLowerCase();
  const goodbyePatterns = [
    'goodbye', 'bye', 'see you', 'thanks for', 'that\'s all', 'that\'s everything',
    'done for now', 'talk later', 'until next time', 'catch you later'
  ];
  
  return goodbyePatterns.some(pattern => lowerInput.includes(pattern));
}

/**
 * Select a random item from an array
 */
function selectRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Detect session complexity based on context
 */
export function assessSessionComplexity(context: FinalResponseContext): 'simple' | 'moderate' | 'complex' {
  let complexityScore = 0;
  
  // Goal involvement adds complexity
  if (context.recentGoal) complexityScore += 1;
  
  // Memory context adds complexity
  if (context.hasMemoryContext) complexityScore += 1;
  
  // Advanced reasoning adds complexity
  if (context.reasoningLevel === 'advanced') complexityScore += 1;
  
  // Knowledge domain involvement adds complexity
  if (context.knowledgeDomain) complexityScore += 1;
  
  // Feedback interaction adds complexity
  if (context.feedbackType) complexityScore += 1;
  
  if (complexityScore >= 3) return 'complex';
  if (complexityScore >= 2) return 'moderate';
  return 'simple';
}

/**
 * Create a session decision memory entry
 */
export function createSessionDecisionMemory(
  decision: string,
  context: FinalResponseContext,
  agentId: string,
  userId?: string
): {
  input: string;
  output: string;
  context: string;
  type: 'session_decision';
  tags: string[];
} {
  const timestamp = new Date();
  
  return {
    input: context.userInput,
    output: decision,
    context: `Session decision made: ${decision} | Agent: ${agentId} | Complexity: ${assessSessionComplexity(context)}`,
    type: 'session_decision' as const,
    tags: [
      'session_decision',
      agentId,
      `reasoning_${context.reasoningLevel}`,
      `complexity_${assessSessionComplexity(context)}`,
      timestamp.toISOString().split('T')[0] // Add date tag
    ]
  };
}

/**
 * Check if response should include memory storage offer
 */
export function shouldOfferMemoryStorage(context: FinalResponseContext): boolean {
  const complexity = assessSessionComplexity(context);
  
  return (
    context.isSessionEnd && complexity === 'complex'
  ) || (
    context.recentGoal && context.hasMemoryContext
  ) || (
    context.knowledgeDomain && context.reasoningLevel === 'advanced'
  );
}

/**
 * Get follow-ups based on the response strategy used
 */
function getStrategySpecificFollowUps(strategy: string, context: FinalResponseContext): string[] {
  const followUps: string[] = [];
  
  switch (strategy) {
    case 'clarification_first':
      if (context.confidence && context.confidence > 0.5) {
        followUps.push(
          '**Ready to dive deeper now that I understand your needs better?**',
          '**Should I provide a more detailed analysis based on your clarification?**'
        );
      }
      break;
      
    case 'guided_discovery':
      followUps.push(
        '**Want to explore any of these discoveries further?**',
        '**Should we investigate a different angle or go deeper on what we found?**',
        '**Ready to apply these insights to your specific situation?**'
      );
      break;
      
    case 'structured_framework':
      followUps.push(
        '**Want me to expand on any part of this framework?**',
        '**Should we apply this structure to a specific example?**',
        '**Ready to move to the implementation phase?**'
      );
      break;
      
    case 'direct_answer':
      if (context.confidence && context.confidence > 0.8) {
        followUps.push(
          '**Any follow-up questions on this solution?**',
          '**Want me to help you implement this approach?**'
        );
      }
      break;
  }
  
  return followUps;
}

/**
 * Get follow-ups based on which tools were used in the response
 */
function getToolBasedFollowUps(tools: FinalResponseContext['toolsUsed'], context: FinalResponseContext): string[] {
  const followUps: string[] = [];
  
  if (!tools) return followUps;
  
  if (tools.useSearch) {
    followUps.push(
      '**Want me to search for more recent information on this topic?**',
      '**Should I look up related topics or dig deeper into the current results?**'
    );
  }
  
  if (tools.useKnowledge) {
    followUps.push(
      '**Want me to apply this knowledge to a specific use case?**',
      '**Should I explore related concepts or go deeper into the technical details?**'
    );
  }
  
  if (tools.useMemory && context.hasMemoryContext) {
    followUps.push(
      '**Should I build on what we discussed previously?**',
      '**Want me to connect this to your other ongoing projects?**'
    );
  }
  
  // If no advanced tools were used, suggest them
  if (!tools.useSearch && !tools.useKnowledge && context.reasoningLevel !== 'basic') {
    followUps.push(
      '**Want me to research the latest developments in this area?**',
      '**Should I look up additional resources or examples?**'
    );
  }
  
  return followUps;
}