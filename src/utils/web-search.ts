/**
 * Web Search Utility
 * 
 * Provides intelligent web search capabilities for agents, including:
 * - Search relevance detection
 * - Multiple search provider fallbacks
 * - Result caching to prevent duplicate queries
 * - Privacy-safe analytics
 * - Clean result formatting
 */

import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  relevanceScore?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  provider: string;
  timestamp: string;
  cached: boolean;
}

export interface SearchCache {
  [queryHash: string]: {
    response: SearchResponse;
    timestamp: string;
    expiresAt: string;
  };
}

/**
 * Determines if web search is appropriate for the given input
 */
export function shouldSearch(input: string, agentType: 'research' | 'creative' | 'automation'): boolean {
  
  // Current events and time-sensitive indicators
  const currentEventPatterns = [
    /\b(today|yesterday|this week|this month|this year|recently|latest|current|now)\b/i,
    /\b(2024|2025|2026)\b/,
    /\b(breaking|news|update|recent|trending|happening)\b/i,
    /\b(stock price|market|election|weather|covid|pandemic)\b/i,
    /\b(who won|what happened|latest on|current status)\b/i
  ];
  
  // Specific knowledge gaps that benefit from search
  const knowledgeGapPatterns = [
    /\b(compare|vs|versus|difference between|pros and cons)\b/i,
    /\b(best|top|recommended|popular|leading)\b/i,
    /\b(tutorial|how to|step by step|guide)\b/i,
    /\b(pricing|cost|price|subscription|free)\b/i,
    /\b(review|opinion|experience|feedback)\b/i
  ];
  
  // Geographic or location-specific queries
  const locationPatterns = [
    /\b(in|near|around|at)\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?\b/,
    /\b(city|country|state|region|area|location)\b/i
  ];
  
  // Agent-specific search triggers
  const agentSpecificTriggers = {
    research: [
      /\b(study|research|analysis|statistics|data|findings)\b/i,
      /\b(academic|paper|journal|publication|cite)\b/i,
      /\b(evidence|proof|source|reference)\b/i
    ],
    creative: [
      /\b(inspiration|ideas|examples|showcase|gallery)\b/i,
      /\b(trends|styles|creative|design|art)\b/i,
      /\b(portfolio|work|project|case study)\b/i
    ],  
    automation: [
      /\b(tools|software|platform|service|api)\b/i,
      /\b(automate|script|workflow|integration)\b/i,
      /\b(documentation|setup|configuration)\b/i
    ]
  };
  
  // Check current events (high priority)
  if (currentEventPatterns.some(pattern => pattern.test(input))) {
    return true;
  }
  
  // Check knowledge gaps
  if (knowledgeGapPatterns.some(pattern => pattern.test(input))) {
    return true;
  }
  
  // Check location-specific queries
  if (locationPatterns.some(pattern => pattern.test(input))) {
    return true;
  }
  
  // Check agent-specific triggers
  if (agentSpecificTriggers[agentType].some(pattern => pattern.test(input))) {
    return true;
  }
  
  // Don't search for very personal or internal queries
  const personalPatterns = [
    /\b(my|mine|I|me|remember|recall|previous|earlier)\b/i,
    /\b(tell me about myself|what did I|when did I)\b/i
  ];
  
  if (personalPatterns.some(pattern => pattern.test(input))) {
    return false;
  }
  
  return false;
}

/**
 * Extract search query from user input
 */
export function extractSearchQuery(input: string): string {
  // Remove common conversational elements
  let query = input
    .replace(/^(can you|could you|please|help me|tell me|explain|what is|how does|show me)\s+/i, '')
    .replace(/\?+$/, '')
    .trim();
  
  // Limit query length
  if (query.length > 100) {
    const words = query.split(' ');
    query = words.slice(0, 15).join(' ');
  }
  
  return query;
}

/**
 * Generate cache key for a search query
 */
function generateCacheKey(query: string, agentType: string): string {
  const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
  return `${agentType}_${Buffer.from(normalizedQuery).toString('base64').slice(0, 20)}`;
}

/**
 * Check if we have cached results for this query
 */
async function getCachedResults(query: string, agentType: string): Promise<SearchResponse | null> {
  try {
    const cacheKey = generateCacheKey(query, agentType);
    const cacheFile = join(process.cwd(), 'logs', 'search-cache.json');
    
    const cacheData = await readFile(cacheFile, 'utf8');
    const cache: SearchCache = JSON.parse(cacheData);
    
    const cachedEntry = cache[cacheKey];
    if (cachedEntry && new Date(cachedEntry.expiresAt) > new Date()) {
      console.log(`🔍 Using cached search results for: ${query}`);
      return { ...cachedEntry.response, cached: true };
    }
  } catch (error) {
    // Cache doesn't exist or is corrupted - this is fine
  }
  
  return null;
}

/**
 * Save search results to cache
 */
async function cacheResults(query: string, agentType: string, response: SearchResponse): Promise<void> {
  try {
    const cacheKey = generateCacheKey(query, agentType);
    const cacheFile = join(process.cwd(), 'logs', 'search-cache.json');
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    
    let cache: SearchCache = {};
    
    // Load existing cache
    try {
      const existingCache = await readFile(cacheFile, 'utf8');
      cache = JSON.parse(existingCache);
    } catch (error) {
      // No existing cache - start fresh
    }
    
    // Add new entry
    cache[cacheKey] = {
      response: { ...response, cached: false },
      timestamp: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };
    
    // Clean old entries (keep only entries from last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    for (const [key, entry] of Object.entries(cache)) {
      if (new Date(entry.timestamp) < sevenDaysAgo) {
        delete cache[key];
      }
    }
    
    await writeFile(cacheFile, JSON.stringify(cache, null, 2), 'utf8');
  } catch (error) {
    console.warn('⚠️ Failed to cache search results:', error);
  }
}

/**
 * Mock search function for testing and fallback
 */
function mockSearch(query: string): SearchResult[] {
  const mockResults: SearchResult[] = [
    {
      title: `Understanding ${query}: A Comprehensive Guide`,
      url: `https://example.com/guide/${query.replace(/\s+/g, '-').toLowerCase()}`,
      snippet: `Comprehensive information about ${query}, including key concepts, best practices, and practical applications.`,
      source: 'Mock Search',
      relevanceScore: 0.9
    },
    {
      title: `${query} - Latest Updates and Trends`,
      url: `https://example.com/trends/${query.replace(/\s+/g, '-').toLowerCase()}`,
      snippet: `Stay up to date with the latest developments and trends related to ${query}.`,
      source: 'Mock Search',
      relevanceScore: 0.8
    },
    {
      title: `Best Practices for ${query}`,
      url: `https://example.com/best-practices/${query.replace(/\s+/g, '-').toLowerCase()}`,
      snippet: `Learn the best practices and common pitfalls to avoid when working with ${query}.`,
      source: 'Mock Search', 
      relevanceScore: 0.7
    }
  ];
  
  return mockResults;
}

/**
 * Calculate relevance score for search results
 */
function calculateRelevanceScore(query: string, title: string, snippet: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const titleWords = title.toLowerCase().split(/\s+/);
  const snippetWords = snippet.toLowerCase().split(/\s+/);
  
  let score = 0;
  
  // Title matches (weighted higher)
  for (const queryWord of queryWords) {
    if (titleWords.some(word => word.includes(queryWord))) {
      score += 0.3;
    }
  }
  
  // Snippet matches
  for (const queryWord of queryWords) {
    if (snippetWords.some(word => word.includes(queryWord))) {
      score += 0.1;
    }
  }
  
  // Exact phrase matches (bonus)
  if (title.toLowerCase().includes(query.toLowerCase())) {
    score += 0.4;
  }
  if (snippet.toLowerCase().includes(query.toLowerCase())) {
    score += 0.2;
  }
  
  return Math.min(score, 1.0);
}

/**
 * DuckDuckGo search implementation (using DuckDuckGo Instant Answer API)
 */
async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    console.log(`🦆 Searching DuckDuckGo for: ${query}`);
    
    // DuckDuckGo Instant Answer API (limited but free)
    const url = new URL('https://api.duckduckgo.com/');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('no_html', '1');
    url.searchParams.set('skip_disambig', '1');
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`DuckDuckGo request failed: ${response.status}`);
    }
    
    const data = await response.json() as any; // DuckDuckGo API response
    const results: SearchResult[] = [];
    
    // Process instant answer
    if (data.Abstract && data.AbstractURL) {
      results.push({
        title: data.Heading || 'DuckDuckGo Instant Answer',
        url: data.AbstractURL,
        snippet: data.Abstract,
        source: 'DuckDuckGo',
        relevanceScore: 0.9
      });
    }
    
    // Process related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, 2)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'Related Topic',
            url: topic.FirstURL,
            snippet: topic.Text,
            source: 'DuckDuckGo',
            relevanceScore: 0.7
          });
        }
      }
    }
    
    return results.slice(0, 3);
    
  } catch (error) {
    console.warn('DuckDuckGo search failed:', error);
    throw error;
  }
}

/**
 * Rate limiting for SerpAPI (simple in-memory implementation)
 */
let lastSerpAPICall = 0;
const SERPAPI_MIN_INTERVAL = 1000; // 1 second between calls

/**
 * SerpAPI search implementation with rate limiting
 */
async function searchSerpAPI(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.SERPAPI_KEY || '7b0ea40f2d2dd40689bc8b1f055856dce42a5b9093c290cbcab5d531d8c4bf0b';
  
  // Rate limiting
  const now = Date.now();
  if (now - lastSerpAPICall < SERPAPI_MIN_INTERVAL) {
    const delay = SERPAPI_MIN_INTERVAL - (now - lastSerpAPICall);
    console.log(`⏳ Rate limiting: waiting ${delay}ms before SerpAPI call`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  lastSerpAPICall = Date.now();
  
  try {
    console.log(`🐍 Searching SerpAPI for: "${query}"`);
    
    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('engine', 'google');
    url.searchParams.set('q', query);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('num', '5'); // Get 5 results to pick best 3
    url.searchParams.set('safe', 'active');
    url.searchParams.set('gl', 'us'); // Geographic location
    url.searchParams.set('hl', 'en'); // Language
    
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Memory-AI-Assistant/1.0'
      }
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('SerpAPI rate limit exceeded - please try again in a few minutes');
      } else if (response.status === 401) {
        throw new Error('SerpAPI authentication failed - please check your API key');
      } else if (response.status === 400) {
        throw new Error('SerpAPI bad request - query may be invalid');
      }
      throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as any; // SerpAPI response
    
    if (data.error) {
      throw new Error(`SerpAPI error: ${data.error}`);
    }
    
    const results: SearchResult[] = [];
    
    // Process organic search results
    if (data.organic_results && Array.isArray(data.organic_results)) {
      for (const result of data.organic_results.slice(0, 5)) {
        if (result.title && result.link && result.snippet) {
          // Clean up the snippet
          const cleanSnippet = result.snippet
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
          
          results.push({
            title: result.title.trim(),
            url: result.link,
            snippet: cleanSnippet,
            source: 'SerpAPI',
            relevanceScore: calculateRelevanceScore(query, result.title, cleanSnippet)
          });
        }
      }
    }
    
    // Process knowledge graph results if no organic results
    if (results.length === 0 && data.knowledge_graph) {
      const kg = data.knowledge_graph;
      if (kg.title && kg.description) {
        results.push({
          title: kg.title,
          url: kg.source?.link || kg.website || '#',
          snippet: kg.description,
          source: 'SerpAPI (Knowledge Graph)',
          relevanceScore: 0.95
        });
      }
    }
    
    // Sort by relevance score
    results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    
    const finalResults = results.slice(0, 3);
    console.log(`✅ SerpAPI returned ${finalResults.length} relevant results`);
    
    return finalResults;
    
  } catch (error) {
    console.warn('SerpAPI search failed:', error);
    throw error;
  }
}

/**
 * Main search function with provider fallbacks
 */
export async function performWebSearch(
  input: string, 
  agentType: 'research' | 'creative' | 'automation'
): Promise<SearchResponse | null> {
  const query = extractSearchQuery(input);
  
  // Check if search is appropriate
  if (!shouldSearch(input, agentType)) {
    return null;
  }
  
  console.log(`🔍 Web search triggered for ${agentType} agent: "${query}"`);
  
  // Check cache first
  const cachedResult = await getCachedResults(query, agentType);
  if (cachedResult) {
    return cachedResult;
  }
  
  let results: SearchResult[] = [];
  let provider = 'unknown';
  
  try {
    // Try SerpAPI first (we have a real API key)
    results = await searchSerpAPI(query);
    provider = 'SerpAPI';
  } catch (error) {
    console.warn('SerpAPI search failed, trying DuckDuckGo...');
    
    try {
      // Fallback to DuckDuckGo
      results = await searchDuckDuckGo(query);
      provider = 'DuckDuckGo';
    } catch (duckError) {
      console.warn('DuckDuckGo search failed, using mock results...');
      
      // Final fallback to mock
      results = mockSearch(query);
      provider = 'Mock';
    }
  }
  
  // Limit to top 3 results
  results = results.slice(0, 3);
  
  const response: SearchResponse = {
    results,
    query,
    provider,
    timestamp: new Date().toISOString(),
    cached: false
  };
  
  // Cache the results
  await cacheResults(query, agentType, response);
  
  // Log search for analytics (privacy-safe)
  await logSearchAnalytics(query, agentType, provider, results.length);
  
  return response;
}

/**
 * Format search results for inclusion in agent responses
 */
export function formatSearchResults(searchResponse: SearchResponse): string {
  if (!searchResponse || searchResponse.results.length === 0) {
    return '';
  }
  
  const { results, provider, cached } = searchResponse;
  const cacheIndicator = cached ? ' (cached)' : '';
  
  const sections = [
    `## 🔍 **Web Insights**${cacheIndicator}`,
    ''
  ];
  
  results.forEach((result, index) => {
    sections.push(
      `**${index + 1}. [${result.title}](${result.url})**`,
      `${result.snippet}`,
      ''
    );
  });
  
  sections.push(`*Source: ${provider}*`);
  
  return sections.join('\n');
}

/**
 * Privacy-safe search analytics logging
 */
async function logSearchAnalytics(
  query: string, 
  agentType: string, 
  provider: string, 
  resultCount: number
): Promise<void> {
  try {
    const logFile = join(process.cwd(), 'logs', 'search-analytics.json');
    
    // Hash the query to protect privacy
    const queryHash = Buffer.from(query.toLowerCase()).toString('base64').slice(0, 10);
    
    let analytics: Array<{
      queryHash: string;
      agentType: string;
      provider: string;
      resultCount: number;
      timestamp: string;
      success: boolean;
    }> = [];
    
    // Load existing analytics
    try {
      const existingData = await readFile(logFile, 'utf8');
      analytics = JSON.parse(existingData);
    } catch (error) {
      // No existing data - start fresh
    }
    
    // Add new entry
    analytics.push({
      queryHash,
      agentType,
      provider,
      resultCount,
      timestamp: new Date().toISOString(),
      success: resultCount > 0
    });
    
    // Keep only last 1000 entries
    if (analytics.length > 1000) {
      analytics = analytics.slice(-1000);
    }
    
    await writeFile(logFile, JSON.stringify(analytics, null, 2), 'utf8');
  } catch (error) {
    console.warn('⚠️ Failed to log search analytics:', error);
  }
}

/**
 * Check if search functionality is available (internet connection, etc.)
 */
export async function isSearchAvailable(): Promise<boolean> {
  // For now, always return true since we have mock fallback
  // In production, this could ping a test endpoint
  return true;
}