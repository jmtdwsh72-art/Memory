import { RouterAgent } from './src/agents/agent-router';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Set development mode for verbose logging
process.env.NODE_ENV = 'development';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function testMemoryWriterDebug() {
  console.log('🔍 MEMORY WRITER DEBUG PIPELINE TEST\n');
  console.log('=' .repeat(60));
  
  const router = new RouterAgent();
  const userId = `debug-test-${Date.now()}`;
  
  try {
    // Test 1: Initial request with extractable content
    console.log('\n📋 Test 1: Rich Context Request');
    console.log('=' .repeat(40));
    const testInput1 = "I want to build a SaaS application for project management. My goal is to help small teams collaborate better and track their progress. I prefer using React and Node.js.";
    
    console.log(`User: "${testInput1}"`);
    console.log(`User ID: ${userId}`);
    
    const response1 = await router.processInput(testInput1, userId);
    
    console.log(`\n✅ Response received: ${response1.success}`);
    console.log(`🤖 Agent: ${response1.metadata?.agentName}`);
    console.log(`📝 Response: ${response1.message.substring(0, 200)}...`);
    
    if (response1.metadata?.memoryWarning) {
      console.log(`⚠️  Memory Warning: ${response1.metadata.memoryWarning}`);
    }
    console.log(`🧠 Memory Write Success: ${response1.metadata?.memoryWriteSuccess}`);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 2: Follow-up to test session continuity and thread reuse
    console.log('\n\n📋 Test 2: Follow-up for Session Continuity');
    console.log('=' .repeat(40));
    const testInput2 = "continue with more details";
    
    console.log(`User: "${testInput2}"`);
    
    const response2 = await router.processInput(testInput2, userId);
    
    console.log(`\n✅ Response received: ${response2.success}`);
    console.log(`🤖 Agent: ${response2.metadata?.agentName}`);
    console.log(`🔄 Continuation: ${response2.metadata?.continuation ? 'YES' : 'NO'}`);
    console.log(`🧵 Thread Continued: ${response2.metadata?.threadContinued ? 'YES' : 'NO'}`);
    console.log(`📝 Response: ${response2.message.substring(0, 200)}...`);
    
    if (response2.metadata?.memoryWarning) {
      console.log(`⚠️  Memory Warning: ${response2.metadata.memoryWarning}`);
    }
    console.log(`🧠 Memory Write Success: ${response2.metadata?.memoryWriteSuccess}`);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: New high-confidence topic to test re-routing
    console.log('\n\n📋 Test 3: Topic Change (Re-routing Test)');
    console.log('=' .repeat(40));
    const testInput3 = "Write a creative story about artificial intelligence becoming self-aware";
    
    console.log(`User: "${testInput3}"`);
    
    const response3 = await router.processInput(testInput3, userId);
    
    console.log(`\n✅ Response received: ${response3.success}`);
    console.log(`🤖 Agent: ${response3.metadata?.agentName}`);
    console.log(`🆕 New Conversation: ${response3.metadata?.newConversation ? 'YES' : 'NO'}`);
    console.log(`📝 Response: ${response3.message.substring(0, 200)}...`);
    
    if (response3.metadata?.memoryWarning) {
      console.log(`⚠️  Memory Warning: ${response3.metadata.memoryWarning}`);
    }
    console.log(`🧠 Memory Write Success: ${response3.metadata?.memoryWriteSuccess}`);
    
    // Final verification - check memory entries
    console.log('\n\n📊 MEMORY VERIFICATION');
    console.log('=' .repeat(40));
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { data: memories, error } = await supabase
      .from('memory')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Error fetching memories:', error);
    } else {
      console.log(`📋 Found ${memories?.length || 0} memory entries for test user:`);
      
      if (memories && memories.length > 0) {
        memories.forEach((memory, index) => {
          console.log(`\n${index + 1}. [${memory.type?.toUpperCase()}] ${memory.agent_id}`);
          console.log(`   Summary: ${memory.summary?.substring(0, 80)}...`);
          console.log(`   Created: ${new Date(memory.created_at).toLocaleTimeString()}`);
          
          if (memory.metadata) {
            console.log(`   Metadata:`);
            console.log(`     • Originating Assistant: ${memory.metadata.originatingAssistant || 'N/A'}`);
            console.log(`     • Confidence: ${memory.metadata.sourceConfidence || 'N/A'}`);
            console.log(`     • Pattern: ${memory.metadata.extractionPattern || 'N/A'}`);
            console.log(`     • Session ID: ${memory.metadata.sessionId || 'N/A'}`);
            console.log(`     • Thread ID: ${memory.metadata.threadId?.substring(0, 15) || 'N/A'}...`);
          }
        });
        
        // Analysis
        const logEntries = memories.filter(m => m.type === 'log');
        const goalEntries = memories.filter(m => m.type === 'goal'); 
        const summaryEntries = memories.filter(m => m.type === 'summary');
        
        console.log(`\n📈 Memory Analysis:`);
        console.log(`   • Log entries: ${logEntries.length}`);
        console.log(`   • Goal entries: ${goalEntries.length}`);
        console.log(`   • Summary entries: ${summaryEntries.length}`);
        console.log(`   • Total: ${memories.length}`);
        
        // Check for session/thread consistency
        const sessionIds = [...new Set(memories.map(m => m.metadata?.sessionId).filter(Boolean))];
        const threadIds = [...new Set(memories.map(m => m.metadata?.threadId).filter(Boolean))];
        
        console.log(`   • Unique Session IDs: ${sessionIds.length}`);
        console.log(`   • Unique Thread IDs: ${threadIds.length}`);
        
      } else {
        console.log('   No memory entries found');
      }
    }
    
    console.log('\n✅ MEMORY WRITER DEBUG TEST COMPLETE');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
  
  process.exit(0);
}

testMemoryWriterDebug().catch(console.error);