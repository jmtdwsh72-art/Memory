import { RouterAgent } from './src/agents/agent-router';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function testCreativeRouting() {
  console.log('🎨 TESTING CREATIVE ASSISTANT ROUTING\n');
  console.log('=' .repeat(50));
  
  const router = new RouterAgent();
  const testInput = "Write a creative story about a dragon";
  const userId = "test-creative-user";
  
  console.log(`📝 User Input: "${testInput}"`);
  console.log(`👤 User ID: ${userId}`);
  console.log('=' .repeat(50));
  
  try {
    // Process through router
    console.log('\n📡 Processing through Router Agent...');
    const response = await router.processInput(testInput, userId);
    
    // Display response metadata
    console.log('\n🎯 Response Metadata:');
    console.log(JSON.stringify(response.metadata, null, 2));
    
    // Display response
    console.log('\n💬 Assistant Response:');
    console.log('-'.repeat(50));
    console.log(response.message.substring(0, 400) + '...');
    console.log('-'.repeat(50));
    
    // Wait for logging to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify the log entry
    console.log('\n📊 Checking Supabase for GPT Assistant Log...');
    const { data, error } = await supabase
      .from('memory')
      .select('*')
      .or(`user_id.eq.${userId},summary.ilike.%${userId}%`)
      .eq('type', 'log')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (error) {
      console.error('Error fetching logs:', error);
      return;
    }
    
    console.log(`\nFound ${data?.length || 0} log entries`);
    
    if (data && data.length > 0) {
      data.forEach((entry, idx) => {
        console.log(`\n📝 Log Entry ${idx + 1}:`);
        console.log(`  • ID: ${entry.id}`);
        console.log(`  • Agent ID: ${entry.agent_id} ${entry.agent_id === 'creative' ? '✅' : '⚠️'}`);
        console.log(`  • User ID: ${entry.user_id}`);
        console.log(`  • Summary: ${entry.summary?.substring(0, 60)}...`);
        
        if (entry.metadata?.assistantId) {
          console.log(`  • Assistant ID: ${entry.metadata.assistantId}`);
          console.log(`  • Topic: ${entry.metadata.topic || 'N/A'}`);
          console.log(`  • Routed By: ${entry.metadata.routedBy || 'N/A'}`);
        }
      });
    }
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error);
  }
  
  process.exit(0);
}

testCreativeRouting().catch(console.error);