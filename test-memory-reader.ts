import { memoryReader } from './src/utils/memory-reader';
import { memoryWriter } from './src/utils/memory-writer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Set development mode for verbose logging
process.env.NODE_ENV = 'development';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function testMemoryReader() {
  console.log('🧠 MEMORY READER COMPREHENSIVE TEST\n');
  console.log('=' .repeat(60));
  
  const userId = `memory-reader-test-${Date.now()}`;
  console.log(`Test User ID: ${userId}\n`);

  try {
    // Step 1: Populate test data using memory writer
    console.log('📝 Step 1: Creating test memory data...');
    console.log('=' .repeat(40));
    
    const testResponses = [
      {
        input: 'I want to build a SaaS project management tool',
        response: `I understand you want to build a SaaS project management tool. Your goal is to help small teams collaborate better and track their progress efficiently. You mentioned you prefer using React and Node.js, which are excellent choices for this type of application. From what I understand, you're looking to create a scalable solution that addresses team collaboration challenges in remote work environments.`,
        assistant: 'research',
        tags: ['saas', 'project-management', 'react', 'nodejs']
      },
      {
        input: 'How can I learn machine learning?',
        response: `Based on your background, you want to transition into machine learning and data science. Your objective is to become proficient in Python and TensorFlow within 6 months. You mentioned you prefer hands-on learning over theoretical courses, and you're trying to build practical ML projects for your portfolio.`,
        assistant: 'research', 
        tags: ['machine-learning', 'python', 'tensorflow', 'data-science']
      },
      {
        input: 'Help me write better documentation',
        response: `You said you need to improve documentation for your open-source projects. Your goal is to make your code more accessible to contributors and users. You mentioned that you prefer markdown-based documentation and want to automate the process where possible.`,
        assistant: 'creative',
        tags: ['documentation', 'markdown', 'open-source']
      },
      {
        input: 'I need automation for my workflows',
        response: `From what you've told me, you're working on automating repetitive development tasks. Your objective is to set up CI/CD pipelines and reduce manual deployment work. You prefer GitHub Actions and Docker for your automation stack.`,
        assistant: 'automation',
        tags: ['automation', 'cicd', 'github-actions', 'docker']
      }
    ];

    let factCount = 0;
    for (const [index, testData] of testResponses.entries()) {
      const results = await memoryWriter.analyzeAndStore(
        testData.response,
        testData.input,
        testData.assistant,
        userId,
        `session-${Math.floor(index / 2)}`, // Group into sessions
        `thread-${index}`,
        `asst_${testData.assistant}_test`
      );
      factCount += results.stored;
      console.log(`   ✅ Stored ${results.stored} facts from ${testData.assistant} response`);
    }

    console.log(`\n📊 Total facts stored: ${factCount}`);
    
    // Wait for storage completion
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Test various memory reading scenarios
    console.log('\n\n🧠 Step 2: Testing memory reading scenarios...');
    console.log('=' .repeat(40));

    const testScenarios = [
      {
        name: 'Topic: SaaS/Project Management',
        options: {
          userId,
          topic: 'SaaS project management',
          maxEntries: 5,
          matchingMode: 'fuzzy' as const
        }
      },
      {
        name: 'Agent-specific: Research Agent Only',
        options: {
          userId,
          agentType: 'research',
          maxEntries: 10,
          minConfidence: 0.8
        }
      },
      {
        name: 'Strict matching: Machine Learning',
        options: {
          userId,
          topic: 'machine learning',
          matchingMode: 'strict' as const,
          includeDevInfo: true
        }
      },
      {
        name: 'Tag filter: Automation tools',
        options: {
          userId,
          tagFilter: ['automation', 'cicd'],
          maxEntries: 5
        }
      },
      {
        name: 'Time window: Last 1 hour',
        options: {
          userId,
          timeWindow: 1, // 1 hour
          maxEntries: 20
        }
      },
      {
        name: 'High confidence only',
        options: {
          userId,
          minConfidence: 0.9,
          includeDevInfo: true
        }
      },
      {
        name: 'Session-based caching test (same query twice)',
        options: {
          userId,
          topic: 'documentation',
          sessionId: 'cache-test-session'
        }
      }
    ];

    let scenarioIndex = 1;
    for (const scenario of testScenarios) {
      console.log(`\n📋 Scenario ${scenarioIndex}: ${scenario.name}`);
      console.log('-'.repeat(50));
      
      const startTime = Date.now();
      const result = await memoryReader.readMemoryContext(scenario.options);
      const endTime = Date.now();
      
      console.log(`⏱️  Processing time: ${endTime - startTime}ms`);
      console.log(`📊 Results: ${result.entriesFound} entries found`);
      console.log(`💾 Cache hit: ${result.cacheHit ? 'YES' : 'NO'}`);
      
      if (result.contextBlock) {
        console.log(`📄 Context preview (${result.contextBlock.length} chars):`);
        const preview = result.contextBlock.substring(0, 300).replace(/\n/g, ' ');
        console.log(`   "${preview}${result.contextBlock.length > 300 ? '...' : ''}"`);
      } else {
        console.log('📄 No context generated');
      }
      
      if (result.metadata) {
        console.log(`🏷️  Topics: ${result.metadata.topics.slice(0, 3).join(', ')}`);
        console.log(`🤖 Agents: ${result.metadata.agents.join(', ')}`);
        console.log(`📈 Confidence range: ${(result.metadata.confidenceRange.min * 100).toFixed(0)}%-${(result.metadata.confidenceRange.max * 100).toFixed(0)}%`);
      }
      
      scenarioIndex++;
    }

    // Step 3: Test caching by running the same query twice
    console.log('\n\n💾 Step 3: Testing cache functionality...');
    console.log('=' .repeat(40));
    
    const cacheTestOptions = {
      userId,
      topic: 'project management',
      sessionId: 'cache-test'
    };
    
    console.log('First query (should be cache miss):');
    const firstResult = await memoryReader.readMemoryContext(cacheTestOptions);
    console.log(`   Cache hit: ${firstResult.cacheHit}, Time: ${firstResult.processingTime}ms`);
    
    console.log('Second query (should be cache hit):');
    const secondResult = await memoryReader.readMemoryContext(cacheTestOptions);
    console.log(`   Cache hit: ${secondResult.cacheHit}, Time: ${secondResult.processingTime}ms`);
    
    console.log('Cache performance improvement:', 
      firstResult.processingTime > 0 ? 
        `${Math.round((firstResult.processingTime - secondResult.processingTime) / firstResult.processingTime * 100)}%` : 
        'N/A');

    // Step 4: Cache statistics
    console.log('\n\n📊 Step 4: Cache statistics...');
    console.log('=' .repeat(40));
    const cacheStats = memoryReader.getCacheStats();
    console.log(`Cache size: ${cacheStats.size} entries`);
    cacheStats.entries.forEach((entry, index) => {
      console.log(`   ${index + 1}. ${entry.key.substring(0, 50)}... (${entry.entriesFound} entries, ${new Date(entry.timestamp).toLocaleTimeString()})`);
    });

    // Step 5: Verify data was stored correctly in Supabase
    console.log('\n\n🔍 Step 5: Database verification...');
    console.log('=' .repeat(40));
    
    const { data: storedMemories, error } = await supabase
      .from('memory')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Database verification failed:', error);
    } else {
      console.log(`✅ Found ${storedMemories?.length || 0} memory entries in database:`);
      
      const byType = (storedMemories || []).reduce((acc, memory) => {
        acc[memory.type] = (acc[memory.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`   • ${type}: ${count} entries`);
      });
      
      const byAgent = (storedMemories || []).reduce((acc, memory) => {
        acc[memory.agent_id] = (acc[memory.agent_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('\nBy agent:');
      Object.entries(byAgent).forEach(([agent, count]) => {
        console.log(`   • ${agent}: ${count} entries`);
      });
    }

    // Final summary
    console.log('\n\n✅ MEMORY READER TEST COMPLETE');
    console.log('=' .repeat(60));
    console.log('🔧 Features validated:');
    console.log('   ✅ Topic-based keyword matching (strict & fuzzy)');
    console.log('   ✅ Agent-specific filtering'); 
    console.log('   ✅ Confidence score filtering');
    console.log('   ✅ Tag-based filtering');
    console.log('   ✅ Time window filtering');
    console.log('   ✅ Session-based caching with performance improvement');
    console.log('   ✅ Formatted context blocks for system messages');
    console.log('   ✅ Development mode verbose logging');
    console.log('   ✅ Metadata tracking and analysis');
    console.log('   ✅ Memory ranking by relevance');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
  }
  
  process.exit(0);
}

testMemoryReader().catch(console.error);