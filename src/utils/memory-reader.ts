import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MemoryEntry {
  id: string;
  agent_id: string;
  user_id: string;
  type: 'goal' | 'summary' | 'log';
  input: string;
  output: string;
  summary: string;
  relevance: number;
  tags: string[];
  created_at: string;
  metadata?: {
    originatingAssistant?: string;
    sessionId?: string;
    threadId?: string;
    sourceConfidence?: number;
    extractionPattern?: string;
    timestamp?: string;
    [key: string]: any;
  };
}

interface MemoryReaderOptions {
  topic?: string;
  userId: string;
  agentType?: string;
  sessionId?: string;
  maxEntries?: number;
  matchingMode?: 'strict' | 'fuzzy';
  minConfidence?: number;
  tagFilter?: string[];
  timeWindow?: number; // hours
  includeDevInfo?: boolean;
}

interface MemoryContext {
  contextBlock: string;
  entriesFound: number;
  cacheHit: boolean;
  processingTime: number;
  metadata?: {
    topics: string[];
    agents: string[];
    timeRange: { oldest: string; newest: string };
    confidenceRange: { min: number; max: number };
    tags: string[];
  };
}

interface CachedResult {
  context: MemoryContext;
  timestamp: Date;
  key: string;
}

export class MemoryReader {
  private cache = new Map<string, CachedResult>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Read and format memory context for system messages
   */
  async readMemoryContext(options: MemoryReaderOptions): Promise<MemoryContext> {
    const startTime = Date.now();
    const isDev = process.env.NODE_ENV === 'development' || options.includeDevInfo;
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(options);
    
    // Check cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      if (isDev) {
        console.log(`🧠 Memory Reader: Cache HIT for key "${cacheKey}"`);
      }
      return {
        ...cached.context,
        cacheHit: true,
        processingTime: Date.now() - startTime
      };
    }

    if (isDev) {
      console.log(`🧠 Memory Reader: Processing new query`);
      console.log(`   User: ${options.userId}`);
      console.log(`   Topic: ${options.topic || 'any'}`);
      console.log(`   Agent: ${options.agentType || 'any'}`);
      console.log(`   Session: ${options.sessionId || 'none'}`);
      console.log(`   Matching: ${options.matchingMode || 'fuzzy'}`);
      console.log(`   Min Confidence: ${options.minConfidence || 0}`);
    }

    try {
      // Query Supabase for relevant memories
      const memories = await this.queryMemories(options);
      
      if (isDev) {
        console.log(`🧠 Memory Reader: Found ${memories.length} raw entries`);
      }

      // Process and rank memories
      const rankedMemories = this.rankMemoriesByRelevance(memories, options);
      
      // Limit results
      const maxEntries = options.maxEntries || 10;
      const selectedMemories = rankedMemories.slice(0, maxEntries);

      if (isDev) {
        console.log(`🧠 Memory Reader: Selected ${selectedMemories.length}/${rankedMemories.length} entries after ranking`);
      }

      // Format context block
      const contextBlock = this.formatContextBlock(selectedMemories, options);
      
      // Generate metadata
      const metadata = this.generateMetadata(selectedMemories);

      const result: MemoryContext = {
        contextBlock,
        entriesFound: selectedMemories.length,
        cacheHit: false,
        processingTime: Date.now() - startTime,
        metadata
      };

      // Cache the result
      this.setCachedResult(cacheKey, result);

      if (isDev) {
        console.log(`🧠 Memory Reader: Context generated (${result.processingTime}ms)`);
        console.log(`   Entries: ${result.entriesFound}`);
        console.log(`   Context Length: ${contextBlock.length} chars`);
        console.log(`   Topics: ${metadata?.topics.join(', ')}`);
        console.log(`   Agents: ${metadata?.agents.join(', ')}`);
      }

      return result;

    } catch (error) {
      console.error('Memory Reader error:', error);
      return {
        contextBlock: '',
        entriesFound: 0,
        cacheHit: false,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Query Supabase for memories based on options
   */
  private async queryMemories(options: MemoryReaderOptions): Promise<MemoryEntry[]> {
    let query = supabase
      .from('memory')
      .select('*')
      .eq('user_id', options.userId)
      .in('type', ['goal', 'summary']); // Only get goals and summaries, not logs

    // Filter by agent type if specified
    if (options.agentType) {
      query = query.eq('agent_id', options.agentType);
    }

    // Filter by time window if specified
    if (options.timeWindow) {
      const cutoffTime = new Date(Date.now() - (options.timeWindow * 60 * 60 * 1000));
      query = query.gte('created_at', cutoffTime.toISOString());
    }

    // Order by relevance and creation time
    query = query.order('relevance', { ascending: false })
                 .order('created_at', { ascending: false })
                 .limit(50); // Initial limit before processing

    const { data, error } = await query;

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Rank memories by relevance to the query
   */
  private rankMemoriesByRelevance(memories: MemoryEntry[], options: MemoryReaderOptions): MemoryEntry[] {
    const { topic, matchingMode = 'fuzzy', minConfidence = 0, tagFilter } = options;

    return memories
      .map(memory => {
        let score = memory.relevance || 0;

        // Apply confidence filter
        const confidence = memory.metadata?.sourceConfidence || 1;
        if (confidence < minConfidence) {
          return { ...memory, calculatedScore: 0 };
        }

        // Topic matching
        if (topic) {
          const topicScore = this.calculateTopicRelevance(memory, topic, matchingMode);
          score = (score + topicScore) / 2;
        }

        // Tag filtering
        if (tagFilter && tagFilter.length > 0) {
          const hasMatchingTag = memory.tags?.some(tag => 
            tagFilter.some(filterTag => tag.includes(filterTag))
          );
          if (!hasMatchingTag) {
            return { ...memory, calculatedScore: 0 };
          }
        }

        // Boost recent entries slightly
        const daysSinceCreation = (Date.now() - new Date(memory.created_at).getTime()) / (1000 * 60 * 60 * 24);
        const recencyBoost = Math.max(0, 1 - (daysSinceCreation / 30)); // Boost for entries less than 30 days old
        score += recencyBoost * 0.1;

        // Boost based on memory type (goals are more important)
        if (memory.type === 'goal') {
          score += 0.2;
        }

        return { ...memory, calculatedScore: Math.min(score, 1) };
      })
      .filter(memory => memory.calculatedScore > 0)
      .sort((a, b) => (b.calculatedScore || 0) - (a.calculatedScore || 0));
  }

  /**
   * Calculate topic relevance score
   */
  private calculateTopicRelevance(memory: MemoryEntry, topic: string, mode: 'strict' | 'fuzzy'): number {
    const searchText = `${memory.summary} ${memory.input} ${memory.output} ${memory.tags?.join(' ') || ''}`.toLowerCase();
    const topicWords = topic.toLowerCase().split(/\s+/).filter(word => word.length > 2);

    if (mode === 'strict') {
      // Strict matching: topic must appear as-is
      return searchText.includes(topic.toLowerCase()) ? 1 : 0;
    }

    // Fuzzy matching: score based on word overlap
    const matchedWords = topicWords.filter(word => searchText.includes(word));
    return matchedWords.length / Math.max(topicWords.length, 1);
  }

  /**
   * Format memory entries into a context block
   */
  private formatContextBlock(memories: MemoryEntry[], options: MemoryReaderOptions): string {
    if (memories.length === 0) {
      return '';
    }

    const isDev = process.env.NODE_ENV === 'development' || options.includeDevInfo;
    const blocks: string[] = [];

    // Group memories by type
    const goals = memories.filter(m => m.type === 'goal');
    const summaries = memories.filter(m => m.type === 'summary');

    // Add goals section
    if (goals.length > 0) {
      blocks.push('### 🎯 User Goals & Objectives');
      goals.forEach((goal, index) => {
        let block = `${index + 1}. ${goal.summary}`;
        
        if (isDev && goal.metadata) {
          const confidence = goal.metadata.sourceConfidence ? 
            ` (${Math.round(goal.metadata.sourceConfidence * 100)}% confidence)` : '';
          const date = new Date(goal.created_at).toLocaleDateString();
          const pattern = goal.metadata.extractionPattern || 'unknown';
          block += `${confidence} [${date}, via ${pattern}]`;
        }
        
        blocks.push(block);
      });
    }

    // Add summaries section
    if (summaries.length > 0) {
      blocks.push('\n### 📝 Context & Preferences');
      summaries.forEach((summary, index) => {
        let block = `${index + 1}. ${summary.summary}`;
        
        if (isDev && summary.metadata) {
          const confidence = summary.metadata.sourceConfidence ? 
            ` (${Math.round(summary.metadata.sourceConfidence * 100)}% confidence)` : '';
          const date = new Date(summary.created_at).toLocaleDateString();
          const agent = summary.metadata.originatingAssistant || summary.agent_id;
          block += `${confidence} [${date}, from ${agent}]`;
        }
        
        blocks.push(block);
      });
    }

    if (blocks.length === 0) {
      return '';
    }

    const header = `## 🧠 Relevant Memory Context\n`;
    const footer = isDev ? 
      `\n*Memory retrieved: ${memories.length} entries, processed in ${Date.now()}ms*` :
      '';

    return header + blocks.join('\n') + footer;
  }

  /**
   * Generate metadata about the retrieved memories
   */
  private generateMetadata(memories: MemoryEntry[]) {
    if (memories.length === 0) {
      return undefined;
    }

    const topics = [...new Set(memories.flatMap(m => m.tags || []).filter(tag => !tag.includes(':')))];
    const agents = [...new Set(memories.map(m => m.agent_id))];
    const dates = memories.map(m => new Date(m.created_at));
    const confidences = memories
      .map(m => m.metadata?.sourceConfidence || 1)
      .filter(c => c > 0);

    return {
      topics: topics.slice(0, 5),
      agents,
      timeRange: {
        oldest: Math.min(...dates.map(d => d.getTime())).toString(),
        newest: Math.max(...dates.map(d => d.getTime())).toString()
      },
      confidenceRange: {
        min: Math.min(...confidences),
        max: Math.max(...confidences)
      },
      tags: [...new Set(memories.flatMap(m => m.tags || []))].slice(0, 10)
    };
  }

  /**
   * Generate cache key from options
   */
  private generateCacheKey(options: MemoryReaderOptions): string {
    const parts = [
      options.userId,
      options.topic || '',
      options.agentType || '',
      options.sessionId || '',
      options.matchingMode || 'fuzzy',
      options.minConfidence || 0,
      options.maxEntries || 10,
      options.timeWindow || 0,
      (options.tagFilter || []).sort().join(',')
    ];
    return parts.join('|');
  }

  /**
   * Get cached result if valid
   */
  private getCachedResult(key: string): CachedResult | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp.getTime() > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * Set cached result
   */
  private setCachedResult(key: string, context: MemoryContext): void {
    this.cache.set(key, {
      context,
      timestamp: new Date(),
      key
    });

    // Clean up old cache entries (keep last 20)
    if (this.cache.size > 20) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => b[1].timestamp.getTime() - a[1].timestamp.getTime());
      
      // Remove oldest entries
      entries.slice(20).forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        timestamp: value.timestamp,
        entriesFound: value.context.entriesFound
      }))
    };
  }
}

// Export singleton instance
export const memoryReader = new MemoryReader();