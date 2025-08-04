import { supabase } from './supabase';

async function createLogsTable() {
  try {
    console.log('🔧 Creating logs table...');
    
    // Check if logs table exists
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'logs');

    if (tables && tables.length > 0) {
      console.log('✅ Logs table already exists');
      
      // Check current schema
      const { data: columns } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_schema', 'public')
        .eq('table_name', 'logs');
        
      console.log('Current logs table schema:', columns);
      return;
    }

    // Create logs table with required schema
    const createTableSQL = `
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
    `;

    // Create the table using a SQL query
    const { error } = await supabase.rpc('exec_sql', { query: createTableSQL });
    
    if (error) {
      console.error('Failed to create logs table:', error);
      
      // Alternative approach - create via direct INSERT (this will fail but helps us understand the issue)
      const { error: insertError } = await supabase
        .from('logs')
        .insert({
          user_id: 'test',
          agent_id: 'test',
          input: 'test',
          output: 'test',
          memory_used: false,
          tags: ['test']
        });
        
      if (insertError) {
        console.log('Insert test error (expected):', insertError.message);
        
        // Try creating table manually by testing the existing structure
        console.log('Attempting to understand current database structure...');
        
        // Check what tables do exist
        const { data: existingTables } = await supabase
          .from('pg_tables')
          .select('tablename')
          .eq('schemaname', 'public');
          
        console.log('Existing tables:', existingTables);
      }
      
      return;
    }

    console.log('✅ Logs table created successfully');
    
    // Test the table
    const testInsert = await supabase
      .from('logs')
      .insert({
        user_id: 'test-user',
        agent_id: 'test-agent',
        input: 'Test input',
        output: 'Test output',
        memory_used: true,
        tags: ['test', 'initialization']
      });

    if (testInsert.error) {
      console.error('Test insert failed:', testInsert.error);
    } else {
      console.log('✅ Test insert successful');
      
      // Clean up test data
      await supabase
        .from('logs')
        .delete()
        .eq('user_id', 'test-user');
    }
    
  } catch (error) {
    console.error('❌ Failed to create logs table:', error);
  }
}

// Run the creation
createLogsTable();