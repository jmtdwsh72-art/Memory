import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function debugMemoryTypes() {
  console.log('🔍 DEBUGGING MEMORY TYPES IN DATABASE\n');
  
  try {
    // Get all distinct types
    const { data: types, error: typesError } = await supabase
      .from('memory')
      .select('type')
      .neq('type', null);
    
    if (typesError) {
      console.error('Error fetching types:', typesError);
      return;
    }
    
    const distinctTypes = [...new Set(types?.map(t => t.type) || [])];
    console.log('Distinct types found:', distinctTypes);
    
    // Get recent entries to see structure
    const { data: recent, error: recentError } = await supabase
      .from('memory')
      .select('id, user_id, agent_id, type, summary, created_at, tags, metadata')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentError) {
      console.error('Error fetching recent entries:', recentError);
      return;
    }
    
    console.log(`\nRecent entries (${recent?.length || 0}):`);
    recent?.forEach((entry, index) => {
      const userId = entry.user_id ? entry.user_id.substring(0, 20) + '...' : 'null';
      console.log(`${index + 1}. Type: "${entry.type}", Agent: "${entry.agent_id}", User: "${userId}"`);
      console.log(`   Summary: "${entry.summary ? entry.summary.substring(0, 80) + '...' : 'null'}"`);
      console.log(`   Tags: ${JSON.stringify(entry.tags)}`);
      console.log(`   Metadata keys: ${entry.metadata ? Object.keys(entry.metadata).join(', ') : 'none'}`);
      console.log('');
    });
    
    // Count by type
    const typeCounts: Record<string, number> = {};
    types?.forEach(entry => {
      const type = entry.type || 'null';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    console.log('Type distribution:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} entries`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugMemoryTypes().then(() => process.exit(0)).catch(console.error);