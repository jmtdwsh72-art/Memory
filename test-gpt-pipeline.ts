import { RouterAgent } from './src/agents/agent-router';
import { memoryEngine } from './src/utils/memory-engine';
import dotenv from 'dotenv';
dotenv.config();

async function testGPTPipeline() {
  console.log('🧠 SYSTEM TEST — GPT Assistant Pipeline\n');
  console.log('=' .repeat(50));
  
  const router = new RouterAgent();
  const testInput = "I want to learn to code";
  const userId = "test-user-001";
  
  console.log(`📝 User Input: "${testInput}"`);
  console.log(`👤 User ID: ${userId}`);
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Process through router
    console.log('\n📡 Step 1: Processing through Router Agent...');
    const response = await router.processInput(testInput, userId);
    
    // Display routing metadata
    if (response.metadata) {
      console.log('\n🎯 Routing Metadata:');
      console.log(`  • Agent: ${response.metadata.agentName || response.metadata.agentId}`);
      console.log(`  • Confidence: ${response.metadata.routingConfidence || response.metadata.confidence}`);
      console.log(`  • Method: ${response.metadata.routingMethod}`);
      console.log(`  • Memory Context Used: ${response.metadata.hasMemoryContext}`);
      console.log(`  • Routing Reason: ${response.metadata.routingReason}`);
    }
    
    // Display response
    console.log('\n💬 Assistant Response:');
    console.log('-'.repeat(50));
    console.log(response.message);
    console.log('-'.repeat(50));
    
    // Step 2: Verify memory storage
    console.log('\n📊 Step 2: Verifying Supabase Memory Storage...');
    
    // Give it a moment to save
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Fetch recent memories to verify storage
    const memoryContext = await memoryEngine.recallMemory(
      response.metadata?.agentId || 'research',
      testInput,
      userId,
      { limit: 1, types: ['log', 'summary'] }
    );
    
    if (memoryContext.entries.length > 0) {
      console.log('✅ Memory successfully stored in Supabase!');
      const latestEntry = memoryContext.entries[0];
      console.log(`  • ID: ${latestEntry.id}`);
      console.log(`  • Type: ${latestEntry.type}`);
      console.log(`  • Agent: ${latestEntry.agentId}`);
      console.log(`  • Summary: ${latestEntry.summary?.substring(0, 100)}...`);
      if (latestEntry.metadata) {
        console.log(`  • Metadata:`, JSON.stringify(latestEntry.metadata, null, 2));
      }
    } else {
      console.log('⚠️  No memory entries found (might be using file storage)');
    }
    
    // Step 3: Test with follow-up (with memory context)
    console.log('\n🔄 Step 3: Testing Follow-up with Memory Context...');
    const followUpInput = "What programming language should I start with?";
    console.log(`📝 Follow-up: "${followUpInput}"`);
    
    const followUpResponse = await router.processInput(followUpInput, userId);
    
    console.log('\n💬 Follow-up Response:');
    console.log('-'.repeat(50));
    console.log(followUpResponse.message.substring(0, 500) + '...');
    console.log('-'.repeat(50));
    
    // Final summary
    console.log('\n✅ TEST COMPLETE');
    console.log('=' .repeat(50));
    console.log('Summary:');
    console.log(`  • GPT Assistant ID Used: asst_9CBCoYDUC2B8UnnwrGyhPF7Y`);
    console.log(`  • Routing Working: ${response.success ? '✅' : '❌'}`);
    console.log(`  • Memory Storage: ${memoryContext.entries.length > 0 ? '✅' : '⚠️'}`);
    console.log(`  • Response Quality: ${response.message.length > 100 ? '✅ Detailed' : '⚠️ Brief'}`);
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error);
  }
  
  process.exit(0);
}

// Run the test
testGPTPipeline().catch(console.error);