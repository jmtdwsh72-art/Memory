/**
 * Memory Formatter Utility
 * 
 * Safely cleans and formats memory context for user-facing output,
 * removing timestamps, debug annotations, and system artifacts.
 */

import { MemoryContext, MemoryEntry } from './types';

export interface MemoryFormatterOptions {
  stripTimestamps?: boolean;
  stripDebugInfo?: boolean;
  stripSystemTags?: boolean;
  maxEntries?: number;
  summarizeOnly?: boolean;
}

/**
 * Clean memory context for user-facing display
 */
export function formatMemoryContext(
  memoryContext: MemoryContext, 
  options: MemoryFormatterOptions = {}
): string {
  const {
    stripTimestamps = true,
    stripDebugInfo = true,
    stripSystemTags = true,
    maxEntries = 3,
    summarizeOnly = true
  } = options;

  if (!memoryContext.entries || memoryContext.entries.length === 0) {
    return '';
  }

  const cleanEntries = memoryContext.entries
    .slice(0, maxEntries)
    .map(entry => cleanMemoryEntry(entry, { stripTimestamps, stripDebugInfo, stripSystemTags }))
    .filter(entry => entry.summary && entry.summary.trim().length > 0);

  if (cleanEntries.length === 0) {
    return '';
  }

  if (summarizeOnly) {
    return cleanEntries
      .map(entry => `• ${entry.summary}`)
      .join('\n');
  }

  return cleanEntries
    .map(entry => {
      const relevanceIcon = (entry.relevanceScore ?? 0) > 0.8 ? '🎯' : 
                           (entry.relevanceScore ?? 0) > 0.6 ? '📍' : '💡';
      return `${relevanceIcon} ${entry.summary}`;
    })
    .join('\n');
}

/**
 * Clean individual memory entry
 */
export function cleanMemoryEntry(
  entry: MemoryEntry, 
  options: { stripTimestamps?: boolean; stripDebugInfo?: boolean; stripSystemTags?: boolean } = {}
): MemoryEntry {
  const { stripTimestamps = true, stripDebugInfo = true, stripSystemTags = true } = options;
  
  let cleanSummary = entry.summary;

  if (stripTimestamps) {
    // Remove timestamp patterns
    cleanSummary = cleanSummary.replace(/\[?\d{4}-\d{2}-\d{2}T[\d:.Z-]+\]?\s*/g, '');
    cleanSummary = cleanSummary.replace(/\[\d{2}:\d{2}:\d{2}\s*[AP]M\]\s*/g, '');
  }

  if (stripDebugInfo) {
    // Remove debug prefixes and system annotations
    cleanSummary = cleanSummary.replace(/^(research_goal:|ROUTING_HANDOFF:|Agent:|LOG:)\s*/i, '');
    cleanSummary = cleanSummary.replace(/\s*-\s*Agent:\s*\w+\s*$/i, '');
    cleanSummary = cleanSummary.replace(/Clarification requested:\s*\w+\s*/i, '');
    cleanSummary = cleanSummary.replace(/\*\*Primary Question\*\*:\s*/i, '');
  }

  if (stripSystemTags) {
    // Remove system-generated phrases
    cleanSummary = cleanSummary.replace(/Building on what we discussed about\s*/i, '');
    cleanSummary = cleanSummary.replace(/Continuing from your\s*/i, '');
    cleanSummary = cleanSummary.replace(/Since you're working on\s*/i, '');
  }

  // Final cleanup
  cleanSummary = cleanSummary.trim();
  cleanSummary = cleanSummary.replace(/^[:\-•]\s*/, ''); // Remove leading punctuation
  cleanSummary = cleanSummary.replace(/\s+/g, ' '); // Normalize whitespace

  return {
    ...entry,
    summary: cleanSummary
  };
}

/**
 * Clean input text from memory artifacts and system annotations
 */
export function cleanInputFromMemoryArtifacts(input: string): string {
  let cleaned = input;

  // Remove memory context blocks
  cleaned = cleaned.replace(/\n\nRelevant memory:\s*[\s\S]*$/i, '');
  cleaned = cleaned.replace(/Relevant memory:\s*[\s\S]*$/i, '');
  
  // Remove timestamp patterns from input
  cleaned = cleaned.replace(/\[?\d{4}-\d{2}-\d{2}T[\d:.Z-]+\]?\s*/g, '');
  
  // Remove system annotations
  cleaned = cleaned.replace(/Building on what we discussed about\s*/i, '');
  cleaned = cleaned.replace(/Continuing from your\s*\*\*primary question\*\*:\s*/i, '');
  cleaned = cleaned.replace(/Since you're working on\s*\*\*primary question\*\*:\s*/i, '');
  
  // Remove orphaned punctuation and normalize
  cleaned = cleaned.replace(/\*\*primary question\*\*:\s*/i, '');
  cleaned = cleaned.replace(/^\s*[:\-•]\s*/, '');
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Format memory insights for agent responses (clean, user-friendly)
 */
export function formatMemoryInsights(entries: MemoryEntry[]): string {
  if (!entries || entries.length === 0) return '';
  
  const cleanedEntries = entries
    .map(entry => cleanMemoryEntry(entry))
    .filter(entry => entry.summary && entry.summary.trim().length > 0);

  return cleanedEntries
    .map(entry => `• ${entry.summary}`)
    .join('\n');
}

/**
 * Check if input contains memory artifacts that need cleaning
 */
export function hasMemoryArtifacts(input: string): boolean {
  const artifacts = [
    /\[?\d{4}-\d{2}-\d{2}T[\d:.Z-]+\]?/,
    /Relevant memory:/i,
    /Building on what we discussed/i,
    /Continuing from your/i,
    /Since you're working on/i,
    /\*\*primary question\*\*:/i
  ];

  return artifacts.some(pattern => pattern.test(input));
}

/**
 * Safe memory context builder for agent responses
 */
export function buildSafeMemoryContext(memoryContext: MemoryContext): string {
  if (!memoryContext.entries || memoryContext.entries.length === 0) {
    return '';
  }

  // Only include high-relevance, cleaned entries
  const relevantEntries = memoryContext.entries
    .filter(entry => (entry.relevanceScore ?? 0) >= 0.5)
    .slice(0, 2)
    .map(entry => cleanMemoryEntry(entry))
    .filter(entry => entry.summary && entry.summary.trim().length > 10);

  if (relevantEntries.length === 0) {
    return '';
  }

  const formattedEntries = relevantEntries
    .map(entry => `• ${entry.summary}`)
    .join('\n');

  return `## 📚 Relevant Context\n\n${formattedEntries}`;
}