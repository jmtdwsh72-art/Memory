/**
 * Domain Knowledge Loader
 * 
 * Provides intelligent matching and loading of domain-specific knowledge modules
 * to enhance agent responses with structured expertise.
 * 
 * Now supports automatic generation of knowledge modules for unknown domains.
 */

import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { deepKnowledgeBuilder, GeneratedKnowledgeModule } from './deep-knowledge-builder';
import { ReasoningLevel } from './reasoning-depth';

export interface KnowledgeModule {
  domain: string;
  summary: string;
  keyConcepts: string[];
  commonMistakes: string[];
  useCases: string[];
  recommendedResources: {
    name: string;
    url: string;
  }[];
  source?: 'curated' | 'generated';
}

interface DomainMapping {
  keywords: string[];
  patterns: RegExp[];
  module: () => Promise<KnowledgeModule>;
}

/**
 * Domain mapping registry - maps keywords and patterns to knowledge modules
 */
const domainMappings: Record<string, DomainMapping> = {
  python: {
    keywords: [
      'python', 'py', 'django', 'flask', 'pandas', 'numpy', 'scipy', 
      'matplotlib', 'jupyter', 'pip', 'conda', 'virtual environment',
      'python programming', 'python development', 'python code', 'python script',
      'pythonic', 'pep', 'python library', 'python framework'
    ],
    patterns: [
      /\bpython\b/i,
      /\.py\b/i,
      /\bdjango\b/i,
      /\bflask\b/i,
      /\bpandas\b/i,
      /\bnumpy\b/i,
      /\bjupyter\b/i
    ],
    module: () => import('../knowledge/python').then(m => m.pythonKnowledge)
  },
  
  'stock-trading': {
    keywords: [
      'stock', 'trading', 'stocks', 'stock market', 'investment', 'investing',
      'shares', 'equity', 'portfolio', 'dividend', 'bull market', 'bear market',
      'broker', 'brokerage', 'day trading', 'swing trading', 'options',
      'market analysis', 'technical analysis', 'fundamental analysis',
      'ticker', 'nasdaq', 'nyse', 's&p 500', 'dow jones'
    ],
    patterns: [
      /\bstock\s+(market|trading|investment)\b/i,
      /\b(buy|sell)\s+stocks?\b/i,
      /\bday\s+trading\b/i,
      /\bstock\s+portfolio\b/i,
      /\binvest(ing|ment)\s+in\s+stocks?\b/i,
      /\bequity\s+trading\b/i,
      /\bmarket\s+analysis\b/i
    ],
    module: () => import('../knowledge/stock-trading').then(m => m.stockTradingKnowledge)
  }
};

/**
 * Get knowledge module by domain name (exact match)
 * If no curated module exists, attempts to generate one automatically
 */
export async function getKnowledgeByDomain(domain: string, originalInput?: string): Promise<KnowledgeModule | null> {
  const normalizedDomain = domain.toLowerCase().trim();
  const mapping = domainMappings[normalizedDomain];
  
  // Try to load curated module first
  if (mapping) {
    try {
      return await mapping.module();
    } catch (error) {
      console.warn(`Failed to load knowledge module for domain: ${domain}`, error);
    }
  }
  
  // Check for existing generated module
  const generatedModule = await tryLoadGeneratedModule(normalizedDomain);
  if (generatedModule) {
    return generatedModule;
  }
  
  // Generate new module if none exists
  try {
    console.log(`🤖 Auto-generating knowledge module for: ${domain}`);
    const generatedModule = await deepKnowledgeBuilder.generateKnowledgeModule(domain, originalInput);
    await logUnknownDomain(domain, 'generated', generatedModule.confidence);
    return generatedModule;
  } catch (error) {
    console.error(`Failed to generate knowledge module for ${domain}:`, error);
    await logUnknownDomain(domain, 'failed', 'low');
    return null;
  }
}

/**
 * Analyze input text and detect relevant domains using fuzzy matching
 */
export function detectDomains(input: string): string[] {
  const lowerInput = input.toLowerCase();
  const detectedDomains: string[] = [];
  
  for (const [domainKey, mapping] of Object.entries(domainMappings)) {
    let score = 0;
    
    // Check keyword matches
    const keywordMatches = mapping.keywords.filter(keyword => 
      lowerInput.includes(keyword.toLowerCase())
    );
    score += keywordMatches.length * 0.5;
    
    // Check pattern matches
    const patternMatches = mapping.patterns.filter(pattern => 
      pattern.test(input)
    );
    score += patternMatches.length * 0.7;
    
    // Consider domain detected if we have significant matches
    if (score >= 0.5) {
      detectedDomains.push(domainKey);
    }
  }
  
  // Sort by relevance (could be enhanced with more sophisticated scoring)
  return detectedDomains.sort();
}

/**
 * Get knowledge modules for detected domains in input
 */
export async function getKnowledgeForInput(input: string): Promise<KnowledgeModule[]> {
  const detectedDomains = detectDomains(input);
  const knowledgeModules: KnowledgeModule[] = [];
  
  for (const domain of detectedDomains) {
    const module = await getKnowledgeByDomain(domain, input);
    if (module) {
      knowledgeModules.push(module);
    }
  }
  
  return knowledgeModules;
}

/**
 * Format knowledge modules for inclusion in agent responses
 * @param modules - Knowledge modules to format
 * @param reasoningLevel - The reasoning level to adapt formatting for
 */
export function formatKnowledgeSection(modules: KnowledgeModule[], reasoningLevel: ReasoningLevel = 'intermediate'): string {
  if (modules.length === 0) return '';
  
  const sections: string[] = [];
  
  for (const module of modules) {
    const isGenerated = module.source === 'generated';
    const icon = isGenerated ? '🤖' : '🧠';
    const title = isGenerated 
      ? `*Newly Generated Knowledge: ${module.domain}*`
      : `Domain Knowledge: ${module.domain}`;
    
    let section: string[] = [];
    
    if (reasoningLevel === 'basic') {
      // Simplified format for basic reasoning level
      section = [
        `## ${icon} ${title}`,
        '',
        `**What it is**: ${module.summary}`,
        '',
        `**Main ideas**:`,
        ...module.keyConcepts.slice(0, 3).map(concept => `• ${concept}`),
        '',
        `**Watch out for**:`,
        ...module.commonMistakes.slice(0, 2).map(mistake => `• ${mistake}`),
        '',
        `**Used for**:`,
        ...module.useCases.slice(0, 2).map(useCase => `• ${useCase}`),
        ''
      ];
    } else if (reasoningLevel === 'advanced') {
      // Enhanced format for advanced reasoning level
      section = [
        `## ${icon} ${title}`,
        '',
        `**Executive Summary**: ${module.summary}`,
        '',
        `**Core Conceptual Framework**:`,
        ...module.keyConcepts.map((concept, idx) => `${idx + 1}. **${concept}** - [Detailed analysis needed]`),
        '',
        `**Critical Failure Points & Mitigation Strategies**:`,
        ...module.commonMistakes.map(mistake => `• **Risk**: ${mistake}\n  **Mitigation**: [Systematic approach required]`),
        '',
        `**Advanced Applications & Edge Cases**:`,
        ...module.useCases.map(useCase => `• **Scenario**: ${useCase}\n  **Implementation**: [Technical deep-dive available]`),
        '',
        `**Research & Academic Resources**:`,
        ...module.recommendedResources.map(resource => `• [${resource.name}](${resource.url}) - [Peer-reviewed source]`),
        '',
        `**Theoretical Foundations**: [Available upon request]`,
        `**Mathematical Models**: [Can be provided for quantitative analysis]`,
        ''
      ];
    } else {
      // Standard format for intermediate reasoning level
      section = [
        `## ${icon} ${title}`,
        '',
        `**Summary**: ${module.summary}`,
        '',
        `**Key Concepts**: ${module.keyConcepts.join(', ')}`,
        '',
        `**Common Mistakes to Avoid**:`,
        ...module.commonMistakes.map(mistake => `• ${mistake}`),
        '',
        `**Typical Use Cases**:`,
        ...module.useCases.map(useCase => `• ${useCase}`),
        '',
        `**Recommended Resources**:`,
        ...module.recommendedResources.map(resource => `• [${resource.name}](${resource.url})`),
        ''
      ];
    }
    
    // Add metadata for generated modules
    if (isGenerated && 'confidence' in module) {
      const generatedModule = module as GeneratedKnowledgeModule;
      section.splice(-1, 0, `*Generated with ${generatedModule.confidence} confidence*`, '');
    }
    
    sections.push(section.join('\n'));
  }
  
  return sections.join('\n---\n\n');
}

/**
 * Check if domain knowledge is available for given input
 */
export function hasKnowledgeForInput(input: string): boolean {
  const detectedDomains = detectDomains(input);
  return detectedDomains.length > 0;
}

/**
 * Get available domains
 */
export function getAvailableDomains(): string[] {
  return Object.keys(domainMappings);
}

/**
 * Get domain statistics for analytics
 */
export function getDomainAnalytics(input: string): {
  detectedDomains: string[];
  totalKeywordMatches: number;
  totalPatternMatches: number;
  confidence: 'low' | 'medium' | 'high';
} {
  const lowerInput = input.toLowerCase();
  const detectedDomains = detectDomains(input);
  let totalKeywordMatches = 0;
  let totalPatternMatches = 0;
  
  for (const domain of detectedDomains) {
    const mapping = domainMappings[domain];
    if (mapping) {
      totalKeywordMatches += mapping.keywords.filter(keyword => 
        lowerInput.includes(keyword.toLowerCase())
      ).length;
      
      totalPatternMatches += mapping.patterns.filter(pattern => 
        pattern.test(input)
      ).length;
    }
  }
  
  const totalMatches = totalKeywordMatches + totalPatternMatches;
  const confidence = totalMatches >= 3 ? 'high' : totalMatches >= 1 ? 'medium' : 'low';
  
  return {
    detectedDomains,
    totalKeywordMatches,
    totalPatternMatches,
    confidence
  };
}

/**
 * Try to load a generated knowledge module from filesystem
 */
async function tryLoadGeneratedModule(domain: string): Promise<KnowledgeModule | null> {
  try {
    const kebabDomain = toKebabCase(domain);
    
    // Dynamically import the module - will throw if file doesn't exist
    const module = await import(`../knowledge/generated/${kebabDomain}`);
    const knowledgeKey = `${toCamelCase(domain)}Knowledge`;
    
    if (module[knowledgeKey]) {
      console.log(`📚 Loaded existing generated module: ${domain}`);
      return module[knowledgeKey];
    }
  } catch (error) {
    // File doesn't exist or couldn't be loaded - this is expected for new domains
    return null;
  }
  
  return null;
}

/**
 * Log unknown domains for analytics and future curation
 */
async function logUnknownDomain(domain: string, status: 'generated' | 'failed', confidence: 'high' | 'medium' | 'low'): Promise<void> {
  try {
    const logsDir = join(process.cwd(), 'logs');
    const logFile = join(logsDir, 'unknown-domains.json');
    
    let logs: Array<{
      domain: string;
      status: 'generated' | 'failed';
      confidence: 'high' | 'medium' | 'low';
      timestamp: string;
      count: number;
    }> = [];
    
    // Try to read existing logs
    try {
      const existingLogs = await readFile(logFile, 'utf8');
      logs = JSON.parse(existingLogs);
    } catch (error) {
      // File doesn't exist yet or is corrupted - start fresh
      logs = [];
    }
    
    // Find existing entry or create new one
    const existingEntry = logs.find(entry => entry.domain === domain);
    if (existingEntry) {
      existingEntry.count += 1;
      existingEntry.timestamp = new Date().toISOString();
      existingEntry.status = status; // Update status
      existingEntry.confidence = confidence; // Update confidence
    } else {
      logs.push({
        domain,
        status,
        confidence,
        timestamp: new Date().toISOString(),
        count: 1
      });
    }
    
    // Sort by count (most requested first) then by timestamp
    logs.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    
    // Ensure logs directory exists - this is handled at the file system level
    
    // Write updated logs
    await writeFile(logFile, JSON.stringify(logs, null, 2), 'utf8');
    
    console.log(`📊 Logged unknown domain: ${domain} (${status}, ${confidence})`);
  } catch (error) {
    console.warn(`⚠️ Failed to log unknown domain: ${error}`);
  }
}

/**
 * Convert domain to kebab-case filename
 */
function toKebabCase(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Convert domain to camelCase for variable names
 */
function toCamelCase(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^\w/, char => char.toLowerCase());
}