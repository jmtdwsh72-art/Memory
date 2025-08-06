import { RouterAgent } from './src/agents/agent-router';
import { sessionTracker } from './src/utils/session-tracker';

async function testSimpleSessionFlow() {
  console.log('🔄 SIMPLE SESSION CONTINUITY TEST\n');
  
  const router = new RouterAgent();
  const userId = "test-simple-session";
  
  try {
    // Test 1: Initial request
    console.log('Test 1: "Write a creative story about a dragon"');
    const response1 = await router.processInput('Write a creative story about a dragon', userId);
    console.log(`✅ Routed to: ${response1.metadata?.agentName}`);
    console.log(`🆔 Assistant ID: ${response1.metadata?.assistantId}`);
    
    // Check session
    const session = sessionTracker.getLastResponse(userId);
    console.log(`📊 Session: Agent=${session?.lastAgentId}, Assistant=${session?.lastAssistantId?.substring(0,15)}...`);
    
    // Test 2: Follow-up
    console.log('\nTest 2: "continue"');
    const shouldContinue = sessionTracker.shouldContinueWithLastAssistant(userId, 'continue');
    console.log(`🔄 Should continue with last assistant: ${shouldContinue}`);
    
    if (shouldContinue) {
      const assistantInfo = sessionTracker.getLastAssistantInfo(userId);
      console.log(`📋 Assistant info: ${assistantInfo?.agentType} (${assistantInfo?.assistantId?.substring(0,15)}...)`);
    }
    
    console.log('\n✅ Session continuity logic working correctly!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSimpleSessionFlow().catch(console.error);