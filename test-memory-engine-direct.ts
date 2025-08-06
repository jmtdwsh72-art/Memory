import { memoryEngine } from './src/utils/memory-engine';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function testMemoryEngineDirect() {
  console.log('🧠 DIRECT MEMORY ENGINE TEST\n');
  console.log('=' .repeat(50));
  
  const userId = `direct-test-${Date.now()}`;
  console.log(`Test User ID: ${userId}\n`);

  try {
    // Test 1: Store a goal directly via memory engine
    console.log('📝 Test 1: Storing goal directly...');
    const goalEntry = await memoryEngine.storeMemory(
      'test-agent',
      'I want to build a SaaS application',
      'I want to build a SaaS application for project management to help teams collaborate better',
      userId,
      'User stated their goal for building a project management SaaS application',
      'goal',
      ['saas', 'project-management', 'goal'],
      { 
        sourceConfidence: 0.9, 
        extractionPattern: 'test_pattern',
        sessionId: 'test-session'
      }
    );
    console.log(`✅ Goal stored: ${goalEntry.id}`);

    // Test 2: Store a summary directly
    console.log('\n📝 Test 2: Storing summary directly...');
    const summaryEntry = await memoryEngine.storeMemory(
      'test-agent',
      'I prefer React and Node.js',
      'User mentioned they prefer using React and Node.js for development',
      userId,
      'User technology preference',
      'summary',
      ['react', 'nodejs', 'preference'],
      { 
        sourceConfidence: 0.8, 
        extractionPattern: 'preference_pattern',
        sessionId: 'test-session'
      }
    );
    console.log(`✅ Summary stored: ${summaryEntry.id}`);

    // Wait for storage
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Query the database directly
    console.log('\n🔍 Test 3: Direct database query...');
    const { data: directQuery, error } = await supabase
      .from('memory')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database query failed:', error);
    } else {
      console.log(`✅ Found ${directQuery?.length || 0} entries in database:`);
      directQuery?.forEach((entry, index) => {
        console.log(`   ${index + 1}. [${entry.type.toUpperCase()}] "${entry.summary.substring(0, 60)}..."`);
        console.log(`      Agent: ${entry.agent_id}, Tags: ${JSON.stringify(entry.tags)}`);
        console.log(`      Metadata: ${entry.metadata ? JSON.stringify(entry.metadata) : 'none'}`);
      });
    }

    // Test 4: Test memory reader with this data
    console.log('\n🧠 Test 4: Memory reader test...');
    const { memoryReader } = await import('./src/utils/memory-reader');
    
    const memoryResult = await memoryReader.readMemoryContext({
      userId,
      topic: 'SaaS application',
      includeDevInfo: true
    });

    console.log(`📊 Memory reader results:`);
    console.log(`   Entries found: ${memoryResult.entriesFound}`);
    console.log(`   Cache hit: ${memoryResult.cacheHit}`);
    console.log(`   Processing time: ${memoryResult.processingTime}ms`);
    
    if (memoryResult.contextBlock) {
      console.log(`   Context length: ${memoryResult.contextBlock.length} characters`);
      console.log('\n📄 Generated context:');
      console.log(memoryResult.contextBlock);
    } else {
      console.log('   No context generated');
    }

    console.log('\n✅ DIRECT MEMORY ENGINE TEST COMPLETE');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
  
  process.exit(0);
}

testMemoryEngineDirect().catch(console.error);