import { supabase } from './supabase';

async function setupLogsDirect() {
  console.log('🔧 Setting up logs table via direct SQL...');
  
  try {
    // Use the Supabase REST API to execute SQL
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
        'apikey': process.env.SUPABASE_KEY!
      },
      body: JSON.stringify({
        query: `
          CREATE TABLE IF NOT EXISTS logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT,
            agent_id TEXT,
            input TEXT NOT NULL,
            output TEXT NOT NULL,
            memory_used BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            tags TEXT[]
          );
        `
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log('SQL execution failed:', error);
      
      // Alternative: Try using existing memory table structure and adapt our logging
      console.log('Adapting to use existing memory table for logs...');
      
      // Test if we can insert a log entry into memory table with log-specific tags
      const { data, error: memoryError } = await supabase
        .from('memory')
        .insert({
          agent_id: 'system',
          user_id: 'system',
          type: 'log',
          input: 'System log test',
          output: 'Log entry test',
          summary: 'Testing log functionality via memory table',
          tags: ['system', 'log', 'test']
        });

      if (memoryError) {
        console.error('Failed to use memory table for logs:', memoryError);
      } else {
        console.log('✅ Can use memory table for logs');
        
        // Update our log manager to use memory table
        await updateLogManager();
      }
      
      return;
    }

    const result = await response.json();
    console.log('✅ Logs table created:', result);
    
  } catch (error) {
    console.error('❌ Direct SQL setup failed:', error);
    
    // Fallback: Use memory table
    console.log('Using memory table as fallback for logs...');
    await updateLogManager();
  }
}

async function updateLogManager() {
  // We'll modify the memory manager to handle logs
  console.log('📝 Updating log management to use memory table...');
  
  // Test log entry
  const { data, error } = await supabase
    .from('memory')
    .insert({
      agent_id: 'test-agent',
      user_id: 'test-user', 
      type: 'log',
      input: 'Test log entry',
      output: 'Test log output',
      summary: 'LOG: Test log entry -> Test log output',
      tags: ['log', 'test', 'agent-interaction']
    });

  if (error) {
    console.error('❌ Failed to create test log entry:', error);
  } else {
    console.log('✅ Successfully created log entry in memory table');
    
    // Clean up test entry
    if (data && data[0]) {
      await supabase
        .from('memory')
        .delete()
        .eq('id', data[0].id);
    }
  }
}

setupLogsDirect();