import { detectRequestType, extractTopic, getUrgencyLevel } from './input-interpreter';
import { planResponseDepth, shouldIncludeClarifications, getResponseTone, type InputAnalysis } from './reasoning-planner';
import { generateStructuredResponsePlan, type AgentType, type ResponseTone } from './response-shaper';
import { formatRelevantMemories, generateMemoryAwareIntro } from './memory-natural-formatter';
import { MemoryEntry } from './types';

export interface GenerateAgentResponseParams {
  userInput: string;
  memoryContext: string[];
  agentType: 'research' | 'creative' | 'automation';
  personality: 'analytical' | 'inspirational' | 'directive';
}

// Generate personalized intros based on topic
function generatePersonalizedIntro(topic: string, agentType: AgentType, tone: ResponseTone): string {
  const topicLower = topic.toLowerCase();
  
  if (agentType === 'research') {
    if (topicLower.includes('learn') && topicLower.includes('code')) {
      return "Great — here's how I'd recommend starting with coding";
    }
    if (topicLower.includes('research')) {
      return "I've gathered the latest insights on this";
    }
    return "Let me break this down for you";
  }
  
  if (agentType === 'creative') {
    if (topicLower.includes('fashion') || topicLower.includes('brand')) {
      return "Let's unlock a few angles that could define your brand vibe";
    }
    if (topicLower.includes('ideas')) {
      return "Here are some fresh directions to spark your creativity";
    }
    return "Let's explore some creative possibilities";
  }
  
  if (agentType === 'automation') {
    if (topicLower.includes('client') || topicLower.includes('onboarding')) {
      return "Here's how I'd structure your client onboarding flow";
    }
    if (topicLower.includes('appointment') || topicLower.includes('booking')) {
      return "Let me map out your booking automation";
    }
    return "Here's your automation blueprint";
  }
  
  return "Let me help you with this";
}

// Generate smart closings only when needed
function generateSmartClosing(
  topic: string, 
  agentType: AgentType, 
  tone: ResponseTone,
  sections: Array<any>,
  confidence: number
): string | null {
  const topicLower = topic.toLowerCase();
  
  // Only add closing for vague requests or when user asked for help/guidance
  const needsClosing = topicLower.includes('help') || 
                      topicLower.includes('guide') ||
                      topicLower.includes('how') ||
                      confidence < 0.8 ||
                      sections.length <= 2;
  
  if (!needsClosing) {
    return null;
  }
  
  if (agentType === 'research' && topicLower.includes('learn')) {
    return "Need me to elaborate on any of these steps?";
  }
  
  if (agentType === 'creative' && sections.length > 2) {
    return "Which direction resonates with you?";
  }
  
  if (agentType === 'automation') {
    return "Ready to implement? I can walk you through any step.";
  }
  
  return null;
}

function mapRequestTypeToInputAnalysis(
  requestType: ReturnType<typeof detectRequestType>,
  topic: string,
  urgency: ReturnType<typeof getUrgencyLevel>
): InputAnalysis['requestType'] {
  switch (requestType) {
    case 'question':
      return 'question';
    case 'plan':
      return 'open_ended';
    case 'tutorial':
    case 'help':
      return 'task';
    case 'feedback':
    default:
      return 'open_ended';
  }
}

function generateClarifyingQuestions(
  topic: string,
  agentType: AgentType,
  confidence: number,
  depth: ResponseDepth
): string[] {
  // Only ask clarifying questions if confidence is low or request is basic
  if (confidence >= 0.9 || depth !== 'basic') {
    return [];
  }
  
  const topicLower = topic.toLowerCase();
  const questions: string[] = [];
  
  // Smart, context-aware questions
  if (agentType === 'research') {
    if (topicLower.includes('learn')) {
      questions.push("What's your programming background?");
      questions.push("Any specific language or framework in mind?");
    } else {
      questions.push("What do you plan to do with this information?");
    }
  }
  
  if (agentType === 'creative') {
    if (topicLower.includes('brand')) {
      questions.push("What's your target audience?");
      questions.push("Any style preferences or competitors you admire?");
    } else {
      questions.push("What's the end goal for this creative project?");
    }
  }
  
  if (agentType === 'automation') {
    if (topicLower.includes('appointment') || topicLower.includes('booking')) {
      questions.push("How many appointments do you handle weekly?");
      questions.push("What tools are you currently using?");
    } else {
      questions.push("What's the most time-consuming part of your process?");
    }
  }
  
  return questions.slice(0, 2);
}


function formatCleanResponse(
  intro: string,
  sections: Array<{ title: string; description: string; bulletPoints?: string[] }>,
  outro: string | null,
  clarifyingQuestions?: string[]
): string {
  let response = intro;
  
  // Add clarifying questions if needed (before main content)
  if (clarifyingQuestions && clarifyingQuestions.length > 0) {
    response += "\n\nA couple quick questions first:\n";
    clarifyingQuestions.forEach((q, i) => {
      response += `${i + 1}. ${q}\n`;
    });
    response += "\n";
  } else {
    response += "\n\n";
  }
  
  // Add main sections without markdown symbols
  sections.forEach((section, index) => {
    if (index > 0) response += "\n";
    
    response += `${section.title}\n`;
    response += `${section.description}`;
    
    if (section.bulletPoints && section.bulletPoints.length > 0) {
      response += "\n";
      section.bulletPoints.forEach(point => {
        response += `• ${point}\n`;
      });
    }
    
    response += "\n";
  });
  
  // Add outro only if provided
  if (outro) {
    response += `\n${outro}`;
  }
  
  return response.trim();
}

export async function generateAgentResponse({
  userInput,
  memoryContext,
  agentType,
  personality
}: GenerateAgentResponseParams): Promise<string> {
  // Step 1: Analyze input
  const requestType = detectRequestType(userInput);
  const topic = extractTopic(userInput);
  const urgency = getUrgencyLevel(userInput);
  
  // Create InputAnalysis object
  const inputAnalysis: InputAnalysis = {
    requestType: mapRequestTypeToInputAnalysis(requestType, topic, urgency),
    topic,
    urgency,
    confidence: topic.length > 4 ? 0.8 : 0.5
  };
  
  // Step 2: Plan response
  const depth = planResponseDepth(inputAnalysis);
  const needsClarification = shouldIncludeClarifications(inputAnalysis);
  const tone = getResponseTone(inputAnalysis) as ResponseTone;
  
  // Override tone with personality if provided
  const finalTone = personality || tone;
  
  // Step 3: Generate structured plan
  const { sections } = generateStructuredResponsePlan({
    topic,
    agentType,
    depth,
    tone: finalTone
  });
  
  // Step 4: Format memory context naturally
  const memoryEntries: MemoryEntry[] = memoryContext.map(summary => ({
    id: '',
    type: 'conversation',
    input: '',
    summary,
    context: '',
    createdAt: new Date(),
    lastAccessed: new Date(),
    accessCount: 1,
    agentId: agentType,
    userId: ''
  }));
  
  const memoryIntro = generateMemoryAwareIntro(memoryEntries, topic, agentType);
  const personalizedIntro = generatePersonalizedIntro(topic, agentType, finalTone);
  const intro = memoryIntro + personalizedIntro;
  
  // Generate clarifying questions if needed
  const clarifyingQuestions = needsClarification 
    ? generateClarifyingQuestions(topic, agentType, inputAnalysis.confidence, depth)
    : undefined;
  
  // Generate smart closing
  const outro = generateSmartClosing(topic, agentType, finalTone, sections, inputAnalysis.confidence);
  
  // Step 5: Format clean response
  const response = formatCleanResponse(
    intro,
    sections,
    outro,
    clarifyingQuestions
  );
  
  return response;
}