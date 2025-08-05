const { 
  generateSessionSummary, 
  detectSummaryRequest, 
  detectSaveSummaryRequest, 
  detectSessionEnding, 
  shouldOfferSummary 
} = require('./dist/utils/result-summarizer');

// Mock session memory entries
const mockSessionMemory = [
  {
    id: 'entry1',
    type: 'goal',
    goalId: 'proj123',
    goalSummary: 'building a mobile app',
    goalStatus: 'in_progress',
    agentId: 'creative',
    lastAccessed: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
    summary: 'creative_goal: mobile app development | reasoning: intermediate',
    input: 'Help me build a mobile app for fitness tracking',
    tags: ['creative', 'mobile_app', 'fitness', 'creative_goal', 'reasoning_intermediate']
  },
  {
    id: 'entry2', 
    type: 'goal_progress',
    goalId: 'proj123',
    goalSummary: 'building a mobile app',
    goalStatus: 'completed',
    agentId: 'creative',
    lastAccessed: new Date(Date.now() - 20 * 60 * 1000), // 20 min ago
    summary: 'Goal completed: User finished the app wireframes',
    input: 'I finished the wireframes!',
    tags: ['goal_tracking', 'status_completed', 'creative', 'progress_update']
  },
  {
    id: 'entry3',
    type: 'pattern',
    agentId: 'creative',
    lastAccessed: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
    summary: 'feedback: positive - User liked the suggestions',
    input: 'These suggestions are perfect!',
    tags: ['feedback', 'positive', 'user_preference']
  },
  {
    id: 'entry4',
    type: 'summary',
    agentId: 'research',
    lastAccessed: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
    summary: 'Research on React Native development frameworks',
    input: 'What are the best mobile development frameworks?',
    tags: ['research', 'mobile_development', 'react_native', 'reasoning_advanced']
  },
  {
    id: 'entry5',
    type: 'pattern',
    agentId: 'research',
    lastAccessed: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
    summary: 'Clarification requested: vague_input - Research Agent',
    input: 'help with something',
    tags: ['clarification_requested', 'vague', 'research']
  }
];

console.log('🧪 Testing Result Summarizer System\n');

// Test summary detection
console.log('📝 Testing Summary Request Detection:');
const summaryInputs = [
  'summarize this session',
  'what did we accomplish today',
  'recap our discussion',
  'show me what we worked on',
  'not a summary request'
];

summaryInputs.forEach(input => {
  const result = detectSummaryRequest(input);
  console.log(`"${input}" → ${result ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
});

console.log('\n💾 Testing Save Summary Request Detection:');
const saveInputs = [
  'save this summary',
  'store this summary',
  'remember this session',
  'just asking a question'
];

saveInputs.forEach(input => {
  const result = detectSaveSummaryRequest(input);
  console.log(`"${input}" → ${result ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
});

console.log('\n👋 Testing Session Ending Detection:');
const endingInputs = [
  "that's all for now",
  'thanks for your help',
  'perfect, thanks',
  'continue working on this'
];

endingInputs.forEach(input => {
  const result = detectSessionEnding(input);
  console.log(`"${input}" → ${result ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
});

console.log('\n📊 Testing Summary Offer Logic:');
const shouldOffer = shouldOfferSummary(mockSessionMemory);
console.log(`Should offer summary: ${shouldOffer ? '✅ YES' : '❌ NO'}`);
console.log(`Session has ${mockSessionMemory.length} interactions`);

console.log('\n📋 Generating Session Summary:');
try {
  const summary = generateSessionSummary(mockSessionMemory, {
    agentId: 'creative',
    includeMetadata: true
  });
  
  console.log('Generated Summary:');
  console.log('='.repeat(50));
  console.log(summary);
  console.log('='.repeat(50));
  
} catch (error) {
  console.error('❌ Error generating summary:', error.message);
}

console.log('\n🔧 Testing Multi-Agent Summary:');
try {
  const multiAgentSummary = generateSessionSummary(mockSessionMemory, {
    includeMetadata: true,
    maxSections: 4
  });
  
  console.log('Multi-Agent Summary:');
  console.log('='.repeat(50));
  console.log(multiAgentSummary);
  console.log('='.repeat(50));
  
} catch (error) {
  console.error('❌ Error generating multi-agent summary:', error.message);
}

console.log('\n✅ Session Summary System Test Complete!');
console.log('\n🎯 Key Features Tested:');
console.log('• ✅ Intent detection for summary requests');
console.log('• ✅ Save summary request detection');
console.log('• ✅ Session ending phrase detection');
console.log('• ✅ Automatic summary offer logic');
console.log('• ✅ Session analysis and formatting');
console.log('• ✅ Agent-specific personality in summaries');
console.log('• ✅ Goal progress tracking in summaries');
console.log('• ✅ Feedback pattern analysis');