import { AgentConfig, AgentConfigExport } from '../utils/types';
import { routerAgentExport } from '../agents/agent-router.config';
import { researchAgentExport } from '../agents/agent-research.config';
import { automationAgentExport } from '../agents/agent-automation.config';

export class AgentConfigRegistry {
  private static instance: AgentConfigRegistry;
  private agentConfigs: Map<string, AgentConfigExport>;

  private constructor() {
    this.agentConfigs = new Map();
    this.loadAgentConfigs();
  }

  public static getInstance(): AgentConfigRegistry {
    if (!AgentConfigRegistry.instance) {
      AgentConfigRegistry.instance = new AgentConfigRegistry();
    }
    return AgentConfigRegistry.instance;
  }

  private loadAgentConfigs(): void {
    // Register all available agents
    this.agentConfigs.set('router', routerAgentExport);
    this.agentConfigs.set('research', researchAgentExport);
    this.agentConfigs.set('automation', automationAgentExport);
  }

  public getAllAgentConfigs(): AgentConfig[] {
    return Array.from(this.agentConfigs.values()).map(agentExport => agentExport.config);
  }

  public getAgentConfig(agentId: string): AgentConfig | undefined {
    return this.agentConfigs.get(agentId)?.config;
  }

  public getAgentPrompts(agentId: string): Record<string, any> | undefined {
    return this.agentConfigs.get(agentId)?.prompts;
  }

  public getAgentIds(): string[] {
    return Array.from(this.agentConfigs.keys());
  }

  public getActiveAgents(): AgentConfig[] {
    return this.getAllAgentConfigs().filter(config => config.status === 'active');
  }

  public getAgentsByKeyword(keyword: string): AgentConfig[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.getAllAgentConfigs().filter(config => 
      config.keywords.some(k => k.toLowerCase().includes(lowerKeyword))
    );
  }

  public determineAgentByInput(input: string): string {
    const lowerInput = input.toLowerCase();
    const words = lowerInput.split(/\s+/);
    
    // Score each agent based on keyword matches
    const agentScores: Record<string, number> = {};
    
    for (const config of this.getAllAgentConfigs()) {
      agentScores[config.id] = 0;
      
      for (const keyword of config.keywords) {
        const keywordLower = keyword.toLowerCase();
        
        // Exact word match gets higher score
        if (words.includes(keywordLower)) {
          agentScores[config.id] += 3;
        }
        // Partial match gets lower score
        else if (lowerInput.includes(keywordLower)) {
          agentScores[config.id] += 1;
        }
      }
    }
    
    // Find agent with highest score
    const bestAgent = Object.entries(agentScores)
      .filter(([id]) => id !== 'router') // Don't auto-route to router
      .sort(([,a], [,b]) => b - a)[0];
    
    // If best agent has score > 0, use it; otherwise use router
    return bestAgent && bestAgent[1] > 0 ? bestAgent[0] : 'router';
  }

  public validateAgentId(agentId: string): boolean {
    return this.agentConfigs.has(agentId);
  }

  public registerAgent(agentExport: AgentConfigExport): void {
    this.agentConfigs.set(agentExport.config.id, agentExport);
  }

  public unregisterAgent(agentId: string): boolean {
    return this.agentConfigs.delete(agentId);
  }
}

// Singleton instance
export const agentRegistry = AgentConfigRegistry.getInstance();

// Convenience functions
export const getAllAgents = (): AgentConfig[] => agentRegistry.getAllAgentConfigs();
export const getAgentConfig = (agentId: string): AgentConfig | undefined => agentRegistry.getAgentConfig(agentId);
export const getActiveAgents = (): AgentConfig[] => agentRegistry.getActiveAgents();
export const determineAgentByInput = (input: string): string => agentRegistry.determineAgentByInput(input);
export const validateAgentId = (agentId: string): boolean => agentRegistry.validateAgentId(agentId);