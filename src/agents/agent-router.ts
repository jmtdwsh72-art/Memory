import { AgentConfig, AgentMessage, AgentResponse } from '../utils/types';
import { MemoryManager } from '../utils/memory-manager';
import { ResearchAgent } from './agent-research';
import { AutomationAgent } from './agent-automation';
import { determineAgentByInput, getAllAgents } from '../config/agent-config';
import { getAgentConfig } from '../utils/config-utils';
import { useAgentMemoryWithPreset } from '../utils/memory-hooks';

export class RouterAgent {
  private config: AgentConfig;
  private memoryManager: MemoryManager;
  private subAgents: Map<string, any>;

  constructor() {
    // Load validated configuration using centralized utility
    this.config = getAgentConfig('router');
    this.memoryManager = new MemoryManager();
    this.subAgents = new Map();
    this.initializeSubAgents();
  }

  private initializeSubAgents(): void {
    // Dynamically initialize agents based on registry
    const activeAgents = getAllAgents().filter(agent => agent.status === 'active' && agent.id !== 'router');
    
    for (const agentConfig of activeAgents) {
      switch (agentConfig.id) {
        case 'research':
          this.subAgents.set('research', new ResearchAgent());
          break;
        case 'automation':
          this.subAgents.set('automation', new AutomationAgent());
          break;
        // Future agents can be added here
        default:
          console.warn(`Unknown agent type: ${agentConfig.id}`);
      }
    }
  }

  async processInput(input: string, userId?: string): Promise<AgentResponse> {
    try {
      // Use centralized memory utilities with router preset
      const memory = useAgentMemoryWithPreset(this.config.id, 'router', userId);
      
      // Recall relevant memories for enhanced routing
      const memoryContext = await memory.recallWithPreset(input);
      const contextString = memory.buildContext(memoryContext);
      
      const agentType = this.determineAgentType(input);
      const targetAgent = this.subAgents.get(agentType);

      let response: AgentResponse;
      if (!targetAgent) {
        response = await this.handleDirectResponse(input, contextString);
      } else {
        response = await targetAgent.processInput(input, userId);
      }
      
      // Store interaction using centralized utility
      await memory.saveMemory(input, response.message, `Routed to: ${agentType}`);

      await this.logInteraction({
        id: this.generateId(),
        timestamp: new Date(),
        agentName: this.config.name,
        input,
        output: `Routed to ${agentType}: ${response.message}`
      });

      return {
        ...response,
        memoryUpdated: true
      };
    } catch (error) {
      return {
        success: false,
        message: `Router error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private determineAgentType(input: string): string {
    // Use dynamic agent detection from registry
    return determineAgentByInput(input);
  }

  private async handleDirectResponse(input: string, memoryContext?: string): Promise<AgentResponse> {
    const activeAgents = getAllAgents().filter(agent => agent.status === 'active' && agent.id !== 'router');
    
    const agentDescriptions = activeAgents.map(agent => {
      const iconMap: Record<string, string> = {
        'Search': '🔬',
        'Zap': '🛠️',
        'BarChart3': '📊',
        'MessageCircle': '💬'
      };
      const icon = iconMap[agent.icon] || '🤖';
      return `${icon} **${agent.name}**: ${agent.description}`;
    }).join('\n');

    const agentIds = activeAgents.map(agent => agent.id).join(', ');

    let response = `Hey there! I'm your routing assistant. I can connect you to specialized agents for different tasks:

${agentDescriptions}

Available agents: ${agentIds}

Just tell me what you need help with, and I'll get you to the right specialist! Your request: "${input}"`;

    // Add memory context if available
    if (memoryContext && memoryContext.trim()) {
      response += `\n\n${memoryContext}`;
    }
    
    await this.logInteraction({
      id: this.generateId(),
      timestamp: new Date(),
      agentName: this.config.name,
      input,
      output: response
    });

    return {
      success: true,
      message: response
    };
  }

  private async logInteraction(message: AgentMessage): Promise<void> {
    await this.memoryManager.logMessage(message);
  }

  private generateId(): string {
    return `router_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }
}