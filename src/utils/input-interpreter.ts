export function detectRequestType(input: string): "question" | "plan" | "tutorial" | "help" | "feedback" {
  const normalizedInput = input.toLowerCase().trim();
  
  // Question patterns
  const questionPatterns = [
    /^(what|who|where|when|why|how|can you|could you|is|are|do|does|did|will|would|should)/,
    /\?$/,
    /tell me about/,
    /explain/
  ];
  
  // Plan patterns
  const planPatterns = [
    /\b(strategy|plan|roadmap|schedule|timeline|approach|guide me|step[- ]by[- ]step|path|journey)\b/,
    /\b(give me|create|build|design|develop) (a|an|the) (plan|strategy|roadmap)\b/,
    /\b\d+[- ](day|week|month|year)[s]?\b.*\b(plan|strategy|guide)\b/
  ];
  
  // Tutorial patterns
  const tutorialPatterns = [
    /\b(walk me through|tutorial|show me how|teach me|guide me through|demonstrate)\b/,
    /\b(step[- ]by[- ]step|walkthrough|lesson)\b/,
    /\bhow to\b.*\bstep/
  ];
  
  // Help patterns
  const helpPatterns = [
    /\b(help|stuck|issue|problem|error|bug|failing|broken|not working|doesn't work|can't|cannot|unable)\b/,
    /\b(fix|solve|debug|troubleshoot|resolve)\b/,
    /\bi'm (stuck|confused|lost)\b/
  ];
  
  // Feedback patterns
  const feedbackPatterns = [
    /\b(feedback|wasn't helpful|not helpful|didn't help|that's wrong|incorrect|bad|poor|terrible)\b/,
    /\b(better|improve|suggestion|complaint)\b/,
    /\bthat (wasn't|isn't|won't)\b/
  ];
  
  // Check patterns in order of specificity
  if (feedbackPatterns.some(pattern => pattern.test(normalizedInput))) {
    return "feedback";
  }
  
  if (helpPatterns.some(pattern => pattern.test(normalizedInput))) {
    return "help";
  }
  
  if (tutorialPatterns.some(pattern => pattern.test(normalizedInput))) {
    return "tutorial";
  }
  
  if (planPatterns.some(pattern => pattern.test(normalizedInput))) {
    return "plan";
  }
  
  if (questionPatterns.some(pattern => pattern.test(normalizedInput))) {
    return "question";
  }
  
  // Default fallback
  return "question";
}

export function extractTopic(input: string): string {
  // Common prefixes to remove
  const prefixes = [
    /^(i want to|i need to|i'd like to|i would like to|can you help me|help me|show me how to|teach me|tell me about|explain)\s+/i,
    /^(how do i|how can i|how to|what is|what are|where is|where are|when is|when are|why is|why are)\s+/i,
    /^(give me|create|build|design|develop)\s+(a|an|the)\s+/i
  ];
  
  // Remove prefixes
  let cleaned = input;
  prefixes.forEach(prefix => {
    cleaned = cleaned.replace(prefix, '');
  });
  
  // Remove trailing punctuation
  cleaned = cleaned.replace(/[?.!,;]+$/, '');
  
  // Common stop words to remove (but keep important technical terms)
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'all', 'both', 'each',
    'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now'
  ]);
  
  // Split and filter words
  const words = cleaned.toLowerCase().split(/\s+/);
  const filteredWords = words.filter(word => 
    word.length > 2 && !stopWords.has(word)
  );
  
  // If we have filtered words, join them; otherwise use the cleaned version
  const topic = filteredWords.length > 0 ? filteredWords.join(' ') : cleaned.toLowerCase();
  
  // Trim and normalize whitespace
  return topic.trim().replace(/\s+/g, ' ');
}

export function getUrgencyLevel(input: string): "low" | "medium" | "high" {
  const normalizedInput = input.toLowerCase();
  
  // High urgency patterns
  const highUrgencyPatterns = [
    /\b(urgent|urgently|asap|right now|immediately|quickly|fast|hurry|emergency|critical|deadline|today|tonight|within (the )?hour)\b/,
    /\bneed (this|it|to) (quickly|fast|now|asap|urgently)\b/,
    /\b(help|need|want) .*\b(now|quickly|fast|asap)\b/,
    /\b(time sensitive|time critical)\b/,
    /\![!]+/  // Multiple exclamation marks
  ];
  
  // Low urgency patterns
  const lowUrgencyPatterns = [
    /\b(eventually|some ?time|some ?day|when(ever)? you (can|get a chance)|no rush|not urgent|thinking about|considering|might|maybe)\b/,
    /\b(at some point|in the future|down the (road|line)|long term|someday)\b/,
    /\b(just curious|wondering|interested)\b/,
    /\bwhen(ever)? (possible|convenient)\b/
  ];
  
  // Check for high urgency first
  if (highUrgencyPatterns.some(pattern => pattern.test(normalizedInput))) {
    return "high";
  }
  
  // Check for low urgency
  if (lowUrgencyPatterns.some(pattern => pattern.test(normalizedInput))) {
    return "low";
  }
  
  // Default to medium urgency
  return "medium";
}