import { RouterAgent } from './src/agents/agent-router';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function testCompleteFlow() {
  console.log('🧠 COMPLETE GPT ASSISTANT LOGGING TEST\n');
  console.log('=' .repeat(50));
  
  const router = new RouterAgent();
  const testInput = "Help me create a website for my bakery business";
  const userId = "test-user-bakery";
  
  console.log(`📝 User Input: "${testInput}"`);
  console.log(`👤 User ID: ${userId}`);
  console.log('=' .repeat(50));
  
  try {
    // Process through router
    console.log('\n📡 Processing through Router Agent...');
    const response = await router.processInput(testInput, userId);
    
    // Display response
    console.log('\n💬 Assistant Response:');
    console.log('-'.repeat(50));
    console.log(response.message.substring(0, 300) + '...');
    console.log('-'.repeat(50));
    
    // Wait for logging to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify the log entry
    console.log('\n📊 Verifying Supabase Log Entry...');
    const { data, error } = await supabase
      .from('memory')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'log')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error fetching log:', error);
      return;
    }
    
    if (data && data.length > 0) {
      const entry = data[0];
      console.log('\n✅ LOGGING VERIFICATION:');
      console.log(`  • Agent ID: ${entry.agent_id} ${entry.agent_id ? '✅' : '❌'}`);
      console.log(`  • User ID: ${entry.user_id} ✅`);
      console.log(`  • Type: ${entry.type} ✅`);
      console.log(`  • Input: "${entry.input?.substring(0, 50)}..." ✅`);
      console.log(`  • Output: "${entry.output?.substring(0, 50)}..." ✅`);
      
      if (entry.metadata) {
        console.log('\n📋 METADATA VERIFICATION:');
        console.log(`  • Topic: ${entry.metadata.topic || 'N/A'} ${entry.metadata.topic ? '✅' : '❌'}`);
        console.log(`  • Assistant ID: ${entry.metadata.assistantId || 'N/A'} ${entry.metadata.assistantId ? '✅' : '❌'}`);
        console.log(`  • Routed By: ${entry.metadata.routedBy || 'N/A'} ${entry.metadata.routedBy === 'router' ? '✅' : '❌'}`);
        console.log(`  • Agent Type: ${entry.metadata.agentType || 'N/A'} ${entry.metadata.agentType ? '✅' : '❌'}`);
        console.log(`  • Reasoning Level: ${entry.metadata.reasoningLevel || 'N/A'} ${entry.metadata.reasoningLevel ? '✅' : '❌'}`);
      }
      
      console.log('\n🎯 EXPECTED VALUES:');
      console.log(`  • Agent ID should be: 'creative' or 'automation'`);
      console.log(`  • Metadata.topic should include: 'create' or 'help'`);
      console.log(`  • Metadata.routedBy should be: 'router'`);
      console.log(`  • Metadata.assistantId should be one of the configured IDs`);
    } else {
      console.log('❌ No log entry found for this user');
    }
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error);
  }
  
  process.exit(0);
}

testCompleteFlow().catch(console.error);