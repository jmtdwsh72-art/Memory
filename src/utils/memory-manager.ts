import { supabase } from '../db/supabase';
import { AgentMessage, MemoryEntry } from './types';
import { memoryEngine } from './memory-engine';
import * as fs from 'fs/promises';
import * as path from 'path';

export class MemoryManager {
  private memoryDir: string;
  private logsDir: string;
  private summariesDir: string;

  constructor() {
    this.memoryDir = path.join(process.cwd(), 'memory');
    this.logsDir = path.join(this.memoryDir, 'logs');
    this.summariesDir = path.join(this.memoryDir, 'summaries');
  }

  async logMessage(message: AgentMessage): Promise<void> {
    try {
      // Use memory table for logs since logs table doesn't exist
      const { error } = await supabase
        .from('memory')
        .insert({
          agent_id: message.agentName,
          user_id: 'system', // We can enhance this later with actual user IDs
          type: 'log',
          input: message.input,
          output: message.output,
          summary: `LOG: ${message.input.substring(0, 100)} -> ${message.output.substring(0, 100)}`,
          tags: ['log', 'agent-interaction', message.agentName]
        });

      if (error) {
        console.error('Failed to log to Supabase:', error);
        await this.logToFile(message);
      }
    } catch (error) {
      console.error('Error logging message:', error);
      await this.logToFile(message);
    }
  }

  async storeSummary(entry: MemoryEntry): Promise<void> {
    try {
      // Use the new memory engine instead
      await memoryEngine.storeMemory(
        entry.agentId,
        entry.input,
        entry.summary,
        entry.userId,
        entry.context
      );
    } catch (error) {
      console.error('Error storing summary:', error);
      await this.storeSummaryToFile(entry);
    }
  }

  async searchMemory(agentName: string, query: string, limit: number = 10): Promise<MemoryEntry[]> {
    try {
      // Use the new memory engine
      const memoryContext = await memoryEngine.recallMemory(
        agentName,
        query,
        undefined,
        { limit, minRelevance: 0.1 }
      );
      
      return memoryContext.entries;
    } catch (error) {
      console.error('Error searching memory:', error);
      return await this.searchFileMemory(agentName, query, limit);
    }
  }

  async getRecentLogs(agentName?: string, limit: number = 50): Promise<AgentMessage[]> {
    try {
      let query = supabase
        .from('logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (agentName) {
        query = query.eq('agent_name', agentName);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get recent logs from Supabase:', error);
        return await this.getLogsFromFiles(agentName, limit);
      }

      return data.map(row => ({
        id: row.id,
        timestamp: new Date(row.timestamp),
        agentName: row.agent_name,
        input: row.input,
        output: row.output,
        memoryUsed: row.memory_used || undefined
      }));
    } catch (error) {
      console.error('Error getting recent logs:', error);
      return await this.getLogsFromFiles(agentName, limit);
    }
  }

  private async logToFile(message: AgentMessage): Promise<void> {
    try {
      await fs.mkdir(this.logsDir, { recursive: true });
      const filename = `${message.agentName}_${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(this.logsDir, filename);
      
      let logs: AgentMessage[] = [];
      try {
        const content = await fs.readFile(filepath, 'utf-8');
        logs = JSON.parse(content);
      } catch {
        // File doesn't exist, start with empty array
      }
      
      logs.push(message);
      await fs.writeFile(filepath, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('Failed to log to file:', error);
    }
  }

  private async storeSummaryToFile(entry: MemoryEntry): Promise<void> {
    try {
      await fs.mkdir(this.summariesDir, { recursive: true });
      const filename = `${entry.agentId}_summaries.json`;
      const filepath = path.join(this.summariesDir, filename);
      
      let summaries: MemoryEntry[] = [];
      try {
        const content = await fs.readFile(filepath, 'utf-8');
        summaries = JSON.parse(content);
      } catch {
        // File doesn't exist, start with empty array
      }
      
      summaries.push(entry);
      summaries.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
      
      if (summaries.length > 100) {
        summaries = summaries.slice(0, 100);
      }
      
      await fs.writeFile(filepath, JSON.stringify(summaries, null, 2));
    } catch (error) {
      console.error('Failed to store summary to file:', error);
    }
  }

  private async searchFileMemory(agentName: string, query: string, limit: number): Promise<MemoryEntry[]> {
    try {
      const filename = `${agentName}_summaries.json`;
      const filepath = path.join(this.summariesDir, filename);
      
      const content = await fs.readFile(filepath, 'utf-8');
      const summaries: MemoryEntry[] = JSON.parse(content);
      
      const results = summaries
        .filter(entry => entry.summary.toLowerCase().includes(query.toLowerCase()))
        .slice(0, limit);
      
      return results.map(entry => ({
        ...entry,
        createdAt: new Date(entry.createdAt),
        lastAccessed: new Date(entry.lastAccessed)
      }));
    } catch (error) {
      console.error('Failed to search file memory:', error);
      return [];
    }
  }

  private async getLogsFromFiles(agentName?: string, limit: number = 50): Promise<AgentMessage[]> {
    try {
      const logs: AgentMessage[] = [];
      const files = await fs.readdir(this.logsDir);
      
      for (const filename of files) {
        if (!filename.endsWith('.json')) continue;
        
        // Extract agent name from filename
        const fileAgentName = filename.replace('_2025-08-01.json', '');
        
        // Filter by agent name if specified
        if (agentName && fileAgentName !== agentName) continue;
        
        try {
          const filepath = path.join(this.logsDir, filename);
          const content = await fs.readFile(filepath, 'utf-8');
          const fileLogs: AgentMessage[] = JSON.parse(content);
          
          // Convert timestamp strings back to Date objects
          const normalizedLogs = fileLogs.map(log => ({
            ...log,
            timestamp: new Date(log.timestamp)
          }));
          
          logs.push(...normalizedLogs);
        } catch (error) {
          console.error(`Error reading log file ${filename}:`, error);
          continue;
        }
      }
      
      // Sort by timestamp (newest first) and limit results
      return logs
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
        
    } catch (error) {
      console.error('Error reading logs from files:', error);
      return [];
    }
  }
}