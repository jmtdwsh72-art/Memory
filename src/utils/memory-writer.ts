import { memoryEngine } from './memory-engine';

interface ExtractedFact {
  content: string;
  type: 'goal' | 'summary';
  confidence: number;
  sourcePattern: string;
}

interface MemoryWriterMetadata {
  originatingAssistant: string;
  sessionId: string;
  sourceConfidence: number;
  extractionPattern: string;
  originalResponse: string;
  timestamp: string;
}

export class MemoryWriter {
  private readonly patterns = {
    // Goal detection patterns
    goals: [
      {
        pattern: /you (?:said you |mentioned you |told me you )?want(?:ed)? to (.{10,100})/gi,
        confidence: 0.9,
        name: 'explicit_want'
      },
      {
        pattern: /your goal (?:is|was) to (.{10,100})/gi,
        confidence: 0.95,
        name: 'explicit_goal'
      },
      {
        pattern: /you(?:'re| are) (?:trying to|working on|planning to|hoping to) (.{10,100})/gi,
        confidence: 0.8,
        name: 'action_intent'
      },
      {
        pattern: /you (?:need to|have to|should) (.{10,100})/gi,
        confidence: 0.7,
        name: 'requirement'
      },
      {
        pattern: /(?:your|the) (?:objective|purpose|aim) (?:is|was) (?:to )?(.{10,100})/gi,
        confidence: 0.85,
        name: 'objective_statement'
      }
    ],

    // Summary and context patterns
    summaries: [
      {
        pattern: /you (?:mentioned|said|told me) (?:that )?(.{15,150})/gi,
        confidence: 0.6,
        name: 'user_statement'
      },
      {
        pattern: /(?:from what I understand|based on what you(?:'ve| have) told me|as I recall), (.{15,150})/gi,
        confidence: 0.8,
        name: 'understanding_recap'
      },
      {
        pattern: /you(?:'re| are) working (?:with|on|in) (.{10,100})/gi,
        confidence: 0.7,
        name: 'context_work'
      },
      {
        pattern: /your (?:project|business|company|work) (?:involves|is about|focuses on) (.{10,150})/gi,
        confidence: 0.75,
        name: 'project_context'
      }
    ],

    // Preference patterns
    preferences: [
      {
        pattern: /you (?:prefer|like|enjoy|love) (?:to )?(.{10,100})/gi,
        confidence: 0.7,
        name: 'preference'
      },
      {
        pattern: /you(?:'re| are) (?:not interested in|don't like|dislike) (.{10,100})/gi,
        confidence: 0.75,
        name: 'negative_preference'
      },
      {
        pattern: /your (?:style|approach|method) (?:is|involves) (.{10,100})/gi,
        confidence: 0.6,
        name: 'approach_preference'
      }
    ]
  };

  /**
   * Analyze GPT response and extract key facts with verbose logging
   */
  async analyzeAndStore(
    gptResponse: string,
    userInput: string,
    assistantType: string,
    userId: string,
    sessionId?: string,
    threadId?: string,
    assistantId?: string
  ): Promise<{ stored: number; facts: ExtractedFact[]; error?: string }> {
    const isDev = process.env.NODE_ENV === 'development';
    
    try {
      if (isDev) {
        console.log(`\n🧠 MEMORY WRITER DEBUG START`);
        console.log(`================================`);
        console.log(`Assistant Type: ${assistantType}`);
        console.log(`Assistant ID: ${assistantId || 'Not provided'}`);
        console.log(`Thread ID: ${threadId || 'Not provided'}`);
        console.log(`Session ID: ${sessionId || 'Using userId as fallback'}`);
        console.log(`User ID: ${userId}`);
        console.log(`User Input: "${userInput.substring(0, 100)}${userInput.length > 100 ? '...' : ''}"`);
        console.log(`GPT Response Length: ${gptResponse.length} characters`);
        console.log(`GPT Response Preview: "${this.sanitizeForLogging(gptResponse.substring(0, 200))}${gptResponse.length > 200 ? '...' : ''}"`);
        console.log(`================================\n`);
      }

      // Check if response has extractable patterns before processing
      const hasExtractableInfo = this.hasExtractableInfo(gptResponse);
      if (!hasExtractableInfo) {
        if (isDev) {
          console.log('📝 Memory Writer: No extractable patterns detected, skipping analysis');
        }
        return { stored: 0, facts: [] };
      }

      // Extract facts from the response
      const extractedFacts = this.extractFacts(gptResponse);

      if (extractedFacts.length === 0) {
        if (isDev) {
          console.log('📝 Memory Writer: Pattern detected but no valid facts extracted after filtering');
        }
        return { stored: 0, facts: [] };
      }

      if (isDev) {
        console.log(`📋 Memory Writer: Extracted ${extractedFacts.length} potential facts:`);
        extractedFacts.forEach((fact, index) => {
          console.log(`  ${index + 1}. [${fact.type.toUpperCase()}] "${fact.content.substring(0, 60)}..."`);
          console.log(`     Confidence: ${(fact.confidence * 100).toFixed(1)}% | Pattern: ${fact.sourcePattern}`);
        });
      }

      let storedCount = 0;
      const errors: string[] = [];

      // Store each fact with individual error handling
      for (const fact of extractedFacts) {
        try {
          const metadata: MemoryWriterMetadata = {
            originatingAssistant: assistantType,
            sessionId: sessionId || threadId || userId,
            sourceConfidence: fact.confidence,
            extractionPattern: fact.sourcePattern,
            originalResponse: this.sanitizeForLogging(gptResponse.substring(0, 500)),
            timestamp: new Date().toISOString()
          };

          // Add additional context if available
          if (assistantId) metadata.assistantId = assistantId;
          if (threadId) metadata.threadId = threadId;

          await memoryEngine.storeMemory(
            assistantType,
            userInput,
            fact.content,
            userId,
            `Extracted from ${assistantType} response: ${fact.content.substring(0, 100)}`,
            fact.type,
            this.generateTags(fact, assistantType),
            metadata
          );

          storedCount++;
          if (isDev) {
            console.log(`✅ Stored ${fact.type}: "${fact.content.substring(0, 50)}..."`);
          }

        } catch (factError) {
          const errorMsg = `Failed to store ${fact.type}: ${factError instanceof Error ? factError.message : 'Unknown error'}`;
          errors.push(errorMsg);
          if (isDev) {
            console.error(`❌ ${errorMsg}`);
            console.error('   Fact content:', fact.content.substring(0, 100));
            console.error('   Error details:', factError);
          }
        }
      }

      if (isDev) {
        console.log(`\n📊 Memory Writer Summary:`);
        console.log(`  • Successfully stored: ${storedCount}/${extractedFacts.length} facts`);
        if (errors.length > 0) {
          console.log(`  • Errors encountered: ${errors.length}`);
          errors.forEach(error => console.log(`    - ${error}`));
        }
        console.log(`================================\n`);
      }

      return { 
        stored: storedCount, 
        facts: extractedFacts, 
        error: errors.length > 0 ? errors.join('; ') : undefined 
      };

    } catch (error) {
      const errorMsg = `Memory Writer pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      if (isDev) {
        console.error(`\n❌ MEMORY WRITER CRITICAL ERROR:`);
        console.error(`================================`);
        console.error(`Error: ${errorMsg}`);
        console.error(`Assistant Type: ${assistantType}`);
        console.error(`Response Length: ${gptResponse?.length || 0}`);
        console.error(`Stack:`, error);
        console.error(`================================\n`);
      }
      return { stored: 0, facts: [], error: errorMsg };
    }
  }

  /**
   * Sanitize text for safe logging (remove sensitive content, fix formatting)
   */
  private sanitizeForLogging(text: string): string {
    return text
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
      .trim();
  }

  /**
   * Extract facts from GPT response text
   */
  private extractFacts(response: string): ExtractedFact[] {
    const facts: ExtractedFact[] = [];

    // Process goals
    for (const goalPattern of this.patterns.goals) {
      const matches = [...response.matchAll(goalPattern.pattern)];
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 5) {
          const content = this.cleanExtractedText(match[1]);
          if (this.isValidFact(content)) {
            facts.push({
              content,
              type: 'goal',
              confidence: goalPattern.confidence,
              sourcePattern: goalPattern.name
            });
          }
        }
      }
    }

    // Process summaries
    for (const summaryPattern of this.patterns.summaries) {
      const matches = [...response.matchAll(summaryPattern.pattern)];
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 10) {
          const content = this.cleanExtractedText(match[1]);
          if (this.isValidFact(content)) {
            facts.push({
              content,
              type: 'summary',
              confidence: summaryPattern.confidence,
              sourcePattern: summaryPattern.name
            });
          }
        }
      }
    }

    // Process preferences
    for (const prefPattern of this.patterns.preferences) {
      const matches = [...response.matchAll(prefPattern.pattern)];
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 5) {
          const content = this.cleanExtractedText(match[1]);
          if (this.isValidFact(content)) {
            facts.push({
              content,
              type: 'summary', // Map preferences to summary type
              confidence: prefPattern.confidence,
              sourcePattern: prefPattern.name
            });
          }
        }
      }
    }

    // Remove duplicates and sort by confidence
    const uniqueFacts = this.deduplicateFacts(facts);
    return uniqueFacts
      .filter(fact => fact.confidence >= 0.6)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Limit to top 5 facts
  }

  /**
   * Clean extracted text
   */
  private cleanExtractedText(text: string): string {
    return text
      .trim()
      .replace(/[.!?]+$/, '') // Remove trailing punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^(to |that |the )/i, '') // Remove common prefixes
      .substring(0, 200); // Limit length
  }

  /**
   * Validate if extracted text is a useful fact
   */
  private isValidFact(content: string): boolean {
    // Filter out very short or generic statements
    if (content.length < 8) return false;
    
    // Filter out common generic phrases
    const genericPhrases = [
      'help', 'assistance', 'more information', 'let me know', 'tell me',
      'understand', 'make sense', 'figure out', 'work together', 'move forward'
    ];
    
    const lowerContent = content.toLowerCase();
    if (genericPhrases.some(phrase => lowerContent === phrase || lowerContent.startsWith(phrase + ' '))) {
      return false;
    }

    // Must contain some meaningful words
    const meaningfulWords = content.split(' ').filter(word => word.length >= 4);
    return meaningfulWords.length >= 2;
  }

  /**
   * Remove duplicate facts based on content similarity
   */
  private deduplicateFacts(facts: ExtractedFact[]): ExtractedFact[] {
    const unique: ExtractedFact[] = [];
    
    for (const fact of facts) {
      const isDuplicate = unique.some(existingFact => {
        const similarity = this.calculateSimilarity(fact.content, existingFact.content);
        return similarity > 0.7; // 70% similarity threshold
      });
      
      if (!isDuplicate) {
        unique.push(fact);
      }
    }
    
    return unique;
  }

  /**
   * Calculate content similarity (simple word overlap)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Generate tags for the extracted fact
   */
  private generateTags(fact: ExtractedFact, assistantType: string): string[] {
    const tags = [
      `source:${assistantType}`,
      `type:${fact.type}`,
      `pattern:${fact.sourcePattern}`,
      `confidence:${Math.round(fact.confidence * 100)}`
    ];

    // Add content-based tags
    const contentWords = fact.content.toLowerCase().split(/\s+/);
    const meaningfulWords = contentWords
      .filter(word => word.length >= 4)
      .filter(word => !['that', 'this', 'with', 'have', 'will', 'want', 'need', 'like'].includes(word))
      .slice(0, 3);

    tags.push(...meaningfulWords);
    
    return tags;
  }

  /**
   * Check if response contains extractable information
   */
  hasExtractableInfo(response: string): boolean {
    // Quick check for memory-worthy patterns
    const quickPatterns = [
      /you (?:want|said|mentioned|told)/i,
      /your (?:goal|objective|project)/i,
      /you(?:'re| are) (?:working|trying|planning)/i,
      /from what I understand/i,
      /based on what you/i
    ];
    
    return quickPatterns.some(pattern => pattern.test(response));
  }
}

// Export singleton instance
export const memoryWriter = new MemoryWriter();