import { supabase } from './src/db/supabase';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const plainSupabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function testSupabaseDirect() {
  console.log('🔍 DIRECT SUPABASE DATABASE TEST\n');
  console.log('=' .repeat(50));
  
  const testUserId = `supabase-test-${Date.now()}`;

  try {
    // Test 1: Connection test
    console.log('🔗 Test 1: Connection test...');
    const { error: connectError } = await supabase.from('memory').select('count').limit(1);
    if (connectError) {
      console.error('❌ Typed client connection failed:', connectError);
    } else {
      console.log('✅ Typed client connected successfully');
    }

    const { error: plainConnectError } = await plainSupabase.from('memory').select('count').limit(1);
    if (plainConnectError) {
      console.error('❌ Plain client connection failed:', plainConnectError);
    } else {
      console.log('✅ Plain client connected successfully');
    }

    // Test 2: Insert with typed client
    console.log('\n📝 Test 2: Insert with typed client...');
    const typedInsertData = {
      agent_id: 'test-agent',
      user_id: testUserId,
      type: 'goal' as const,
      input: 'I want to build a SaaS application',
      output: 'User goal to build SaaS app',
      summary: 'Build SaaS application for project management',
      relevance: 1.0,
      tags: ['test', 'saas', 'goal'],
      metadata: { test: true, sourceConfidence: 0.9 }
    };

    console.log('Inserting:', JSON.stringify(typedInsertData, null, 2));

    const { data: typedData, error: typedError } = await supabase
      .from('memory')
      .insert(typedInsertData)
      .select();

    if (typedError) {
      console.error('❌ Typed insert failed:', typedError);
    } else {
      console.log('✅ Typed insert succeeded:', typedData?.[0]?.id);
    }

    // Test 3: Insert with plain client
    console.log('\n📝 Test 3: Insert with plain client...');
    const plainInsertData = {
      agent_id: 'test-agent-plain',
      user_id: testUserId,
      type: 'summary',
      input: 'I prefer React and Node.js',
      output: 'User prefers React and Node.js stack',
      summary: 'User technology preference for React and Node.js',
      relevance: 0.8,
      tags: ['test', 'react', 'nodejs'],
      metadata: { test: true, sourceConfidence: 0.8, plain: true }
    };

    console.log('Inserting:', JSON.stringify(plainInsertData, null, 2));

    const { data: plainData, error: plainError } = await plainSupabase
      .from('memory')
      .insert(plainInsertData)
      .select();

    if (plainError) {
      console.error('❌ Plain insert failed:', plainError);
    } else {
      console.log('✅ Plain insert succeeded:', plainData?.[0]?.id);
    }

    // Test 4: Query back the data
    console.log('\n🔍 Test 4: Query inserted data...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for DB

    const { data: queryData, error: queryError } = await plainSupabase
      .from('memory')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false });

    if (queryError) {
      console.error('❌ Query failed:', queryError);
    } else {
      console.log(`✅ Found ${queryData?.length || 0} entries:`);
      queryData?.forEach((entry, index) => {
        console.log(`   ${index + 1}. [${entry.type.toUpperCase()}] ${entry.agent_id}`);
        console.log(`      Summary: "${entry.summary}"`);
        console.log(`      Tags: ${JSON.stringify(entry.tags)}`);
        console.log(`      Metadata: ${JSON.stringify(entry.metadata)}`);
        console.log('');
      });
    }

    console.log('\n✅ DIRECT SUPABASE TEST COMPLETE');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
  
  process.exit(0);
}

testSupabaseDirect().catch(console.error);