/**
 * Test the knowledge system functionality
 */

import { detectDomains, getKnowledgeForInput, formatKnowledgeSection, getDomainAnalytics } from '../utils/knowledge-loader';

// Test domain detection
console.log('=== Domain Detection Tests ===');

const testInputs = [
  "I want to learn Python programming",
  "How do I buy stocks and start investing?",
  "Help me create a Django web application",
  "What's the best way to day trade stocks?",
  "I need help with Python data analysis using pandas",
  "Can you explain stock market fundamentals?",
  "Generic request without specific domain",
];

for (const input of testInputs) {
  const domains = detectDomains(input);
  const analytics = getDomainAnalytics(input);
  console.log(`\nInput: "${input}"`);
  console.log(`Detected domains: ${domains.join(', ') || 'none'}`);
  console.log(`Analytics: ${JSON.stringify(analytics)}`);
}

// Test knowledge loading
async function testKnowledgeLoading() {
  console.log('\n=== Knowledge Loading Tests ===');
  
  const pythonInput = "I want to learn Python programming basics";
  const stockInput = "How do I start investing in the stock market?";
  
  const pythonKnowledge = await getKnowledgeForInput(pythonInput);
  const stockKnowledge = await getKnowledgeForInput(stockInput);
  
  console.log(`\nPython knowledge modules: ${pythonKnowledge.length}`);
  if (pythonKnowledge.length > 0) {
    console.log(`Domain: ${pythonKnowledge[0].domain}`);
    console.log(`Key concepts: ${pythonKnowledge[0].keyConcepts.slice(0, 3).join(', ')}...`);
  }
  
  console.log(`\nStock knowledge modules: ${stockKnowledge.length}`);
  if (stockKnowledge.length > 0) {
    console.log(`Domain: ${stockKnowledge[0].domain}`);
    console.log(`Key concepts: ${stockKnowledge[0].keyConcepts.slice(0, 3).join(', ')}...`);
  }
  
  // Test formatting
  console.log('\n=== Formatted Knowledge Section ===');
  const formatted = formatKnowledgeSection(pythonKnowledge);
  console.log(formatted.substring(0, 500) + '...');
}

testKnowledgeLoading().catch(console.error);