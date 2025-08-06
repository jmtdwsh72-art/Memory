import { memoryReader } from './memory-reader';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Legacy function for backward compatibility
 * Now uses the new MemoryReader utility internally
 */
export async function fetchMemoryContext(userId: string, topic: string): Promise<string> {
  try {
    const result = await memoryReader.readMemoryContext({
      userId,
      topic: topic?.trim() || undefined,
      maxEntries: 5,
      matchingMode: 'fuzzy',
      minConfidence: 0.5,
      timeWindow: 24 * 7 // Last 7 days
    });

    return result.contextBlock;

  } catch (error) {
    console.error('Unexpected error in fetchMemoryContext:', error);
    return '';
  }
}

/**
 * Enhanced memory context fetcher with full options
 * Use this for new implementations
 */
export async function fetchEnhancedMemoryContext({
  userId,
  topic,
  agentType,
  sessionId,
  options = {}
}: {
  userId: string;
  topic?: string;
  agentType?: string;
  sessionId?: string;
  options?: {
    maxEntries?: number;
    matchingMode?: 'strict' | 'fuzzy';
    minConfidence?: number;
    tagFilter?: string[];
    timeWindow?: number;
    includeDevInfo?: boolean;
  };
}) {
  return await memoryReader.readMemoryContext({
    userId,
    topic,
    agentType,
    sessionId,
    maxEntries: options.maxEntries || 10,
    matchingMode: options.matchingMode || 'fuzzy',
    minConfidence: options.minConfidence || 0.6,
    tagFilter: options.tagFilter,
    timeWindow: options.timeWindow || 24 * 14, // 14 days default
    includeDevInfo: options.includeDevInfo
  });
}