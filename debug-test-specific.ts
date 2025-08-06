import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function debugTestSpecific() {
  console.log('🔍 CHECKING FOR TEST USER DATA\n');
  
  try {
    // Look for entries from our recent test
    const testUserPattern = 'memory-reader-test-%';
    
    const { data: testEntries, error } = await supabase
      .from('memory')
      .select('*')
      .like('user_id', testUserPattern)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log(`Found ${testEntries?.length || 0} entries for test users:`);
    
    testEntries?.forEach((entry, index) => {
      console.log(`${index + 1}. [${entry.type.toUpperCase()}] User: ${entry.user_id}`);
      console.log(`   Agent: ${entry.agent_id}`);
      console.log(`   Summary: "${entry.summary.substring(0, 100)}..."`);
      console.log(`   Created: ${new Date(entry.created_at).toLocaleString()}`);
      console.log(`   Tags: ${JSON.stringify(entry.tags)}`);
      if (entry.metadata) {
        console.log(`   Metadata: ${JSON.stringify(entry.metadata, null, 2).substring(0, 200)}...`);
      }
      console.log('');
    });
    
    // Check all entries with type goal or summary from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const { data: recentGoalsAndSummaries, error: recentError } = await supabase
      .from('memory')
      .select('*')
      .in('type', ['goal', 'summary'])
      .gte('created_at', oneHourAgo.toISOString())
      .order('created_at', { ascending: false });
    
    if (recentError) {
      console.error('Recent entries error:', recentError);
    } else {
      console.log(`\nRecent goals and summaries (last hour): ${recentGoalsAndSummaries?.length || 0}`);
      recentGoalsAndSummaries?.forEach((entry, index) => {
        console.log(`${index + 1}. [${entry.type.toUpperCase()}] ${entry.agent_id} - "${entry.summary.substring(0, 60)}..."`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugTestSpecific().then(() => process.exit(0)).catch(console.error);