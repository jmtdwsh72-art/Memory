import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

export interface Database {
  public: {
    Tables: {
      logs: {
        Row: {
          id: string;
          agent_name: string;
          input: string;
          output: string;
          timestamp: string;
          memory_used: string[] | null;
        };
        Insert: {
          id?: string;
          agent_name: string;
          input: string;
          output: string;
          timestamp?: string;
          memory_used?: string[] | null;
        };
        Update: {
          id?: string;
          agent_name?: string;
          input?: string;
          output?: string;
          timestamp?: string;
          memory_used?: string[] | null;
        };
      };
      memory: {
        Row: {
          id: string;
          agent_id: string;
          session_id: string | null;
          user_id: string | null;
          type: 'log' | 'summary' | 'pattern' | 'correction' | 'goal';
          input: string;
          output: string | null;
          summary: string;
          relevance: number;
          created_at: string;
          tags: string[] | null;
          metadata: Record<string, any> | null;
        };
        Insert: {
          id?: string;
          agent_id: string;
          session_id?: string | null;
          user_id?: string | null;
          type: 'log' | 'summary' | 'pattern' | 'correction' | 'goal';
          input: string;
          output?: string | null;
          summary: string;
          relevance?: number;
          created_at?: string;
          tags?: string[] | null;
          metadata?: Record<string, any> | null;
        };
        Update: {
          id?: string;
          agent_id?: string;
          session_id?: string | null;
          user_id?: string | null;
          type?: 'log' | 'summary' | 'pattern' | 'correction' | 'goal';
          input?: string;
          output?: string | null;
          summary?: string;
          relevance?: number;
          created_at?: string;
          tags?: string[] | null;
          metadata?: Record<string, any> | null;
        };
      };
      user: {
        Row: {
          id: string;
          tone_preference: string | null;
          agent_usage: Record<string, any> | null;
          feedback: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tone_preference?: string | null;
          agent_usage?: Record<string, any> | null;
          feedback?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tone_preference?: string | null;
          agent_usage?: Record<string, any> | null;
          feedback?: string | null;
          created_at?: string;
        };
      };
    };
  };
}

class SupabaseConnection {
  private static instance: SupabaseConnection;
  private client: SupabaseClient<Database>;

  private constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables. Please check SUPABASE_URL and SUPABASE_KEY');
    }

    this.client = createClient<Database>(supabaseUrl, supabaseKey);
  }

  public static getInstance(): SupabaseConnection {
    if (!SupabaseConnection.instance) {
      SupabaseConnection.instance = new SupabaseConnection();
    }
    return SupabaseConnection.instance;
  }

  public getClient(): SupabaseClient<Database> {
    return this.client;
  }

  public async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.client.from('logs').select('count').limit(1);
      return !error;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  }
}

export const supabase = SupabaseConnection.getInstance().getClient();
export default SupabaseConnection;