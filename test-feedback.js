/**
 * Test script to demonstrate the feedback loop functionality
 * This simulates user interactions and shows how agents learn from feedback
 */

const { analyzeUserFeedback, adjustReasoningLevelFromFeedback, generateFeedbackAcknowledgment } = require('./dist/utils/feedback-analyzer');
const { sessionTracker } = require('./dist/utils/session-tracker');

// Mock memory entries
const mockMemory = [
  {
    id: 'mem1',
    summary: 'User prefers technical explanations',
    input: 'Can you explain how APIs work?',
    timestamp: new Date()
  }
];

// Test scenarios
const testScenarios = [
  {
    name: 'Positive Feedback',
    userInput: "That's perfect! Thanks for the great explanation.",
    lastAgentMessage: "APIs (Application Programming Interfaces) are a set of protocols and tools for building software applications..."
  },
  {
    name: 'Confusion - Need Simplification',
    userInput: "This is too confusing. Can you explain it simpler?",
    lastAgentMessage: "The RESTful architectural constraints include statelessness, cacheable responses, and uniform interface principles..."
  },
  {
    name: 'Request for More Detail',
    userInput: "Can you go deeper into the technical details?",
    lastAgentMessage: "JavaScript is a programming language used for web development."
  },
  {
    name: 'Retry Request',
    userInput: "That's not what I meant. Can you try again?",
    lastAgentMessage: "Here's how to create a simple website with HTML..."
  },
  {
    name: 'Continuation Request',
    userInput: "Okay, what's the next step?",
    lastAgentMessage: "Step 1: Set up your development environment by installing Node.js..."
  }
];

console.log('🧠 Testing Memory Feedback Loop System\n');
console.log('=' * 50);

// Test each scenario
testScenarios.forEach((scenario, index) => {
  console.log(`\n${index + 1}. ${scenario.name}`);
  console.log('-'.repeat(30));
  
  console.log(`User: "${scenario.userInput}"`);
  console.log(`Last Agent Response: "${scenario.lastAgentMessage.substring(0, 60)}..."`);
  
  // Analyze feedback
  const feedback = analyzeUserFeedback(
    scenario.userInput,
    scenario.lastAgentMessage,
    mockMemory
  );
  
  console.log(`\nFeedback Analysis:`);
  console.log(`  Type: ${feedback.type}`);
  console.log(`  Confidence: ${(feedback.confidence * 100).toFixed(1)}%`);
  console.log(`  Reasoning Adjustment: ${feedback.reasoningAdjustment || 'none'}`);
  console.log(`  Follow-up Detected: ${feedback.followUpDetected ? 'yes' : 'no'}`);
  
  // Test reasoning level adjustment
  if (feedback.reasoningAdjustment) {
    const currentLevel = 'intermediate';
    const newLevel = adjustReasoningLevelFromFeedback(currentLevel, feedback);
    console.log(`  Reasoning Level: ${currentLevel} → ${newLevel}`);
    
    const acknowledgment = generateFeedbackAcknowledgment(feedback);
    if (acknowledgment) {
      console.log(`  Acknowledgment: ${acknowledgment}`);
    }
  }
  
  // Test memory creation
  if (feedback.feedbackMemory) {
    console.log(`  Memory Created: ${feedback.feedbackMemory.summary}`);
  }
  
  console.log('');
});

console.log('=' * 50);
console.log('\n🎯 Session Tracking Test');
console.log('-'.repeat(30));

// Test session tracking
const userId = 'test-user-123';
const agentId = 'research';
const response = "Here's a comprehensive analysis of your question...";
const reasoningLevel = 'intermediate';

// Store session
sessionTracker.setLastResponse(userId, agentId, response, reasoningLevel, { topic: 'APIs' });

// Retrieve session
const session = sessionTracker.getLastResponse(userId);
if (session) {
  console.log(`Stored session for user: ${userId}`);
  console.log(`Last agent: ${session.lastAgentId}`);
  console.log(`Response preview: ${session.lastAgentResponse.substring(0, 50)}...`);
  console.log(`Reasoning level: ${session.lastReasoningLevel}`);
  console.log(`Context: ${JSON.stringify(session.continuationContext)}`);
} else {
  console.log('No session found');
}

console.log('\n✅ Feedback loop testing complete!');
console.log('\nKey Features Demonstrated:');
console.log('• Automatic feedback detection from user messages');
console.log('• Reasoning level adjustment based on user preferences');  
console.log('• Session tracking for cross-message context');
console.log('• Memory creation for learning user preferences');
console.log('• Visual feedback acknowledgments');
console.log('• Continuation detection for natural conversations');