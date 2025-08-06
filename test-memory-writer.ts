import { memoryWriter } from './src/utils/memory-writer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function testMemoryWriter() {
  console.log('🧠 MEMORY WRITER TESTING\n');
  console.log('=' .repeat(60));
  
  // Test responses with different patterns
  const testResponses = [
    {
      name: 'Goal Recognition',
      response: `I understand you want to learn programming to build a website for your bakery business. Your goal is to create an online presence where customers can view your menu and place orders. Based on what you've told me, you're particularly interested in learning JavaScript and React.`,
      userInput: 'I want to learn programming',
      expectedFacts: 3
    },
    {
      name: 'Context Summary', 
      response: `From what I understand, you're working with a small team on a mobile app project. You mentioned that your company focuses on healthcare solutions and you prefer to use modern frameworks. Let me help you with the authentication system you're building.`,
      userInput: 'Help me with authentication',
      expectedFacts: 3
    },
    {
      name: 'Preferences and Requirements',
      response: `You said you need a solution that's scalable and cost-effective. You're not interested in complex configurations and you like to keep things simple. Your approach involves using cloud-native services wherever possible.`,
      userInput: 'What technology should I use?',
      expectedFacts: 4
    },
    {
      name: 'No Extractable Info',
      response: `That's a great question! Let me explain how authentication works. There are several approaches you can take, including JWT tokens, OAuth, and session-based authentication. Each has its pros and cons.`,
      userInput: 'How does authentication work?',
      expectedFacts: 0
    },
    {
      name: 'Mixed Content',
      response: `You told me you're building a social media platform and your objective is to support 10,000 concurrent users. I can help you design the architecture. You prefer microservices over monolithic applications, which is a smart choice for scalability.`,
      userInput: 'Help me design my system',
      expectedFacts: 3
    }
  ];

  let totalTests = 0;
  let passedTests = 0;

  for (const test of testResponses) {
    console.log(`\n📋 Test: ${test.name}`);
    console.log(`📝 Response: "${test.response.substring(0, 80)}..."`);
    console.log('-'.repeat(50));

    try {
      const results = await memoryWriter.analyzeAndStore(
        test.response,
        test.userInput,
        'test-agent',
        `test-user-${Date.now()}`,
        `session-${Date.now()}`
      );

      console.log(`🎯 Expected facts: ${test.expectedFacts}, Found: ${results.stored}`);
      console.log(`📊 Extracted facts:`);

      if (results.facts.length > 0) {
        results.facts.forEach((fact, index) => {
          console.log(`  ${index + 1}. [${fact.type.toUpperCase()}] ${fact.content}`);
          console.log(`     Confidence: ${(fact.confidence * 100).toFixed(1)}%, Pattern: ${fact.sourcePattern}`);
        });
      } else {
        console.log(`  No facts extracted`);
      }

      // Verify expectations (allowing some flexibility)
      const factCountMatch = Math.abs(results.stored - test.expectedFacts) <= 1;
      console.log(`✅ Test result: ${factCountMatch ? 'PASS' : 'FAIL'}`);
      
      if (factCountMatch) passedTests++;
      totalTests++;

    } catch (error) {
      console.error(`❌ Test failed with error:`, error);
      totalTests++;
    }
  }

  // Test pattern detection directly
  console.log(`\n\n🔍 PATTERN DETECTION TESTS`);
  console.log('-'.repeat(50));

  const patternTests = [
    { text: 'You said you want to learn React', hasInfo: true },
    { text: 'Your goal is to build a mobile app', hasInfo: true },
    { text: 'You mentioned you prefer TypeScript', hasInfo: true },
    { text: 'From what I understand, you work at Google', hasInfo: true },
    { text: 'Let me explain how this works', hasInfo: false },
    { text: 'Here are the benefits of using React', hasInfo: false },
    { text: 'You are trying to solve authentication issues', hasInfo: true }
  ];

  patternTests.forEach(test => {
    const hasInfo = memoryWriter.hasExtractableInfo(test.text);
    const result = hasInfo === test.hasInfo ? '✅' : '❌';
    console.log(`${result} "${test.text}" → Has info: ${hasInfo}`);
  });

  // Check recent memory entries
  console.log(`\n\n📊 RECENT MEMORY ENTRIES`);
  console.log('-'.repeat(50));

  try {
    const { data, error } = await supabase
      .from('memory')
      .select('*')
      .in('type', ['goal', 'summary', 'preference'])
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching recent memories:', error);
    } else if (data && data.length > 0) {
      console.log(`Found ${data.length} recent memory entries:`);
      data.forEach((entry, index) => {
        console.log(`\n${index + 1}. [${entry.type?.toUpperCase()}] ${entry.summary?.substring(0, 60)}...`);
        console.log(`   Agent: ${entry.agent_id}, User: ${entry.user_id}`);
        if (entry.metadata) {
          console.log(`   Assistant: ${entry.metadata.originatingAssistant || 'N/A'}`);
          console.log(`   Confidence: ${entry.metadata.sourceConfidence || 'N/A'}`);
          console.log(`   Pattern: ${entry.metadata.extractionPattern || 'N/A'}`);
        }
      });
    } else {
      console.log('No recent memory entries found');
    }
  } catch (error) {
    console.error('Error checking memory entries:', error);
  }

  // Summary
  console.log(`\n\n📈 TEST SUMMARY`);
  console.log('=' .repeat(60));
  console.log(`Tests passed: ${passedTests}/${totalTests}`);
  console.log(`Success rate: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);
  console.log(`Memory Writer: ${passedTests >= totalTests * 0.8 ? '✅ WORKING' : '⚠️ NEEDS ATTENTION'}`);

  process.exit(0);
}

testMemoryWriter().catch(console.error);