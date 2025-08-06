import { RouterAgent } from './src/agents/agent-router';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function testIntegratedMemoryWriter() {
  console.log('🧠 INTEGRATED MEMORY WRITER TEST\n');
  console.log('=' .repeat(60));
  
  const router = new RouterAgent();
  const userId = `test-memory-user-${Date.now()}`;
  
  try {
    // Test with a request that should trigger memory extraction
    const userInput = "I want to build a website for my photography business. My goal is to showcase my portfolio and allow clients to book sessions online.";
    
    console.log(`📝 User Input: "${userInput}"`);
    console.log(`👤 User ID: ${userId}`);
    console.log('-'.repeat(60));
    
    // Send request through router
    console.log('\n📡 Processing through Router...');
    const response = await router.processInput(userInput, userId);
    
    console.log(`✅ Response received: ${response.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`📝 Routed to: ${response.metadata?.agentName || 'Unknown'}`);
    console.log(`💬 Response preview: ${response.message.substring(0, 150)}...`);
    
    // Wait for memory processing to complete
    console.log('\n⏳ Waiting for memory processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check for memory entries from our test
    console.log('\n📊 Checking for Memory Writer entries...');
    const { data: memoryEntries, error } = await supabase
      .from('memory')
      .select('*')
      .eq('user_id', userId)
      .in('type', ['goal', 'summary', 'preference'])
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching memory entries:', error);
    } else {
      console.log(`\n🎯 Found ${memoryEntries?.length || 0} extracted memory entries:`);
      
      if (memoryEntries && memoryEntries.length > 0) {
        memoryEntries.forEach((entry, index) => {
          console.log(`\n${index + 1}. [${entry.type?.toUpperCase()}] ${entry.summary}`);
          console.log(`   Input: "${entry.input?.substring(0, 50)}..."`);
          console.log(`   Output: "${entry.output?.substring(0, 50)}..."`);
          console.log(`   Agent: ${entry.agent_id}`);
          
          if (entry.metadata) {
            console.log(`   📋 Metadata:`);
            console.log(`     • Originating Assistant: ${entry.metadata.originatingAssistant || 'N/A'}`);
            console.log(`     • Source Confidence: ${entry.metadata.sourceConfidence || 'N/A'}`);
            console.log(`     • Extraction Pattern: ${entry.metadata.extractionPattern || 'N/A'}`);
            console.log(`     • Session ID: ${entry.metadata.sessionId || 'N/A'}`);
          }
          
          if (entry.tags && entry.tags.length > 0) {
            console.log(`   🏷️  Tags: ${entry.tags.join(', ')}`);
          }
        });
        
        // Analyze the quality of extraction
        const goalEntries = memoryEntries.filter(e => e.type === 'goal');
        const summaryEntries = memoryEntries.filter(e => e.type === 'summary');
        const preferenceEntries = memoryEntries.filter(e => e.type === 'preference');
        
        console.log(`\n📈 Memory Analysis:`);
        console.log(`   • Goals extracted: ${goalEntries.length}`);
        console.log(`   • Summaries extracted: ${summaryEntries.length}`);
        console.log(`   • Preferences extracted: ${preferenceEntries.length}`);
        
        // Check if the extracted facts make sense for the input
        const expectedGoals = ['build a website', 'showcase portfolio', 'allow clients to book sessions'];
        const foundRelevantGoals = goalEntries.some(entry => 
          expectedGoals.some(goal => 
            entry.summary?.toLowerCase().includes(goal.toLowerCase())
          )
        );
        
        console.log(`   • Relevant goals found: ${foundRelevantGoals ? '✅' : '❌'}`);
        
      } else {
        console.log('   No memory entries found - this may indicate the assistant response did not contain extractable patterns');
      }
    }
    
    // Test a follow-up to see if extracted memory is used
    console.log(`\n\n🔄 Testing Follow-up with Extracted Memory...`);
    const followUpInput = "What technology should I use?";
    console.log(`📝 Follow-up: "${followUpInput}"`);
    
    const followUpResponse = await router.processInput(followUpInput, userId);
    console.log(`💬 Follow-up response preview: ${followUpResponse.message.substring(0, 150)}...`);
    
    console.log('\n✅ INTEGRATED MEMORY WRITER TEST COMPLETE');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
  
  process.exit(0);
}

testIntegratedMemoryWriter().catch(console.error);