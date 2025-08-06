import { RouterAgent } from './src/agents/agent-router';
import dotenv from 'dotenv';
dotenv.config();

async function testGPTRouting() {
  console.log('\n🧪 Testing GPT Routing System\n');
  
  const router = new RouterAgent();
  const userId = 'test-user-123';
  
  // Test 1: Research query (should route to research GPT)
  console.log('📚 Test 1: Research Query');
  console.log('Input: "I want to learn to code"');
  const researchResponse = await router.processInput('I want to learn to code', userId);
  console.log('Response:', researchResponse.message.substring(0, 200) + '...');
  console.log('Success:', researchResponse.success);
  console.log('Metadata:', researchResponse.metadata);
  console.log('\n---\n');
  
  // Test 2: Creative query (should route to creative GPT)
  console.log('🎨 Test 2: Creative Query');
  console.log('Input: "Name my startup"');
  const creativeResponse = await router.processInput('Name my startup', userId);
  console.log('Response:', creativeResponse.message.substring(0, 200) + '...');
  console.log('Success:', creativeResponse.success);
  console.log('Metadata:', creativeResponse.metadata);
  console.log('\n---\n');
  
  // Test 3: Automation query (should route to automation GPT)
  console.log('⚙️ Test 3: Automation Query');
  console.log('Input: "Automate client onboarding"');
  const automationResponse = await router.processInput('Automate client onboarding', userId);
  console.log('Response:', automationResponse.message.substring(0, 200) + '...');
  console.log('Success:', automationResponse.success);
  console.log('Metadata:', automationResponse.metadata);
  console.log('\n---\n');
  
  console.log('✅ All tests completed!');
}

testGPTRouting().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});