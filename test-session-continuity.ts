import { RouterAgent } from './src/agents/agent-router';
import { sessionTracker } from './src/utils/session-tracker';
import dotenv from 'dotenv';
dotenv.config();

async function testSessionContinuity() {
  console.log('🔄 TESTING SESSION CONTINUITY\n');
  console.log('=' .repeat(60));
  
  const router = new RouterAgent();
  const userId = "test-session-user";
  
  try {
    // Test 1: Initial request that should route to creative
    console.log('\n📝 Test 1: Initial Creative Request');
    console.log('Input: "Write a story about a magical forest"');
    console.log('-'.repeat(40));
    
    const response1 = await router.processInput('Write a story about a magical forest', userId);
    
    console.log(`✅ Response received (${response1.success ? 'SUCCESS' : 'FAILED'})`);
    console.log(`📝 Agent: ${response1.metadata?.agentName || 'Unknown'}`);
    console.log(`💬 Response: ${response1.message.substring(0, 100)}...`);
    
    // Check session state
    const session1 = sessionTracker.getLastResponse(userId);
    if (session1) {
      console.log(`\n📊 Session State After Test 1:`);
      console.log(`  • Last Agent ID: ${session1.lastAgentId}`);
      console.log(`  • Last Assistant ID: ${session1.lastAssistantId}`);
      console.log(`  • Last Thread ID: ${session1.lastThreadId?.substring(0, 20)}...`);
      console.log(`  • Last Routing Time: ${session1.lastRoutingTime?.toLocaleTimeString()}`);
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Follow-up that should continue with same assistant
    console.log('\n\n📝 Test 2: Follow-up Request (Should Continue)');
    console.log('Input: "continue"');
    console.log('-'.repeat(40));
    
    const response2 = await router.processInput('continue', userId);
    
    console.log(`✅ Response received (${response2.success ? 'SUCCESS' : 'FAILED'})`);
    console.log(`📝 Agent: ${response2.metadata?.agentName || 'Unknown'}`);
    console.log(`🔄 Continuation: ${response2.metadata?.continuation ? 'YES' : 'NO'}`);
    console.log(`🧵 Thread Continued: ${response2.metadata?.threadContinued ? 'YES' : 'NO'}`);
    console.log(`💬 Response: ${response2.message.substring(0, 100)}...`);
    
    // Test 3: Vague follow-up
    console.log('\n\n📝 Test 3: Vague Follow-up');
    console.log('Input: "yes"');
    console.log('-'.repeat(40));
    
    const response3 = await router.processInput('yes', userId);
    
    console.log(`✅ Response received (${response3.success ? 'SUCCESS' : 'FAILED'})`);
    console.log(`📝 Agent: ${response3.metadata?.agentName || 'Unknown'}`);
    console.log(`🔄 Continuation: ${response3.metadata?.continuation ? 'YES' : 'NO'}`);
    console.log(`💬 Response: ${response3.message.substring(0, 100)}...`);
    
    // Test 4: High-confidence new topic (should re-route)
    console.log('\n\n📝 Test 4: New High-Confidence Topic (Should Re-route)');
    console.log('Input: "Research the latest developments in quantum computing"');
    console.log('-'.repeat(40));
    
    const response4 = await router.processInput('Research the latest developments in quantum computing', userId);
    
    console.log(`✅ Response received (${response4.success ? 'SUCCESS' : 'FAILED'})`);
    console.log(`📝 Agent: ${response4.metadata?.agentName || 'Unknown'}`);
    console.log(`🔄 New Conversation: ${response4.metadata?.newConversation ? 'YES' : 'NO'}`);
    console.log(`💬 Response: ${response4.message.substring(0, 100)}...`);
    
    // Final session state
    const finalSession = sessionTracker.getLastResponse(userId);
    if (finalSession) {
      console.log(`\n📊 Final Session State:`);
      console.log(`  • Last Agent ID: ${finalSession.lastAgentId}`);
      console.log(`  • Last Assistant ID: ${finalSession.lastAssistantId}`);
      console.log(`  • Last Thread ID: ${finalSession.lastThreadId?.substring(0, 20)}...`);
    }
    
    // Test session tracker methods directly
    console.log('\n\n🔧 Testing Session Tracker Methods:');
    const followUpTests = [
      'yes',
      'continue',
      'tell me more',
      'what else',
      'okay',
      'and then?',
      'Research machine learning algorithms' // Should not be follow-up
    ];
    
    followUpTests.forEach(input => {
      const shouldContinue = sessionTracker.shouldContinueWithLastAssistant(userId, input);
      console.log(`  "${input}" → Continue: ${shouldContinue ? '✅' : '❌'}`);
    });
    
    console.log('\n✅ SESSION CONTINUITY TEST COMPLETE');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error);
  }
  
  process.exit(0);
}

testSessionContinuity().catch(console.error);