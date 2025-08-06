import { sendToGPTAssistant } from './src/utils/gpt-assistant-handler';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function testDirectMemoryExtraction() {
  console.log('🧠 DIRECT MEMORY EXTRACTION TEST\n');
  console.log('=' .repeat(60));
  
  const userId = `test-direct-${Date.now()}`;
  const testMessage = "I want to create a mobile app for my restaurant. My goal is to allow customers to order online and track their delivery. I prefer using React Native and I need it to be scalable.";
  
  console.log(`📝 Test Message: "${testMessage}"`);
  console.log(`👤 User ID: ${userId}`);
  console.log('-'.repeat(60));
  
  try {
    // Send directly to Creative Assistant (likely to give responses with memory patterns)
    console.log('\n📡 Sending to Creative Assistant...');
    const response = await sendToGPTAssistant({
      assistantId: 'asst_oS95sW3kN7QTALTIPoTNwQw5', // Creative assistant
      userMessage: testMessage,
      userId,
      agentType: 'creative',
      topic: 'mobile app development',
      metadata: {
        test: true,
        directCall: true
      }
    });
    
    console.log(`✅ GPT Response received: ${response.success}`);
    if (response.success) {
      console.log(`💬 Response: ${response.message.substring(0, 300)}...`);
    } else {
      console.log(`❌ Error: ${response.message}`);
      return;
    }
    
    // Wait for memory processing
    console.log('\n⏳ Waiting for memory processing...');
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Check for extracted memories
    console.log('\n📊 Checking Memory Extraction Results...');
    const { data: memories, error } = await supabase
      .from('memory')
      .select('*')
      .eq('user_id', userId)
      .in('type', ['goal', 'summary', 'preference'])
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching memories:', error);
      return;
    }
    
    console.log(`🎯 Found ${memories?.length || 0} extracted memory entries:`);
    
    if (memories && memories.length > 0) {
      memories.forEach((memory, index) => {
        console.log(`\n${index + 1}. [${memory.type?.toUpperCase()}] ${memory.summary}`);
        console.log(`   📝 Content: "${memory.output?.substring(0, 80)}..."`);
        
        if (memory.metadata) {
          const meta = memory.metadata;
          console.log(`   📋 Metadata:`);
          console.log(`     • Source Assistant: ${meta.originatingAssistant || 'N/A'}`);
          console.log(`     • Confidence: ${meta.sourceConfidence || 'N/A'}`);
          console.log(`     • Pattern: ${meta.extractionPattern || 'N/A'}`);
          console.log(`     • Session ID: ${meta.sessionId || 'N/A'}`);
        }
        
        if (memory.tags) {
          console.log(`   🏷️  Tags: ${memory.tags.slice(0, 5).join(', ')}${memory.tags.length > 5 ? '...' : ''}`);
        }
      });
      
      // Analysis
      const goalCount = memories.filter(m => m.type === 'goal').length;
      const summaryCount = memories.filter(m => m.type === 'summary').length;
      const preferenceCount = memories.filter(m => m.type === 'preference').length;
      
      console.log(`\n📈 Extraction Analysis:`);
      console.log(`   • Goals: ${goalCount}`);
      console.log(`   • Summaries: ${summaryCount}`);  
      console.log(`   • Preferences: ${preferenceCount}`);
      console.log(`   • Total: ${memories.length}`);
      
      // Quality check
      const hasRelevantContent = memories.some(m => 
        m.summary?.toLowerCase().includes('app') ||
        m.summary?.toLowerCase().includes('restaurant') ||
        m.summary?.toLowerCase().includes('react native') ||
        m.summary?.toLowerCase().includes('order')
      );
      
      console.log(`   • Relevant content detected: ${hasRelevantContent ? '✅' : '❌'}`);
      console.log(`   • Memory Writer effectiveness: ${memories.length >= 2 ? '✅ Good' : memories.length >= 1 ? '⚠️ Moderate' : '❌ Poor'}`);
      
    } else {
      console.log(`   No memory entries found.`);
      console.log(`   This could mean:`);
      console.log(`   • The GPT response didn't contain extractable patterns`);
      console.log(`   • The patterns weren't strong enough (confidence < 0.6)`);
      console.log(`   • The content was filtered out as generic`);
    }
    
    console.log('\n✅ DIRECT MEMORY EXTRACTION TEST COMPLETE');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
  
  process.exit(0);
}

testDirectMemoryExtraction().catch(console.error);