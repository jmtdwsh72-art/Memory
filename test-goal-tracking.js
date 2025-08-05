const { detectGoalProgress, getCongratulationsMessage, getAbandonmentMessage, getProgressMessage } = require('./dist/utils/goal-tracker');

// Mock memory entries
const mockMemory = [
  {
    id: 'goal1',
    type: 'goal',
    goalId: 'project123',
    goalSummary: 'building a mobile app',
    goalStatus: 'in_progress',
    agentId: 'creative',
    lastAccessed: new Date(),
    summary: 'User wants to build a mobile app',
    input: 'Help me build a mobile app'
  }
];

console.log('🧪 Testing Goal Progress Detection System\n');

// Test completion detection
console.log('📝 Testing Completion Detection:');
const completionInputs = [
  "It's done!",
  "I finished the app",
  "All done now",
  "Successfully launched it",
  "The project is complete"
];

completionInputs.forEach(input => {
  const result = detectGoalProgress(input, mockMemory);
  console.log(`Input: "${input}"`);
  console.log(`Result: ${result.status} (confidence: ${result.confidence?.toFixed(2)})`);
  if (result.status === 'completed') {
    console.log(`Message: ${getCongratulationsMessage('your mobile app project')}`);
  }
  console.log('');
});

// Test progress detection
console.log('📈 Testing Progress Detection:');
const progressInputs = [
  "I finished the first part",
  "Making good progress on it",
  "I've now set up the basic structure",
  "Halfway done with the design",
  "Just completed the second phase"
];

progressInputs.forEach(input => {
  const result = detectGoalProgress(input, mockMemory);
  console.log(`Input: "${input}"`);
  console.log(`Result: ${result.status} (confidence: ${result.confidence?.toFixed(2)})`);
  if (result.status === 'in_progress') {
    console.log(`Message: ${getProgressMessage('your mobile app project')}`);
  }
  console.log('');
});

// Test abandonment detection
console.log('🚫 Testing Abandonment Detection:');
const abandonmentInputs = [
  "I've decided not to continue",
  "Not relevant anymore",
  "Gave up on that project",
  "Different approach now",
  "Shelving this for now"
];

abandonmentInputs.forEach(input => {
  const result = detectGoalProgress(input, mockMemory);
  console.log(`Input: "${input}"`);
  console.log(`Result: ${result.status} (confidence: ${result.confidence?.toFixed(2)})`);
  if (result.status === 'abandoned') {
    console.log(`Message: ${getAbandonmentMessage('your mobile app project')}`);
  }
  console.log('');
});

// Test neutral inputs (should not trigger)
console.log('⚪ Testing Neutral Inputs (should not trigger):');
const neutralInputs = [
  "How do I optimize performance?",
  "What's the best framework?",
  "I need help with the database",
  "Can you explain this concept?",
  "Show me some examples"
];

neutralInputs.forEach(input => {
  const result = detectGoalProgress(input, mockMemory);
  console.log(`Input: "${input}"`);
  console.log(`Result: ${result.status || 'none'} (confidence: ${result.confidence?.toFixed(2) || 'N/A'})`);
  console.log('');
});

console.log('✅ Goal Tracking Test Complete!');