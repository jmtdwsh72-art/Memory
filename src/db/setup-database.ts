#!/usr/bin/env tsx

import { supabase } from './supabase';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Setup database schema in Supabase
 */
async function setupDatabase() {
  console.log('🚀 Setting up Memory Agent database schema...');
  
  try {
    // Read the setup SQL file
    const setupSqlPath = path.join(__dirname, 'setup.sql');
    const setupSql = await fs.readFile(setupSqlPath, 'utf-8');
    
    // Test connection first
    console.log('Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('memory')
      .select('count')
      .limit(1);
      
    if (testError && !testError.message.includes('does not exist')) {
      throw new Error(`Connection test failed: ${testError.message}`);
    }
    
    console.log('✅ Supabase connection successful');
    
    // Check if memory table already exists by trying to query it
    console.log('Checking if tables exist...');
    let memoryTableExists = false;
    
    const { data: memoryTest, error: memoryError } = await supabase
      .from('memory')
      .select('count')
      .limit(1);
      
    memoryTableExists = !memoryError || !memoryError.message.includes('does not exist');
    
    console.log('Memory table exists:', memoryTableExists);
    
    // Apply migration if needed
    if (!memoryTableExists) {
      console.log('📝 Creating database schema...');
      
      // Note: We would need to execute the SQL through Supabase dashboard or API
      console.log('⚠️  Please run the following SQL in your Supabase SQL Editor:');
      console.log('\n' + '='.repeat(50));
      console.log(setupSql);
      console.log('='.repeat(50) + '\n');
    } else {
      console.log('✅ Database schema already exists');
      
      // Check if we need to add the 'goal' type
      console.log('Checking for goal memory type support...');
      
      try {
        // Try to insert a test goal entry (will fail if constraint doesn't allow 'goal')
        const testEntry = {
          agent_id: 'test',
          type: 'goal' as const,
          input: 'test',
          summary: 'test goal entry for validation'
        };
        
        const { error: insertError } = await supabase
          .from('memory')
          .insert(testEntry);
          
        if (insertError && insertError.message.includes('violates check constraint')) {
          console.log('⚠️  Goal type not supported. Please run the migration:');
          const migrationPath = path.join(__dirname, 'migrations', '001_add_goal_memory_type.sql');
          const migrationSql = await fs.readFile(migrationPath, 'utf-8');
          console.log('\n' + '='.repeat(50));
          console.log(migrationSql);
          console.log('='.repeat(50) + '\n');
        } else if (insertError) {
          console.log('Database test insert failed (this may be expected):', insertError.message);
        } else {
          // Clean up test entry
          await supabase.from('memory').delete().eq('agent_id', 'test').eq('summary', 'test goal entry for validation');
          console.log('✅ Goal memory type is supported');
        }
      } catch (error) {
        console.log('Could not test goal type support:', error);
      }
    }
    
    // Test basic operations
    console.log('Testing basic database operations...');
    
    // Test memory table operations
    const testMemory = {
      id: `test_${Date.now()}`,
      agent_id: 'test_agent',
      type: 'summary' as const,
      input: 'test input',
      summary: 'test summary',
      relevance_score: 1.0,
      frequency: 1,
      tags: ['test']
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('memory')
      .insert(testMemory)
      .select();
      
    if (insertError) {
      throw new Error(`Failed to insert test memory: ${insertError.message}`);
    }
    
    console.log('✅ Memory insert successful');
    
    // Test memory retrieval
    const { data: selectData, error: selectError } = await supabase
      .from('memory')
      .select('*')
      .eq('id', testMemory.id);
      
    if (selectError) {
      throw new Error(`Failed to select test memory: ${selectError.message}`);
    }
    
    console.log('✅ Memory retrieval successful');
    
    // Clean up test data
    await supabase
      .from('memory')
      .delete()
      .eq('id', testMemory.id);
      
    console.log('✅ Test cleanup successful');
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('Memory Agent is ready to use Supabase for persistent storage.');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

export { setupDatabase };