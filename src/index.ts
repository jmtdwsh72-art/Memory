import { config } from 'dotenv';
import { RouterAgent } from './agents/agent-router';
import SupabaseConnection from './db/supabase';

config();

class MemoryAIAssistant {
  private router: RouterAgent;

  constructor() {
    this.router = new RouterAgent();
  }

  async initialize(): Promise<void> {
    try {
      const supabaseConnection = SupabaseConnection.getInstance();
      const isConnected = await supabaseConnection.testConnection();
      
      if (isConnected) {
        console.log('✅ Supabase connection established');
      } else {
        console.log('⚠️  Supabase connection failed - using file-based storage');
      }
      
      console.log('🤖 Memory AI Assistant initialized');
      console.log('📡 Router agent ready');
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
  }

  async processInput(input: string): Promise<string> {
    try {
      const response = await this.router.processInput(input);
      return response.message;
    } catch (error) {
      console.error('Error processing input:', error);
      return `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }

  getRouterConfig() {
    return this.router.getConfig();
  }
}

async function main() {
  const assistant = new MemoryAIAssistant();
  
  try {
    await assistant.initialize();
    
    // Example usage
    const testInput = "Research the latest developments in AI memory systems";
    console.log(`\n🔍 Testing with input: "${testInput}"`);
    
    const response = await assistant.processInput(testInput);
    console.log(`\n🤖 Response: ${response}`);
    
  } catch (error) {
    console.error('❌ Application failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default MemoryAIAssistant;