#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMemoryEntries() {
  console.log('🔍 Checking memory entries in Supabase...');
  
  try {
    const { data, error } = await supabase
      .from('memory')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error fetching memory entries:', error);
      return;
    }
    
    console.log(`📊 Found ${data.length} memory entries:`);
    
    data.forEach((entry, index) => {
      console.log(`\n${index + 1}. ${entry.type.toUpperCase()} [${entry.agent_id}]`);
      console.log(`   ID: ${entry.id}`);
      console.log(`   Input: ${entry.input.substring(0, 50)}...`);
      console.log(`   Summary: ${entry.summary.substring(0, 80)}...`);
      console.log(`   Tags: ${entry.tags ? entry.tags.join(', ') : 'none'}`);
      console.log(`   Relevance: ${entry.relevance}`);
      console.log(`   Created: ${new Date(entry.created_at).toLocaleString()}`);
    });
    
    // Test persistence by creating a test entry
    console.log('\n🧪 Creating test persistence entry...');
    
    const testEntry = {
      agent_id: 'persistence_test',
      type: 'goal',
      input: 'Test cross-session persistence',
      summary: 'This entry tests if memory persists across sessions',
      relevance: 1.0,
      tags: ['test', 'persistence', 'cross_session']
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('memory')
      .insert(testEntry)
      .select();
    
    if (insertError) {
      console.error('Failed to create test entry:', insertError);
    } else {
      console.log('✅ Test entry created:', insertData[0].id);
      console.log('This entry should persist across system restarts.');
    }
    
  } catch (error) {
    console.error('Memory check failed:', error);
  }
}

checkMemoryEntries();