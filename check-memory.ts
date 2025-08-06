import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

async function checkMemories() {
  const { data, error } = await supabase
    .from('memory')
    .select('id, agent_id, type, summary, created_at, metadata')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('📊 RECENT MEMORY ENTRIES:');
  console.log('========================');
  if (data && data.length > 0) {
    data.forEach((entry, i) => {
      console.log(`${i+1}. [${entry.type?.toUpperCase()}] ${entry.summary?.substring(0, 60)}...`);
      console.log(`   Agent: ${entry.agent_id} | Created: ${new Date(entry.created_at).toLocaleTimeString()}`);
      if (entry.metadata?.originatingAssistant) {
        console.log(`   From Assistant: ${entry.metadata.originatingAssistant} | Confidence: ${entry.metadata.sourceConfidence}`);
      }
      console.log('');
    });
  } else {
    console.log('No recent memory entries found.');
  }
}

checkMemories().catch(console.error);