import { AgentConfig, AgentMessage, AgentResponse } from '../utils/types';
import { MemoryManager } from '../utils/memory-manager';
import { ResearchAgent } from './agent-research';
import { AutomationAgent } from './agent-automation';
import { CreativeAgent } from './agent-creative';
import { WelcomeAgent } from './agent-welcome';
import { determineAgentByInput, getAllAgents } from '../config/agent-config';
import { getAgentConfig } from '../utils/config-utils';
import { useAgentMemoryWithPreset } from '../utils/memory-hooks';
import { logAgentError, logSystemError } from '../utils/error-logger';

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
        case 'creative':
          this.subAgents.set('creative', new CreativeAgent());
          break;
        case 'welcome':
          this.subAgents.set('welcome', new WelcomeAgent());
          break;
        // Future agents can be added here
        default:
          console.warn(`Unknown agent type: ${agentConfig.id}`);
          logSystemError(new Error(`Unknown agent type: ${agentConfig.id}`), {
            agentId: 'router',
            context: 'agent_initialization'
          });
      }
    }
  }

  async processInput(input: string, userId?: string): Promise<AgentResponse> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
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
        try {
          response = await targetAgent.processInput(input, userId);
        } catch (agentError) {
          const errorObj = agentError instanceof Error ? agentError : new Error('Agent processing failed');
          
          // Log agent-specific error
          await logAgentError(agentType, errorObj, {
            input,
            userId,
            requestId,
            sessionId: userId
          });
          
          // Return fallback response
          response = {
            success: false,
            message: `${agentType} agent encountered an error. Please try again or rephrase your request.`
          };
        }
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
      const errorObj = error instanceof Error ? error : new Error('Unknown router error');
      
      // Log the error with context
      await logAgentError('router', errorObj, {
        input,
        userId,
        requestId,
        sessionId: userId
      });
      
      return {
        success: false,
        message: `Router error: ${errorObj.message}`
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
        'MessageCircle': '💬',
        'Sparkles': '✨'
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