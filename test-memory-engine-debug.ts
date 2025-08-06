import { memoryEngine } from './src/utils/memory-engine';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Patch console.log to capture memory engine logs
const originalLog = console.log;
const originalError = console.error;
let capturedLogs: string[] = [];
let capturedErrors: string[] = [];

console.log = (...args) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  capturedLogs.push(message);
  originalLog(...args);
};

console.error = (...args) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  capturedErrors.push(message);
  originalError(...args);
};

async function debugMemoryEngine() {
  console.log('🐛 MEMORY ENGINE DEBUG TRACE\n');
  console.log('=' .repeat(50));
  
  const userId = `debug-engine-${Date.now()}`;

  try {
    // Clear capture arrays
    capturedLogs = [];
    capturedErrors = [];

    console.log('📝 Attempting to store memory via memory engine...');
    
    const result = await memoryEngine.storeMemory(
      'debug-agent',
      'I want to debug the memory system',
      'User wants to debug and understand how the memory system works',
      userId,
      'Debug context for memory system testing',
      'goal',
      ['debug', 'memory', 'system'],
      { 
        sourceConfidence: 0.95, 
        extractionPattern: 'debug_test',
        sessionId: 'debug-session',
        assistantId: 'debug-asst',
        threadId: 'debug-thread'
      }
    );

    console.log('\n📊 Memory Engine Result:');
    console.log(`   ID: ${result.id}`);
    console.log(`   Agent ID: ${result.agentId}`);
    console.log(`   User ID: ${result.userId}`);
    console.log(`   Type: ${result.type}`);
    console.log(`   Summary: ${result.summary}`);
    console.log(`   Tags: ${JSON.stringify(result.tags)}`);
    console.log(`   Metadata: ${JSON.stringify(result.metadata)}`);

    console.log('\n📝 Captured Logs:');
    capturedLogs.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log}`);
    });

    console.log('\n❌ Captured Errors:');
    if (capturedErrors.length === 0) {
      console.log('   (none)');
    } else {
      capturedErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    // Wait a bit for database operations
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n🔍 Direct database check...');
    const { data: dbData, error: dbError } = await supabase
      .from('memory')
      .select('*')
      .eq('user_id', userId);

    if (dbError) {
      console.error('Database check failed:', dbError);
    } else {
      console.log(`Found ${dbData?.length || 0} entries in database for user ${userId}`);
      
      if (dbData && dbData.length > 0) {
        dbData.forEach((entry, index) => {
          console.log(`   ${index + 1}. [${entry.type.toUpperCase()}] ${entry.summary}`);
          console.log(`      Agent: ${entry.agent_id}, Created: ${entry.created_at}`);
        });
      }
    }

    console.log('\n🔍 Checking memory engine internal state...');
    console.log('Memory engine instance:', memoryEngine);
    
    // Try to access private properties using any cast for debugging
    const memoryEngineAny = memoryEngine as any;
    console.log('Supabase available:', memoryEngineAny.supabaseAvailable);
    console.log('Memory mode:', memoryEngineAny.memoryMode);

  } catch (error) {
    console.error('\n❌ Debug failed:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
  
  // Restore console
  console.log = originalLog;
  console.error = originalError;
  
  process.exit(0);
}

debugMemoryEngine().catch(console.error);