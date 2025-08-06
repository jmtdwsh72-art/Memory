import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function verifyLogging() {
  console.log('🔍 Checking latest memory entries in Supabase...\n');
  
  const { data, error } = await supabase
    .from('memory')
    .select('id, agent_id, user_id, type, summary, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error fetching memories:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('No memory entries found.');
    return;
  }
  
  console.log(`Found ${data.length} recent memory entries:\n`);
  
  data.forEach((entry, index) => {
    console.log(`Entry ${index + 1}:`);
    console.log(`  ID: ${entry.id}`);
    console.log(`  Agent ID: ${entry.agent_id || '❌ MISSING'}`);
    console.log(`  User ID: ${entry.user_id}`);
    console.log(`  Type: ${entry.type}`);
    console.log(`  Summary: ${entry.summary?.substring(0, 60)}...`);
    console.log(`  Created: ${new Date(entry.created_at).toLocaleString()}`);
    
    if (entry.metadata) {
      console.log('  Metadata:');
      console.log(`    - Topic: ${entry.metadata.topic || 'N/A'}`);
      console.log(`    - Assistant ID: ${entry.metadata.assistantId || 'N/A'}`);
      console.log(`    - Routed By: ${entry.metadata.routedBy || 'N/A'}`);
      console.log(`    - Reasoning Level: ${entry.metadata.reasoningLevel || 'N/A'}`);
    }
    console.log('---');
  });
}

verifyLogging().catch(console.error);