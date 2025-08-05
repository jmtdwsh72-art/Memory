export type InputAnalysis = {
  requestType: 'question' | 'goal' | 'task' | 'open_ended';
  topic: string;
  urgency: 'low' | 'medium' | 'high';
  confidence: number;
};

export type ResponseDepth = 'basic' | 'intermediate' | 'advanced';
export type ResponseTone = 'analytical' | 'inspirational' | 'directive';

const COMPLEX_TOPICS = new Set([
  'quantum', 'physics', 'mathematics', 'algorithm', 'cryptography',
  'machine learning', 'neural network', 'distributed systems',
  'compiler', 'operating system', 'blockchain', 'philosophy',
  'theoretical', 'abstract', 'calculus', 'topology', 'relativity'
]);

const EMOTIONAL_TOPICS = new Set([
  'stress', 'anxiety', 'depression', 'relationship', 'motivation',
  'confidence', 'fear', 'happiness', 'grief', 'mental health'
]);

const CREATIVE_TOPICS = new Set([
  'design', 'art', 'music', 'writing', 'storytelling', 'creative',
  'imagination', 'innovation', 'brainstorm', 'ideation', 'inspiration'
]);

const AUTOMATION_TOPICS = new Set([
  'workflow', 'automation', 'optimize', 'efficiency', 'productivity',
  'pipeline', 'ci/cd', 'devops', 'deployment', 'scaling', 'performance'
]);

export function planResponseDepth(input: InputAnalysis): ResponseDepth {
  const { requestType, topic, urgency } = input;
  const topicWords = topic.toLowerCase().split(/\s+/);
  
  // Check for complex topics
  const hasComplexTopic = topicWords.some(word => 
    COMPLEX_TOPICS.has(word) || word.length > 12
  );
  
  // Check for emotional topics (favor basic responses)
  const hasEmotionalTopic = topicWords.some(word => 
    EMOTIONAL_TOPICS.has(word)
  );
  
  // Urgency affects depth (urgent = prefer basic)
  if (urgency === 'high') {
    return hasComplexTopic && requestType !== 'task' ? 'intermediate' : 'basic';
  }
  
  // Emotional topics get basic responses
  if (hasEmotionalTopic) {
    return 'basic';
  }
  
  // Complex topics need deeper responses
  if (hasComplexTopic) {
    return urgency === 'low' ? 'advanced' : 'intermediate';
  }
  
  // Request type mapping
  switch (requestType) {
    case 'open_ended':
      return 'advanced';
    case 'task':
      return urgency === 'low' ? 'intermediate' : 'basic';
    case 'question':
    default:
      return 'intermediate';
  }
}

export function shouldIncludeClarifications(input: InputAnalysis): boolean {
  const { requestType, topic, confidence } = input;
  
  // Open-ended with low confidence needs clarification
  if (requestType === 'open_ended' && confidence < 0.8) {
    return true;
  }
  
  // Very short or missing topics need clarification
  const trimmedTopic = topic.trim();
  if (!trimmedTopic || trimmedTopic.length < 4) {
    return true;
  }
  
  // Vague terms suggest clarification needed
  const vagueTerms = ['thing', 'stuff', 'something', 'anything', 'whatever'];
  const hasVagueTerm = vagueTerms.some(term => 
    trimmedTopic.toLowerCase().includes(term)
  );
  
  return hasVagueTerm;
}

export function getResponseTone(input: InputAnalysis): ResponseTone {
  const { requestType, topic } = input;
  const topicWords = topic.toLowerCase().split(/\s+/);
  
  // Check for automation/workflow topics
  const hasAutomationTopic = topicWords.some(word => 
    AUTOMATION_TOPICS.has(word)
  );
  if (hasAutomationTopic) {
    return 'directive';
  }
  
  // Check for creative topics
  const hasCreativeTopic = topicWords.some(word => 
    CREATIVE_TOPICS.has(word)
  );
  if (hasCreativeTopic) {
    return 'inspirational';
  }
  
  // Check for technical/research topics
  const hasTechnicalTopic = topicWords.some(word => 
    COMPLEX_TOPICS.has(word) || word.includes('research') || word.includes('analyze')
  );
  if (hasTechnicalTopic) {
    return 'analytical';
  }
  
  // Request type based defaults
  switch (requestType) {
    case 'task':
      return 'directive';
    case 'question':
    case 'open_ended':
    default:
      return 'analytical';
  }
}

