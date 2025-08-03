import { AgentConfig, AgentMessage, AgentResponse } from '../utils/types';
import { MemoryManager } from '../utils/memory-manager';
import { getAgentConfig } from '../utils/config-utils';
import { useAgentMemoryWithPreset } from '../utils/memory-hooks';

export class CreativeAgent {
  private config: AgentConfig;
  private memoryManager: MemoryManager;

  constructor() {
    // Load validated configuration using centralized utility
    this.config = getAgentConfig('creative');
    this.memoryManager = new MemoryManager();
  }

  async processInput(input: string, userId?: string): Promise<AgentResponse> {
    try {
      // Use centralized memory utilities with creative preset
      const memory = useAgentMemoryWithPreset(this.config.id, 'creative', userId);
      
      // Recall relevant memories using preset configuration
      const memoryContext = await memory.recallWithPreset(input);
      const contextString = memory.buildContext(memoryContext);
      
      const response = await this.generateResponse(input, contextString);
      
      // Store interaction using centralized utility
      await memory.saveMemory(input, response, 'Creative brainstorming');

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
        message: `Creative agent error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }


  private async generateResponse(input: string, memoryContext: string): Promise<string> {
    const taskType = this.identifyTaskType(input);
    let response = '';

    switch (taskType) {
      case 'naming':
        response = this.generateNamingResponse(input);
        break;
      case 'story':
        response = this.generateStoryResponse(input);
        break;
      case 'brainstorm':
      default:
        response = this.generateBrainstormResponse(input);
        break;
    }

    // Add memory context if available
    if (memoryContext && memoryContext.trim()) {
      response += `\n\n${memoryContext}`;
    }

    response += '\n\n✨ This creative session has been saved to my memory for future inspiration!';
    
    return response;
  }

  private identifyTaskType(input: string): 'brainstorm' | 'naming' | 'story' {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('name') || lowerInput.includes('call') || lowerInput.includes('title')) {
      return 'naming';
    }
    if (lowerInput.includes('story') || lowerInput.includes('write') || lowerInput.includes('character') || lowerInput.includes('plot')) {
      return 'story';
    }
    return 'brainstorm';
  }

  private generateBrainstormResponse(input: string): string {
    return `🌟 Creative Brainstorming Session: "${input}"

💡 **Initial Sparks:**
- Transform the conventional approach by inverting the problem
- Combine unexpected elements from different domains
- What if this had superpowers or magical properties?
- Consider the opposite of what's expected
- How would nature solve this challenge?

🎨 **Developed Concepts:**
1. **The Fusion Approach**: Merge traditional methods with cutting-edge innovation
2. **The Minimalist Solution**: Strip away everything unnecessary for elegant simplicity
3. **The Gamification Angle**: Turn the challenge into an engaging experience
4. **The Collaborative Model**: Leverage community and collective creativity

🚀 **Most Promising Direction:**
Based on the creative exploration, I recommend pursuing a hybrid approach that combines elements from multiple concepts above. This allows for both innovation and practicality.

✨ **Next Steps:**
- Pick your favorite concept and let's dive deeper
- We can explore specific implementation details
- Generate variations on the most promising ideas
- Create prototypes or mockups of the concepts`;
  }

  private generateNamingResponse(input: string): string {
    const subject = this.extractSubject(input);
    
    return `🎯 Creative Naming Session for: ${subject}

📝 **Name Suggestions:**
1. **Luminova** - Suggests innovation and brightness
2. **Nexus Point** - Implies connection and convergence
3. **Spark & Flow** - Combines energy with smooth operation
4. **Quantum Leap** - Suggests breakthrough advancement
5. **Prisma** - Reflects multiple perspectives and clarity

🔤 **Creative Variations:**
- Combining words: SparkNova, FlowPoint, LeapPrisma
- Playing with spelling: Neksus, Loomina, Kwantum
- Acronyms: SPARK (Smart Progressive Adaptive Resource Kit)
- Metaphorical: Phoenix, Catalyst, Compass

⭐ **Top Recommendation:**
**Luminova** - It's memorable, suggests innovation and light, and has a positive, forward-thinking sound. It's also versatile enough to work across different contexts.

💭 **Reasoning:**
The name combines "lumin" (light) with "nova" (new star), creating a powerful metaphor for breakthrough innovation. It's easy to pronounce, memorable, and has strong branding potential.`;
  }

  private generateStoryResponse(input: string): string {
    return `📖 Creative Writing Prompt Inspired by: "${input}"

**🌱 Story Seed:**
In a world where creativity itself has become a tangible resource, a young artist discovers they can literally paint doorways to other dimensions...

**🎭 Characters:**
- **The Protagonist**: An unconventional thinker who sees patterns others miss
- **The Mentor**: A retired dream architect with secrets about the creative realm
- **The Antagonist**: A corporate entity harvesting creativity for profit
- **The Wildcard**: A sentient AI learning to be creative

**🌍 Setting:**
A near-future city where art and technology have merged, creating augmented reality layers that respond to human imagination. Creative districts float above the mundane world.

**🔥 Conflict/Challenge:**
The protagonist must protect the last free source of pure creativity from being commercialized and controlled, while learning that their own creative powers come with unexpected consequences.

**✨ Unique Twist:**
Every creative act changes reality slightly, and the protagonist realizes they've been unconsciously reshaping the world with their art all along.`;
  }

  private extractSubject(input: string): string {
    // Simple extraction logic - can be enhanced
    const patterns = [
      /name\s+for\s+(?:a\s+|an\s+|the\s+)?(.+)/i,
      /call\s+(?:it\s+|the\s+|this\s+|my\s+)?(.+)/i,
      /title\s+for\s+(?:a\s+|an\s+|the\s+)?(.+)/i
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return 'your creative project';
  }

  private async logInteraction(message: AgentMessage): Promise<void> {
    await this.memoryManager.logMessage(message);
  }

  private generateId(): string {
    return `creative_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }
}