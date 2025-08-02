import { memoryEngine } from './memory-engine';
import { MemoryContext, MemorySearchOptions, MemoryEntry } from './types';

export interface AgentMemoryHookResult {
  /**
   * Recall relevant memories for the given query
   */
  recallMemory: (
    query: string, 
    options?: MemorySearchOptions
  ) => Promise<MemoryContext>;

  /**
   * Store a new memory entry
   */
  saveMemory: (
    input: string,
    output: string,
    context?: string
  ) => Promise<MemoryEntry>;

  /**
   * Build memory context string for agent input injection
   */
  buildContext: (memoryContext: MemoryContext) => string;

  /**
   * Learn from user corrections
   */
  learnFromCorrection: (
    originalInput: string,
    originalOutput: string,
    correction: string
  ) => Promise<void>;

  /**
   * Get memory statistics for the agent
   */
  getStats: () => Promise<{
    totalEntries: number;
    byType: Record<string, number>;
    averageRelevance: number;
    topPatterns: any[];
    recentActivity: MemoryEntry[];
  }>;

  /**
   * Delete a specific memory entry
   */
  deleteMemory: (memoryId: string) => Promise<boolean>;
}

/**
 * Custom hook for agent memory operations
 * Centralizes all memory access logic for consistency across agents
 */
export function useAgentMemory(
  agentId: string, 
  userId?: string
): AgentMemoryHookResult {
  // Validate agentId
  if (!agentId || typeof agentId !== 'string') {
    throw new Error('Invalid agentId provided to useAgentMemory');
  }

  const recallMemory = async (
    query: string, 
    options: MemorySearchOptions = {}
  ): Promise<MemoryContext> => {
    try {
      return await memoryEngine.recallMemory(agentId, query, userId, options);
    } catch (error) {
      console.error(`[useAgentMemory:${agentId}] Failed to recall memories:`, error);
      // Return empty context on error to prevent agent failures
      return {
        entries: [],
        totalMatches: 0,
        averageRelevance: 0,
        patterns: []
      };
    }
  };

  const saveMemory = async (
    input: string,
    output: string,
    context?: string
  ): Promise<MemoryEntry> => {
    try {
      return await memoryEngine.storeMemory(agentId, input, output, userId, context);
    } catch (error) {
      console.error(`[useAgentMemory:${agentId}] Failed to save memory:`, error);
      throw new Error(`Failed to save memory for agent ${agentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const buildContext = (memoryContext: MemoryContext): string => {
    try {
      return memoryEngine.buildMemoryContext(memoryContext);
    } catch (error) {
      console.error(`[useAgentMemory:${agentId}] Failed to build context:`, error);
      return ''; // Return empty string on error
    }
  };

  const learnFromCorrection = async (
    originalInput: string,
    originalOutput: string,
    correction: string
  ): Promise<void> => {
    try {
      await memoryEngine.learnFromCorrection(
        agentId, 
        originalInput, 
        originalOutput, 
        correction, 
        userId
      );
    } catch (error) {
      console.error(`[useAgentMemory:${agentId}] Failed to learn from correction:`, error);
      throw new Error(`Failed to learn from correction for agent ${agentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStats = async () => {
    try {
      return await memoryEngine.getMemoryStats(agentId, userId);
    } catch (error) {
      console.error(`[useAgentMemory:${agentId}] Failed to get memory stats:`, error);
      // Return default stats on error
      return {
        totalEntries: 0,
        byType: {},
        averageRelevance: 0,
        topPatterns: [],
        recentActivity: []
      };
    }
  };

  const deleteMemory = async (memoryId: string): Promise<boolean> => {
    try {
      return await memoryEngine.deleteMemory(agentId, memoryId);
    } catch (error) {
      console.error(`[useAgentMemory:${agentId}] Failed to delete memory:`, error);
      return false;
    }
  };

  return {
    recallMemory,
    saveMemory,
    buildContext,
    learnFromCorrection,
    getStats,
    deleteMemory
  };
}

/**
 * Preset memory configurations for different agent types
 */
export const MemoryPresets = {
  /**
   * Configuration for research agents - comprehensive memory with high relevance threshold
   */
  research: {
    limit: 8,
    minRelevance: 0.5,
    includePatterns: true,
    types: ['summary', 'pattern', 'correction']
  },

  /**
   * Configuration for automation agents - focus on patterns and corrections
   */
  automation: {
    limit: 6,
    minRelevance: 0.4,
    includePatterns: true,
    types: ['summary', 'pattern', 'correction']
  },

  /**
   * Configuration for router agents - lightweight memory for routing decisions
   */
  router: {
    limit: 5,
    minRelevance: 0.4,
    includePatterns: false,
    types: ['summary', 'correction']
  },

  /**
   * General purpose configuration
   */
  general: {
    limit: 10,
    minRelevance: 0.3,
    includePatterns: true,
    types: ['summary', 'pattern', 'correction']
  }
} as const;

/**
 * Utility function to get memory preset by agent type
 */
export function getMemoryPreset(agentType: string): MemorySearchOptions {
  const presetKey = agentType.toLowerCase() as keyof typeof MemoryPresets;
  const preset = MemoryPresets[presetKey] || MemoryPresets.general;
  
  // Create a proper MemorySearchOptions object with correct type
  return {
    limit: preset.limit,
    minRelevance: preset.minRelevance,
    includePatterns: preset.includePatterns,
    types: [...preset.types] as ('log' | 'summary' | 'pattern' | 'correction')[]
  };
}

/**
 * Enhanced memory hook with agent-specific presets
 */
export function useAgentMemoryWithPreset(
  agentId: string,
  agentType: string,
  userId?: string
): AgentMemoryHookResult & {
  recallWithPreset: (query: string) => Promise<MemoryContext>;
} {
  const memoryHook = useAgentMemory(agentId, userId);
  const preset = getMemoryPreset(agentType);

  const recallWithPreset = async (query: string): Promise<MemoryContext> => {
    return await memoryHook.recallMemory(query, preset);
  };

  return {
    ...memoryHook,
    recallWithPreset
  };
}