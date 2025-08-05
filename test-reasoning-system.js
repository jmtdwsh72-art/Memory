// Simple test script to validate the dynamic reasoning and planning engine
const { generateResponsePlan } = require('./src/utils/reasoning-planner.ts');

// Test scenarios from the requirements
const testScenarios = [
  {
    name: "Vague input",
    input: "I want to learn to code",
    expectedIntent: "learn",
    expectedStrategy: "clarification_first"
  },
  {
    name: "Complex business query",
    input: "How can I use automation to grow my e-commerce brand?",
    expectedIntent: "automate",
    expectedStrategy: "structured_framework"
  },
  {
    name: "Technical comparison", 
    input: "Compare supervised vs unsupervised learning in practice",
    expectedIntent: "compare",
    expectedStrategy: "structured_framework"
  },
  {
    name: "Feedback-driven",
    input: "That was too advanced, explain again",
    expectedIntent: "clarify",
    expectedStrategy: "clarification_first"
  },
  {
    name: "Clarification-based",
    input: "Help me but I'm not sure what to ask",
    expectedIntent: "clarify", 
    expectedStrategy: "clarification_first"
  }
];

// Mock agent context
const mockContext = {
  agentId: 'research',
  userId: 'test-user',
  memoryEntries: [],
  lastResponse: null,
  routingMetadata: null
};

console.log('🧪 Testing Dynamic Reasoning and Planning Engine\n');

testScenarios.forEach((scenario, index) => {
  console.log(`${index + 1}. Testing: ${scenario.name}`);
  console.log(`   Input: "${scenario.input}"`);
  
  try {
    const plan = generateResponsePlan(scenario.input, mockContext);
    
    console.log(`   ✅ Intent: ${plan.intent} (expected: ${scenario.expectedIntent})`);
    console.log(`   ✅ Strategy: ${plan.responseStrategy} (expected: ${scenario.expectedStrategy})`);
    console.log(`   ✅ Domain: ${plan.domain}`);
    console.log(`   ✅ Reasoning Level: ${plan.reasoningLevel}`);
    console.log(`   ✅ Confidence: ${plan.confidence.toFixed(2)}`);
    console.log(`   ✅ Tools: Memory=${plan.tools.useMemory}, Knowledge=${plan.tools.useKnowledge}, Search=${plan.tools.useSearch}, Clarify=${plan.tools.askClarifyingQuestions}`);
    console.log(`   ✅ Plan Steps: ${plan.planSteps.join(' → ')}`);
    
    // Validate expectations
    const intentMatch = plan.intent === scenario.expectedIntent;
    const strategyMatch = plan.responseStrategy === scenario.expectedStrategy;
    
    if (intentMatch && strategyMatch) {
      console.log(`   🎯 PASS: Intent and strategy match expectations\n`);
    } else {
      console.log(`   ❌ PARTIAL: Intent ${intentMatch ? '✓' : '✗'}, Strategy ${strategyMatch ? '✓' : '✗'}\n`);
    }
    
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}\n`);
  }
});

console.log('🎉 Testing complete!');

// Test with different agent contexts
console.log('\n🎨 Testing with Creative Agent Context...');
const creativeContext = { ...mockContext, agentId: 'creative' };
const creativePlan = generateResponsePlan("I need creative ideas for my startup", creativeContext);
console.log(`Creative Agent Plan: ${creativePlan.intent} → ${creativePlan.responseStrategy} (${creativePlan.confidence.toFixed(2)} confidence)`);

console.log('\n⚙️ Testing with Automation Agent Context...');
const automationContext = { ...mockContext, agentId: 'automation' };
const automationPlan = generateResponsePlan("How can I automate my email workflow", automationContext);
console.log(`Automation Agent Plan: ${automationPlan.intent} → ${automationPlan.responseStrategy} (${automationPlan.confidence.toFixed(2)} confidence)`);