#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSql(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    throw error;
  }
  return data;
}

async function setupDatabase() {
  console.log('🚀 Setting up Supabase database...');
  
  try {
    // Read SQL schema
    const sqlPath = path.join(__dirname, 'src', 'db', 'setup.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Creating tables and indexes...');
    
    // Split SQL into individual statements and execute them
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log('Executing:', statement.substring(0, 50) + '...');
          
          // Direct SQL execution using the REST API
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey
            },
            body: JSON.stringify({ query: statement })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.log('Statement failed (may be expected):', errorText);
          } else {
            const result = await response.json();
            console.log('✅ Statement executed successfully');
          }
        } catch (error) {
          console.log('Statement error (may be expected):', error.message);
        }
      }
    }
    
    // Test the setup by inserting and retrieving a test record
    console.log('🧪 Testing database operations...');
    
    const testMemory = {
      agent_id: 'test_setup',
      type: 'goal',
      input: 'setup test',
      summary: 'testing database setup with goal type',
      tags: ['setup', 'test', 'goal']
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('memory')
      .insert(testMemory)
      .select();
    
    if (insertError) {
      throw new Error(`Test insert failed: ${insertError.message}`);
    }
    
    console.log('✅ Test memory entry created:', insertData[0].id);
    
    // Test retrieval
    const { data: selectData, error: selectError } = await supabase
      .from('memory')
      .select('*')
      .eq('agent_id', 'test_setup');
    
    if (selectError) {
      throw new Error(`Test select failed: ${selectError.message}`);
    }
    
    console.log('✅ Test memory entry retrieved successfully');
    
    // Clean up test data
    await supabase
      .from('memory')
      .delete()
      .eq('agent_id', 'test_setup');
    
    console.log('✅ Test cleanup completed');
    console.log('\n🎉 Supabase database setup completed successfully!');
    console.log('Memory Agent is now connected to persistent cloud storage.');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\n📋 Manual Setup Instructions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Open the SQL Editor');
    console.log('3. Run the contents of src/db/setup.sql');
    console.log('4. Restart the Memory Agent application');
  }
}

setupDatabase();