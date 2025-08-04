import { AgentConfig } from './types';
import { ASSISTANT_CONFIG } from '../../frontend/lib/assistant-identity.config';

// Import all agent configs
import { researchAgentConfig } from '../agents/agent-research.config';
import { creativeAgentConfig } from '../agents/agent-creative.config';
import { automationAgentConfig } from '../agents/agent-automation.config';
import { routerAgentConfig } from '../agents/agent-router.config';

// Agent config registry
const AGENT_CONFIGS: Record<string, AgentConfig> = {
  research: researchAgentConfig,
  creative: creativeAgentConfig,
  automation: automationAgentConfig,
  router: routerAgentConfig,
  general: routerAgentConfig, // General is an alias for router
};

/**
 * Get complete agent configuration with fallback to Memory Agent defaults
 */
export function getAgentConfig(agentId: string): AgentConfig {
  const config = AGENT_CONFIGS[agentId];
  
  if (!config) {
    // Fallback to router/general config
    return AGENT_CONFIGS.router;
  }
  
  return config;
}

/**
 * Get agent identity combining backend config with frontend fallbacks
 */
export function getAgentIdentity(agentId: string) {
  const agentConfig = getAgentConfig(agentId);
  const frontendConfig = ASSISTANT_CONFIG.agents[agentId as keyof typeof ASSISTANT_CONFIG.agents] || ASSISTANT_CONFIG.default;
  
  return {
    // Core identity from backend config
    id: agentConfig.id,
    name: agentConfig.name,
    tone: agentConfig.tone,
    tagline: agentConfig.tagline || frontendConfig.tagline,
    
    // Visual identity
    icon: agentConfig.icon,
    color: agentConfig.color,
    
    // Voice and communication
    voiceId: agentConfig.voiceId || frontendConfig.voice?.id || ASSISTANT_CONFIG.default.voice?.id,
    voiceName: agentConfig.voiceId ? getVoiceName(agentConfig.voiceId) : (frontendConfig.voice?.name || ASSISTANT_CONFIG.default.voice?.name),
    
    // Personality and behavior
    personality: agentConfig.personality || frontendConfig.personality || ASSISTANT_CONFIG.default.personality,
    clarificationStyle: agentConfig.clarificationStyle || 'friendly',
    preferredCommunication: agentConfig.preferredCommunication || 'helpful conversation',
    
    // Additional fields
    description: agentConfig.description,
    goal: agentConfig.goal,
    status: agentConfig.status
  };
}

/**
 * Get voice name from voice ID mapping
 */
function getVoiceName(voiceId: string): string {
  const voiceMap: Record<string, string> = {
    'EXAVITQu4vr4xnSDxMaL': 'Rachel',
    'AZnzlk1XvdvUeBnXmlld': 'Domi', 
    'VR6AewLTigWG4xSOukaG': 'Arnold'
  };
  
  return voiceMap[voiceId] || 'Rachel';
}

/**
 * Get agent's voice ID with fallback
 */
export function getAgentVoiceId(agentId: string): string {
  const identity = getAgentIdentity(agentId);
  return identity.voiceId || 'EXAVITQu4vr4xnSDxMaL'; // Default to Rachel
}

/**
 * Get agent's color theme with fallback
 */
export function getAgentColor(agentId: string): string {
  const config = getAgentConfig(agentId);
  return config.color || 'slate';
}

/**
 * Get agent's icon with fallback
 */
export function getAgentIcon(agentId: string): string {
  const config = getAgentConfig(agentId);
  return config.icon || 'Bot';
}

/**
 * Get agent's display name with fallback
 */
export function getAgentDisplayName(agentId: string): string {
  const config = getAgentConfig(agentId);
  return config.name || 'Assistant';
}

/**
 * Check if agent has personalized voice
 */
export function hasCustomVoice(agentId: string): boolean {
  const config = getAgentConfig(agentId);
  return !!config.voiceId;
}

/**
 * Get all available agents
 */
export function getAllAgents(): AgentConfig[] {
  return Object.values(AGENT_CONFIGS);
}

/**
 * Get agents by status
 */
export function getAgentsByStatus(status: 'active' | 'inactive' | 'busy'): AgentConfig[] {
  return getAllAgents().filter(agent => agent.status === status);
}

/**
 * Format agent color for Tailwind classes
 */
export function getAgentColorClasses(agentId: string) {
  const color = getAgentColor(agentId);
  
  const colorMappings = {
    blue: {
      primary: 'blue-600',
      secondary: 'blue-500', 
      background: 'blue-50',
      text: 'blue-900',
      gradient: 'from-blue-600 to-blue-800'
    },
    purple: {
      primary: 'purple-600',
      secondary: 'purple-500',
      background: 'purple-50', 
      text: 'purple-900',
      gradient: 'from-purple-600 to-purple-800'
    },
    emerald: {
      primary: 'emerald-600',
      secondary: 'emerald-500',
      background: 'emerald-50',
      text: 'emerald-900', 
      gradient: 'from-emerald-600 to-emerald-800'
    },
    indigo: {
      primary: 'indigo-600',
      secondary: 'indigo-500',
      background: 'indigo-50',
      text: 'indigo-900',
      gradient: 'from-indigo-600 to-indigo-800'
    },
    slate: {
      primary: 'slate-600',
      secondary: 'slate-500',
      background: 'slate-50', 
      text: 'slate-900',
      gradient: 'from-slate-600 to-slate-800'
    }
  };
  
  return colorMappings[color as keyof typeof colorMappings] || colorMappings.slate;
}