import { supabase } from './supabase';

async function fixSchema() {
  try {
    console.log('🔧 Fixing database schema...');
    
    // Check current schema
    const { data: memoryColumns, error: memoryError } = await supabase
      .from('memory')
      .select('*')
      .limit(0);
      
    if (memoryError) {
      console.log('Memory table needs fixing:', memoryError.message);
      
      // Add missing columns to memory table
      const alterQueries = [
        `ALTER TABLE memory ADD COLUMN IF NOT EXISTS frequency INTEGER DEFAULT 1;`,
        `ALTER TABLE memory ADD COLUMN IF NOT EXISTS relevance_score DECIMAL DEFAULT 1.0;`,
        `ALTER TABLE memory ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`,
        `ALTER TABLE memory ADD COLUMN IF NOT EXISTS context TEXT;`
      ];
      
      for (const query of alterQueries) {
        console.log('Running:', query);
        const { error } = await supabase.rpc('exec_sql', { query });
        if (error) {
          console.error('Query failed:', error);
        }
      }
    }
    
    // Check logs table
    const { data: logsColumns, error: logsError } = await supabase
      .from('logs')
      .select('*')
      .limit(0);
      
    if (logsError && logsError.message.includes('Could not find the table')) {
      console.log('Creating logs table...');
      
      const createLogsTable = `
        CREATE TABLE IF NOT EXISTS logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          agent_name VARCHAR(50) NOT NULL,
          input TEXT NOT NULL,
          output TEXT NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          session_id VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      const { error } = await supabase.rpc('exec_sql', { query: createLogsTable });
      if (error) {
        console.error('Failed to create logs table:', error);
      }
    }
    
    // Create error_logs table if it doesn't exist
    const createErrorLogsTable = `
      CREATE TABLE IF NOT EXISTS error_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id VARCHAR(50),
        error_type VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        stack TEXT,
        context JSONB,
        severity VARCHAR(20) DEFAULT 'error',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await supabase.rpc('exec_sql', { query: createErrorLogsTable });
    
    console.log('✅ Schema fix completed');
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error);
  }
}

// Run the fix
fixSchema();