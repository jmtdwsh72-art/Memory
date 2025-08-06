import { supabase } from '../db/supabase';
import { MemoryEntry, MemoryContext, MemoryPattern, MemorySearchOptions } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { logMemoryError } from './error-logger';

export class MemoryEngine {
  private static instance: MemoryEngine;
  private memoryDir: string;
  private patterns: Map<string, MemoryPattern>;
  private memoryMode: 'supabase' | 'file' | 'hybrid';
  private supabaseAvailable: boolean = false;

  private constructor() {
    this.memoryDir = path.join(process.cwd(), 'memory');
    this.patterns = new Map();
    this.memoryMode = (process.env.MEMORY_MODE as 'supabase' | 'file' | 'hybrid') || 'hybrid';
    this.loadPatterns();
    // Don't test connection in constructor - will be tested on first use
  }

  private async testSupabaseConnection(): Promise<void> {
    try {
      const { error } = await supabase.from('memory').select('count').limit(1);
      this.supabaseAvailable = !error;
      if (this.supabaseAvailable) {
        console.log('✅ Supabase connection established');
      } else {
        console.log('⚠️  Supabase connection failed - using file-based storage');
      }
    } catch (error) {
      this.supabaseAvailable = false;
      console.log('⚠️  Supabase connection failed - using file-based storage');
    }
  }

  public static getInstance(): MemoryEngine {
    if (!MemoryEngine.instance) {
      MemoryEngine.instance = new MemoryEngine();
    }
    return MemoryEngine.instance;
  }

  /**
   * Store a new memory entry with automatic summarization and pattern detection
   */
  async storeMemory(
    agentId: string,
    input: string,
    output: string,
    userId?: string,
    context?: string,
    type: 'log' | 'summary' | 'pattern' | 'correction' | 'goal' | 'goal_progress' | 'session_summary' | 'session_decision' = 'summary',
    tags?: string[],
    metadata?: Record<string, any>
  ): Promise<MemoryEntry> {
    const summary = this.generateSummary(input, output);
    const autoTags = this.extractTags(input, output);
    const finalTags = tags || autoTags;
    
    const memoryEntry: MemoryEntry = {
      id: crypto.randomUUID(),
      agentId,
      userId,
      type,
      input,
      summary,
      context,
      relevanceScore: type === 'goal' ? 1.2 : type === 'goal_progress' ? 1.3 : type === 'session_summary' ? 1.4 : type === 'session_decision' ? 1.1 : type === 'correction' ? 1.2 : 1.0,
      frequency: 1,
      lastAccessed: new Date(),
      createdAt: new Date(),
      tags: finalTags,
      metadata
    };

    // Test Supabase connection if needed
    if ((this.memoryMode === 'supabase' || this.memoryMode === 'hybrid') && !this.supabaseAvailable) {
      await this.testSupabaseConnection();
    }

    // Determine storage method based on mode and availability
    const shouldUseSupabase = (this.memoryMode === 'supabase' && this.supabaseAvailable) || 
                              (this.memoryMode === 'hybrid' && this.supabaseAvailable);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Memory Engine Storage Decision:');
      console.log(`   Memory Mode: ${this.memoryMode}`);
      console.log(`   Supabase Available: ${this.supabaseAvailable}`);
      console.log(`   Should Use Supabase: ${shouldUseSupabase}`);
    }
                              
    if (shouldUseSupabase) {
      try {
        // Store in Supabase (using actual schema, let Supabase generate UUID)
        const insertData = {
          agent_id: memoryEntry.agentId,
          user_id: memoryEntry.userId,
          type: memoryEntry.type,
          input: memoryEntry.input,
          output: output, // Use the raw output
          summary: memoryEntry.summary,
          relevance: memoryEntry.relevanceScore,
          tags: memoryEntry.tags,
          metadata: memoryEntry.metadata
          // Removed goal-specific fields as they don't exist in current schema
          // ...(memoryEntry.goalId && { goal_id: memoryEntry.goalId }),
          // ...(memoryEntry.goalSummary && { goal_summary: memoryEntry.goalSummary }),
          // ...(memoryEntry.goalStatus && { goal_status: memoryEntry.goalStatus })
        };

        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Memory Engine: Inserting data to Supabase:', JSON.stringify(insertData, null, 2));
        }

        const { data: responseData, error } = await supabase
          .from('memory')
          .insert(insertData)
          .select();

        if (error) {
          console.error('Failed to store memory in Supabase:', error);
          if (this.memoryMode === 'supabase') {
            throw new Error(`Supabase storage failed: ${error.message}`);
          }
          // Fall back to file storage for hybrid mode
          await this.storeMemoryToFile(memoryEntry);
        } else {
          // Update the memory entry with the generated ID from Supabase
          if (responseData && responseData[0]) {
            memoryEntry.id = responseData[0].id;
          }
          console.log('✅ Memory stored in Supabase:', memoryEntry.id);
          // Update patterns and detect learning opportunities
          await this.analyzeAndUpdatePatterns(memoryEntry);
        }
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error('Memory storage failed');
        
        // Log memory error with context
        await logMemoryError(errorObj, {
          agentId,
          userId,
          operation: 'memory_storage',
          memoryId: memoryEntry.id
        });
        
        if (this.memoryMode === 'supabase') {
          throw errorObj; // Don't fall back in supabase-only mode
        }
        
        console.error('Error storing memory, falling back to file:', error);
        await this.storeMemoryToFile(memoryEntry);
      }
    } else {
      // Store in file system
      await this.storeMemoryToFile(memoryEntry);
      await this.analyzeAndUpdatePatterns(memoryEntry);
    }

    return memoryEntry;
  }

  /**
   * Retrieve relevant memories with advanced scoring and context building
   */
  async recallMemory(
    agentId: string,
    query: string,
    userId?: string,
    options: MemorySearchOptions = {}
  ): Promise<MemoryContext> {
    const {
      limit = 10,
      minRelevance = 0.3,
      includePatterns = true,
      timeRange,
      types = ['summary', 'pattern', 'correction']
    } = options;

    // Determine storage method based on mode and availability
    const shouldUseSupabase = (this.memoryMode === 'supabase' && this.supabaseAvailable) || 
                              (this.memoryMode === 'hybrid' && this.supabaseAvailable);
                              
    if (shouldUseSupabase) {
      try {
        // Build Supabase query (using actual schema)
        let supabaseQuery = supabase
          .from('memory')
          .select('*')
          .eq('agent_id', agentId)
          .in('type', types)
          .gte('relevance', minRelevance)
          .order('relevance', { ascending: false })
          .order('created_at', { ascending: false });

        if (userId) {
          supabaseQuery = supabaseQuery.eq('user_id', userId);
        }

        if (timeRange) {
          supabaseQuery = supabaseQuery
            .gte('created_at', timeRange.start.toISOString())
            .lte('created_at', timeRange.end.toISOString());
        }

        const { data, error } = await supabaseQuery.limit(limit * 2); // Get extra for filtering

        if (error) {
          console.error('Failed to recall memory from Supabase:', error);
          if (this.memoryMode === 'supabase') {
            throw new Error(`Supabase recall failed: ${error.message}`);
          }
          return await this.recallMemoryFromFile(agentId, query, options);
        }

        const memories: MemoryEntry[] = data.map(row => ({
          id: row.id,
          agentId: row.agent_id,
          userId: row.user_id,
          type: row.type,
          input: row.input,
          summary: row.summary,
          context: row.output, // Use output as context
          relevanceScore: row.relevance,
          frequency: 1, // Default frequency
          lastAccessed: new Date(row.created_at), // Use created_at as last accessed
          createdAt: new Date(row.created_at),
          tags: row.tags,
          metadata: row.metadata,
          // Include goal-specific fields if present
          ...(row.goal_id && { goalId: row.goal_id }),
          ...(row.goal_summary && { goalSummary: row.goal_summary }),
          ...(row.goal_status && { goalStatus: row.goal_status })
        }));

        // Calculate semantic relevance scores
        const scoredMemories = memories.map(memory => ({
          ...memory,
          relevanceScore: this.calculateRelevanceScore(query, memory)
        }));

        // Filter and sort by relevance
        const relevantMemories = scoredMemories
          .filter(memory => memory.relevanceScore >= minRelevance)
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, limit);

        // Update last accessed timestamps
        await this.updateLastAccessed(relevantMemories.map(m => m.id));

        // Get patterns if requested
        const patterns = includePatterns ? await this.getRelevantPatterns(query) : [];

        const averageRelevance = relevantMemories.length > 0 
          ? relevantMemories.reduce((sum, m) => sum + m.relevanceScore, 0) / relevantMemories.length
          : 0;

        return {
          entries: relevantMemories,
          totalMatches: memories.length,
          averageRelevance,
          patterns
        };

      } catch (error) {
        console.error('Error recalling memory from Supabase:', error);
        if (this.memoryMode === 'supabase') {
          throw error; // Don't fall back in supabase-only mode
        }
        return await this.recallMemoryFromFile(agentId, query, options);
      }
    } else {
      // Use file-based storage
      return await this.recallMemoryFromFile(agentId, query, options);
    }
  }

  /**
   * Learn from user corrections and feedback
   */
  async learnFromCorrection(
    agentId: string,
    originalInput: string,
    originalOutput: string,
    correction: string,
    userId?: string
  ): Promise<void> {
    const correctionEntry: MemoryEntry = {
      id: crypto.randomUUID(),
      agentId,
      userId,
      type: 'correction',
      input: originalInput,
      summary: `Correction: ${correction}`,
      context: `Original response: ${originalOutput}`,
      relevanceScore: 1.2, // Higher relevance for corrections
      frequency: 1,
      lastAccessed: new Date(),
      createdAt: new Date(),
      tags: this.extractTags(originalInput, correction)
    };

    await this.storeMemoryEntry(correctionEntry);
    
    // Update patterns to learn from correction
    await this.updatePatternFromCorrection(originalInput, originalOutput, correction);
  }

  /**
   * Build context string for agent input injection
   */
  buildMemoryContext(memoryContext: MemoryContext): string {
    if (memoryContext.entries.length === 0) {
      return '';
    }

    const contextParts: string[] = [
      '\n--- Memory Context ---'
    ];

    // Add relevant memories
    memoryContext.entries.forEach((entry) => {
      const relevanceIcon = (entry.relevanceScore ?? 0) > 0.8 ? '🎯' : (entry.relevanceScore ?? 0) > 0.6 ? '📍' : '💡';
      contextParts.push(
        `${relevanceIcon} [${entry.type.toUpperCase()}] ${entry.summary}`
      );
      
      if (entry.type === 'correction' && entry.context) {
        contextParts.push(`   ⚠️  Previous mistake: ${entry.context}`);
      }
    });

    // Add patterns
    if (memoryContext.patterns.length > 0) {
      contextParts.push('\n📊 Detected Patterns:');
      memoryContext.patterns.forEach(pattern => {
        contextParts.push(`   • ${pattern.pattern} (seen ${pattern.frequency}x)`);
        if (pattern.corrections && pattern.corrections.length > 0) {
          contextParts.push(`     ⚠️  Common corrections: ${pattern.corrections.join(', ')}`);
        }
      });
    }

    contextParts.push('--- End Memory Context ---\n');
    
    return contextParts.join('\n');
  }

  /**
   * Get memory statistics for an agent
   */
  async getMemoryStats(agentId: string, userId?: string): Promise<{
    totalEntries: number;
    byType: Record<string, number>;
    averageRelevance: number;
    topPatterns: MemoryPattern[];
    recentActivity: MemoryEntry[];
  }> {
    try {
      let query = supabase
        .from('memory')
        .select('*')
        .eq('agent_id', agentId);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get memory stats from Supabase:', error);
        return await this.getMemoryStatsFromFile(agentId, userId);
      }

      const memories: MemoryEntry[] = data.map(row => ({
        id: row.id,
        agentId: row.agent_id,
        userId: row.user_id,
        type: row.type,
        input: row.input,
        summary: row.summary,
        context: row.context,
        relevanceScore: row.relevance_score,
        frequency: row.frequency,
        lastAccessed: new Date(row.last_accessed),
        createdAt: new Date(row.created_at),
        tags: row.tags,
        metadata: row.metadata,
        // Include goal-specific fields if present
        ...(row.goal_id && { goalId: row.goal_id }),
        ...(row.goal_summary && { goalSummary: row.goal_summary }),
        ...(row.goal_status && { goalStatus: row.goal_status })
      }));

      const byType = memories.reduce((acc, memory) => {
        acc[memory.type] = (acc[memory.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const averageRelevance = memories.length > 0
        ? memories.reduce((sum, m) => sum + (m.relevanceScore ?? 0), 0) / memories.length
        : 0;

      const recentActivity = memories
        .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
        .slice(0, 5);

      const topPatterns = Array.from(this.patterns.values())
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5);

      return {
        totalEntries: memories.length,
        byType,
        averageRelevance,
        topPatterns,
        recentActivity
      };

    } catch (error) {
      console.error('Error getting memory stats:', error);
      return await this.getMemoryStatsFromFile(agentId, userId);
    }
  }

  /**
   * Delete a specific memory entry
   */
  async deleteMemory(agentId: string, memoryId: string): Promise<boolean> {
    try {
      // Try Supabase first
      const { error } = await supabase
        .from('memory')
        .delete()
        .eq('agent_id', agentId)
        .eq('id', memoryId);

      if (error) {
        console.error('Failed to delete memory from Supabase:', error);
        return await this.deleteMemoryFromFile(agentId, memoryId);
      }

      return true;
    } catch (error) {
      console.error('Error deleting memory:', error);
      return await this.deleteMemoryFromFile(agentId, memoryId);
    }
  }

  /**
   * Clean up old or low-relevance memories
   */
  async cleanupMemory(agentId: string, options: {
    maxAge?: number; // days
    minRelevance?: number;
    maxEntries?: number;
  } = {}): Promise<number> {
    const {
      maxAge = 90, // 3 months
      minRelevance = 0.1,
      maxEntries = 1000
    } = options;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAge);

      // Delete old, low-relevance entries
      const { count: deletedCount, error } = await supabase
        .from('memory')
        .delete()
        .eq('agent_id', agentId)
        .or(`created_at.lt.${cutoffDate.toISOString()},relevance_score.lt.${minRelevance}`);

      if (error) {
        throw error;
      }

      // If still too many entries, delete oldest low-frequency ones
      const { data: remainingEntries } = await supabase
        .from('memory')
        .select('id')
        .eq('agent_id', agentId)
        .order('frequency', { ascending: true })
        .order('created_at', { ascending: true });

      if (remainingEntries && remainingEntries.length > maxEntries) {
        const toDelete = remainingEntries.slice(0, remainingEntries.length - maxEntries);
        const deleteIds = toDelete.map(entry => entry.id);

        await supabase
          .from('memory')
          .delete()
          .in('id', deleteIds);
      }

      return deletedCount || 0;

    } catch (error) {
      console.error('Error cleaning up memory:', error);
      return 0;
    }
  }

  // Private helper methods

  private calculateRelevanceScore(query: string, memory: MemoryEntry): number {
    const queryTerms = this.extractKeyTerms(query.toLowerCase());
    const summaryTerms = this.extractKeyTerms(memory.summary.toLowerCase());
    const inputTerms = this.extractKeyTerms(memory.input.toLowerCase());
    
    let score = 0;
    
    // Exact matches in summary get highest score
    const summaryMatches = queryTerms.filter(term => summaryTerms.includes(term));
    score += summaryMatches.length * 0.4;
    
    // Matches in input get medium score
    const inputMatches = queryTerms.filter(term => inputTerms.includes(term));
    score += inputMatches.length * 0.3;
    
    // Tag matches get bonus score
    if (memory.tags) {
      const tagMatches = queryTerms.filter(term => 
        memory.tags!.some(tag => tag.toLowerCase().includes(term))
      );
      score += tagMatches.length * 0.2;
    }
    
    // Frequency bonus
    score += Math.min(memory.frequency * 0.1, 0.3);
    
    // Recency bonus (more recent = higher score)
    const daysSinceAccessed = (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
    const recencyBonus = Math.max(0, 0.2 - (daysSinceAccessed * 0.01));
    score += recencyBonus;
    
    // Type-specific bonuses
    if (memory.type === 'correction') score += 0.3;
    if (memory.type === 'pattern') score += 0.2;
    
    return Math.min(score, 1.0);
  }

  private extractKeyTerms(text: string): string[] {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'];
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 20); // Limit to top 20 terms
  }

  private generateSummary(input: string, output: string): string {
    // Simple extractive summarization
    const inputTerms = this.extractKeyTerms(input);
    const outputLines = output.split('\n').filter(line => line.trim().length > 0);
    
    // Find the most relevant output line
    let bestLine = outputLines[0] || output.substring(0, 100);
    let bestScore = 0;
    
    for (const line of outputLines) {
      const lineTerms = this.extractKeyTerms(line.toLowerCase());
      const matchScore = inputTerms.filter(term => lineTerms.includes(term)).length;
      if (matchScore > bestScore) {
        bestScore = matchScore;
        bestLine = line;
      }
    }
    
    return bestLine.length > 200 ? bestLine.substring(0, 200) + '...' : bestLine;
  }

  private extractTags(input: string, output: string): string[] {
    const allText = `${input} ${output}`.toLowerCase();
    const terms = this.extractKeyTerms(allText);
    
    // Get most frequent terms as tags
    const termCounts = terms.reduce((acc, term) => {
      acc[term] = (acc[term] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(termCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([term]) => term);
  }

  private async analyzeAndUpdatePatterns(memory: MemoryEntry): Promise<void> {
    const inputPattern = this.extractPattern(memory.input);
    if (inputPattern) {
      const existing = this.patterns.get(inputPattern);
      if (existing) {
        existing.frequency++;
        existing.lastSeen = new Date();
        existing.examples.push(memory.input);
        if (existing.examples.length > 5) {
          existing.examples = existing.examples.slice(-5);
        }
      } else {
        this.patterns.set(inputPattern, {
          pattern: inputPattern,
          frequency: 1,
          lastSeen: new Date(),
          examples: [memory.input],
          corrections: []
        });
      }
    }
  }

  private extractPattern(input: string): string | null {
    // Simple pattern extraction - look for common structures
    const patterns = [
      /^(help|how|what|why|when|where|which|can|could|would|should)\s+/i,
      /create|build|make|generate|write/i,
      /explain|describe|tell me about/i,
      /fix|debug|solve|troubleshoot/i,
      /analyze|review|check|evaluate/i
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return match[0].toLowerCase().trim();
      }
    }
    
    return null;
  }

  private async getRelevantPatterns(query: string): Promise<MemoryPattern[]> {
    const queryTerms = this.extractKeyTerms(query.toLowerCase());
    const relevantPatterns: MemoryPattern[] = [];
    
    for (const pattern of Array.from(this.patterns.values())) {
      const patternTerms = this.extractKeyTerms(pattern.pattern);
      const matchCount = queryTerms.filter(term => patternTerms.includes(term)).length;
      
      if (matchCount > 0 || pattern.frequency > 3) {
        relevantPatterns.push(pattern);
      }
    }
    
    return relevantPatterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3);
  }

  private async updatePatternFromCorrection(input: string, _output: string, correction: string): Promise<void> {
    const pattern = this.extractPattern(input);
    if (pattern) {
      const existing = this.patterns.get(pattern);
      if (existing) {
        if (!existing.corrections) {
          existing.corrections = [];
        }
        existing.corrections.push(correction);
        if (existing.corrections.length > 3) {
          existing.corrections = existing.corrections.slice(-3);
        }
      }
    }
  }

  private async storeMemoryEntry(entry: MemoryEntry): Promise<void> {
    try {
      const insertData = {
        id: entry.id,
        agent_id: entry.agentId,
        user_id: entry.userId,
        type: entry.type,
        input: entry.input,
        summary: entry.summary,
        context: entry.context,
        relevance_score: entry.relevanceScore,
        frequency: entry.frequency,
        last_accessed: entry.lastAccessed.toISOString(),
        created_at: entry.createdAt.toISOString(),
        tags: entry.tags,
        metadata: entry.metadata,
        // Include goal-specific fields if present
        ...(entry.goalId && { goal_id: entry.goalId }),
        ...(entry.goalSummary && { goal_summary: entry.goalSummary }),
        ...(entry.goalStatus && { goal_status: entry.goalStatus })
      };

      const { error } = await supabase
        .from('memory')
        .insert(insertData);

      if (error) {
        console.error('Failed to store memory entry:', error);
        await this.storeMemoryToFile(entry);
      }
    } catch (error) {
      console.error('Error storing memory entry:', error);
      await this.storeMemoryToFile(entry);
    }
  }

  private async updateLastAccessed(memoryIds: string[]): Promise<void> {
    try {
      const now = new Date().toISOString();
      await supabase
        .from('memory')
        .update({ last_accessed: now })
        .in('id', memoryIds);
    } catch (error) {
      console.error('Error updating last accessed:', error);
    }
  }

  private async loadPatterns(): Promise<void> {
    try {
      const patternFile = path.join(this.memoryDir, 'patterns.json');
      const content = await fs.readFile(patternFile, 'utf-8');
      const patterns = JSON.parse(content);
      
      for (const [key, pattern] of Object.entries(patterns)) {
        this.patterns.set(key, {
          ...pattern as MemoryPattern,
          lastSeen: new Date((pattern as any).lastSeen)
        });
      }
    } catch (error) {
      // Patterns file doesn't exist yet, start with empty patterns
      console.log('No existing patterns file found, starting fresh');
    }
  }


  private async getMemoryStatsFromFile(agentId: string, userId?: string): Promise<{
    totalEntries: number;
    byType: Record<string, number>;
    averageRelevance: number;
    topPatterns: MemoryPattern[];
    recentActivity: MemoryEntry[];
  }> {
    try {
      const filename = `${agentId}_memories.json`;
      const filepath = path.join(this.memoryDir, 'entries', filename);
      
      const content = await fs.readFile(filepath, 'utf-8');
      const memories: MemoryEntry[] = JSON.parse(content);
      
      // Filter by userId if specified
      const filteredMemories = userId 
        ? memories.filter(m => m.userId === userId)
        : memories;

      // Convert timestamps
      const normalizedMemories = filteredMemories.map(memory => ({
        ...memory,
        lastAccessed: new Date(memory.lastAccessed),
        createdAt: new Date(memory.createdAt)
      }));

      const byType = normalizedMemories.reduce((acc, memory) => {
        acc[memory.type] = (acc[memory.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const averageRelevance = normalizedMemories.length > 0
        ? normalizedMemories.reduce((sum, m) => sum + (m.relevanceScore ?? 0), 0) / normalizedMemories.length
        : 0;

      const recentActivity = normalizedMemories
        .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
        .slice(0, 5);

      const topPatterns = Array.from(this.patterns.values())
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5);

      return {
        totalEntries: normalizedMemories.length,
        byType,
        averageRelevance,
        topPatterns,
        recentActivity
      };

    } catch (error) {
      console.error('Error getting memory stats from file:', error);
      return {
        totalEntries: 0,
        byType: {},
        averageRelevance: 0,
        topPatterns: [],
        recentActivity: []
      };
    }
  }

  private async deleteMemoryFromFile(agentId: string, memoryId: string): Promise<boolean> {
    try {
      const filename = `${agentId}_memories.json`;
      const filepath = path.join(this.memoryDir, 'entries', filename);
      
      const content = await fs.readFile(filepath, 'utf-8');
      const memories: MemoryEntry[] = JSON.parse(content);
      
      const initialLength = memories.length;
      const filteredMemories = memories.filter(memory => memory.id !== memoryId);
      
      if (filteredMemories.length === initialLength) {
        // Memory not found
        return false;
      }
      
      await fs.writeFile(filepath, JSON.stringify(filteredMemories, null, 2));
      return true;
      
    } catch (error) {
      console.error('Error deleting memory from file:', error);
      return false;
    }
  }

  // File-based fallback methods
  private async storeMemoryToFile(entry: MemoryEntry): Promise<void> {
    try {
      await fs.mkdir(path.join(this.memoryDir, 'entries'), { recursive: true });
      const filename = `${entry.agentId}_memories.json`;
      const filepath = path.join(this.memoryDir, 'entries', filename);
      
      let memories: MemoryEntry[] = [];
      try {
        const content = await fs.readFile(filepath, 'utf-8');
        memories = JSON.parse(content);
      } catch {
        // File doesn't exist, start with empty array
      }
      
      memories.push(entry);
      
      // Keep only last 100 entries per agent
      if (memories.length > 100) {
        memories = memories.slice(-100);
      }
      
      await fs.writeFile(filepath, JSON.stringify(memories, null, 2));
    } catch (error) {
      console.error('Failed to store memory to file:', error);
    }
  }

  private async recallMemoryFromFile(
    agentId: string,
    query: string,
    options: MemorySearchOptions
  ): Promise<MemoryContext> {
    try {
      const filename = `${agentId}_memories.json`;
      const filepath = path.join(this.memoryDir, 'entries', filename);
      
      const content = await fs.readFile(filepath, 'utf-8');
      const memories: MemoryEntry[] = JSON.parse(content);
      
      const scoredMemories = memories.map(memory => {
        const normalizedMemory = {
          ...memory,
          lastAccessed: new Date(memory.lastAccessed),
          createdAt: new Date(memory.createdAt)
        };
        return {
          ...normalizedMemory,
          relevanceScore: this.calculateRelevanceScore(query, normalizedMemory)
        };
      });

      const relevantMemories = scoredMemories
        .filter(memory => memory.relevanceScore >= (options.minRelevance || 0.3))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, options.limit || 10);

      const averageRelevance = relevantMemories.length > 0
        ? relevantMemories.reduce((sum, m) => sum + m.relevanceScore, 0) / relevantMemories.length
        : 0;

      return {
        entries: relevantMemories,
        totalMatches: memories.length,
        averageRelevance,
        patterns: []
      };
    } catch (error) {
      console.error('Failed to recall memory from file:', error);
      return {
        entries: [],
        totalMatches: 0,
        averageRelevance: 0,
        patterns: []
      };
    }
  }
}

// Singleton instance
export const memoryEngine = MemoryEngine.getInstance();