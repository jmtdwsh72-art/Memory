#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking current Supabase schema...');
  
  try {
    // Try to get schema information by describing the table
    const { data, error } = await supabase
      .from('memory')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error querying memory table:', error);
      return;
    }
    
    console.log('✅ Memory table query successful');
    
    // Insert a test record to see what fields are actually accepted
    const testRecord = {
      agent_id: 'schema_test',
      type: 'summary',
      input: 'test input',
      summary: 'test summary'
    };
    
    console.log('🧪 Testing minimal insert...');
    const { data: insertData, error: insertError } = await supabase
      .from('memory')
      .insert(testRecord)
      .select();
    
    if (insertError) {
      console.error('Insert error:', insertError);
    } else {
      console.log('✅ Insert successful, record structure:', insertData[0]);
      
      // Clean up
      await supabase
        .from('memory')
        .delete()
        .eq('agent_id', 'schema_test');
    }
    
    // Test with all expected fields
    console.log('🧪 Testing full insert...');
    const fullRecord = {
      agent_id: 'schema_test_full',
      user_id: null,
      type: 'goal',
      input: 'test input',
      summary: 'test summary',
      context: 'test context',
      relevance_score: 1.0,
      frequency: 1,
      tags: ['test']
    };
    
    const { data: fullInsertData, error: fullInsertError } = await supabase
      .from('memory')
      .insert(fullRecord)
      .select();
    
    if (fullInsertError) {
      console.error('Full insert error:', fullInsertError);
      console.log('This tells us which columns are missing or have different names');
    } else {
      console.log('✅ Full insert successful:', fullInsertData[0]);
      
      // Clean up
      await supabase
        .from('memory')
        .delete()
        .eq('agent_id', 'schema_test_full');
    }
    
  } catch (error) {
    console.error('Schema check failed:', error);
  }
}

checkSchema();