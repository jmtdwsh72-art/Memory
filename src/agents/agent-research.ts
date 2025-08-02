import { AgentConfig, AgentMessage, AgentResponse } from '../utils/types';
import { MemoryManager } from '../utils/memory-manager';
import { getAgentConfig } from '../utils/config-utils';
import { useAgentMemoryWithPreset } from '../utils/memory-hooks';

export class ResearchAgent {
  private config: AgentConfig;
  private memoryManager: MemoryManager;

  constructor() {
    // Load validated configuration using centralized utility
    this.config = getAgentConfig('research');
    this.memoryManager = new MemoryManager();
  }

  async processInput(input: string, userId?: string): Promise<AgentResponse> {
    try {
      // Use centralized memory utilities with research preset
      const memory = useAgentMemoryWithPreset(this.config.id, 'research', userId);
      
      // Recall relevant memories using preset configuration
      const memoryContext = await memory.recallWithPreset(input);
      const contextString = memory.buildContext(memoryContext);
      
      const response = await this.generateResponse(input, contextString);
      
      // Store interaction using centralized utility
      await memory.saveMemory(input, response, 'Research analysis');

      await this.logInteraction({
        id: this.generateId(),
        timestamp: new Date(),
        agentName: this.config.id,
        input,
        output: response,
        memoryUsed: memoryContext.entries.map(m => m.id)
      });

      return {
        success: true,
        message: response,
        memoryUpdated: true
      };
    } catch (error) {
      return {
        success: false,
        message: `Research agent error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }


  private async generateResponse(input: string, memoryContext: string): Promise<string> {
    let response = `Research Analysis for: "${input}"

I'm analyzing your research request with my analytical and thorough approach. Here's what I found:

${this.simulateResearch(input)}`;

    // Add memory context if available
    if (memoryContext && memoryContext.trim()) {
      response += `\n\n${memoryContext}`;
    }

    response += '\n\nThis analysis has been stored in my persistent memory for future reference.';
    
    return response;
  }

  private simulateResearch(query: string): string {
    const topics = this.extractTopics(query);
    return `Key research areas identified: ${topics.join(', ')}

Preliminary findings:
- Topic complexity: Medium to High
- Research depth required: Comprehensive analysis
- Recommended approach: Multi-source investigation
- Timeline: Detailed research cycle recommended

Note: This is a foundational research framework. For actual implementation, integrate with real research tools and data sources.`;
  }

  private extractTopics(input: string): string[] {
    const words = input.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    return words.filter(word => word.length > 3 && !stopWords.includes(word)).slice(0, 5);
  }


  private async logInteraction(message: AgentMessage): Promise<void> {
    await this.memoryManager.logMessage(message);
  }

  private generateId(): string {
    return `research_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }
}