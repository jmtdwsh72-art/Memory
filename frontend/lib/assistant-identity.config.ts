import { User, Bot, Search, Wand2, Cog, Brain, Zap, Sparkles } from 'lucide-react';
import { getAgentConfig, getAgentIdentity } from '../../src/utils/agent-identity';

export interface AssistantIdentity {
  name: string;
  tone: string;
  personality: string[];
  color: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  voice?: {
    id: string;
    name: string;
  };
  icon: any;
  tagline?: string;
}

export interface AssistantConfig {
  default: AssistantIdentity;
  agents: Record<string, Partial<AssistantIdentity>>;
}

export const ASSISTANT_CONFIG: AssistantConfig = {
  default: {
    name: "Memory Agent",
    tone: "calm, thoughtful, observant",
    personality: [
      "thoughtful",
      "observant", 
      "helpful",
      "memory-focused",
      "not overly chatty"
    ],
    color: {
      primary: "bg-slate-700",
      secondary: "bg-slate-600", 
      background: "bg-slate-50",
      text: "text-slate-100"
    },
    voice: {
      id: "rachel", // ElevenLabs default
      name: "Rachel"
    },
    icon: Brain,
    tagline: "Your thoughtful AI companion with persistent memory"
  },
  agents: {
    router: {
      name: "General Assistant",
      tone: "welcoming, adaptive",
      personality: ["adaptable", "routing-focused", "helpful"],
      color: {
        primary: "bg-slate-700",
        secondary: "bg-slate-600",
        background: "bg-slate-50", 
        text: "text-slate-100"
      },
      icon: Bot
    },
    research: {
      name: "Research Agent",
      tone: "analytical, thorough, curious",
      personality: ["analytical", "thorough", "knowledge-seeking"],
      color: {
        primary: "bg-blue-700",
        secondary: "bg-blue-600",
        background: "bg-blue-50",
        text: "text-blue-100"
      },
      icon: Search
    },
    creative: {
      name: "Creative Agent", 
      tone: "imaginative, inspiring, playful",
      personality: ["creative", "inspiring", "imaginative"],
      color: {
        primary: "bg-purple-700",
        secondary: "bg-purple-600",
        background: "bg-purple-50",
        text: "text-purple-100"
      },
      voice: {
        id: "domi", // Creative voice
        name: "Domi"
      },
      icon: Wand2
    },
    automation: {
      name: "Automation Agent",
      tone: "efficient, systematic, practical",
      personality: ["efficient", "systematic", "solution-focused"],
      color: {
        primary: "bg-green-700",
        secondary: "bg-green-600", 
        background: "bg-green-50",
        text: "text-green-100"
      },
      icon: Cog
    },
    memory: {
      name: "Memory Agent",
      tone: "contextual, remembering, continuity-focused", 
      personality: ["contextual", "memory-focused", "continuous"],
      color: {
        primary: "bg-indigo-700",
        secondary: "bg-indigo-600",
        background: "bg-indigo-50", 
        text: "text-indigo-100"
      },
      icon: Brain
    }
  }
};

/**
 * Get the complete identity for an agent by merging default with agent-specific overrides
 */
export function getAssistantIdentity(agentId: string): AssistantIdentity {
  const defaultIdentity = ASSISTANT_CONFIG.default;
  const agentOverrides = ASSISTANT_CONFIG.agents[agentId] || {};
  
  return {
    ...defaultIdentity,
    ...agentOverrides,
    color: {
      ...defaultIdentity.color,
      ...(agentOverrides.color || {})
    },
    voice: agentOverrides.voice || defaultIdentity.voice
  };
}

/**
 * Get enhanced agent identity that integrates backend agent config with frontend config
 */
export function getEnhancedAgentIdentity(agentId: string) {
  try {
    // Try to get from backend agent config system
    const backendIdentity = getAgentIdentity(agentId);
    return {
      id: backendIdentity.id,
      name: backendIdentity.name,
      tone: backendIdentity.tone,
      tagline: backendIdentity.tagline,
      icon: backendIdentity.icon,
      color: backendIdentity.color,
      voiceId: backendIdentity.voiceId,
      voiceName: backendIdentity.voiceName,
      personality: backendIdentity.personality,
      description: backendIdentity.description,
      status: backendIdentity.status
    };
  } catch (error) {
    // Fallback to frontend config if backend is not available
    console.warn('Backend agent config not available, using frontend fallback for', agentId);
    return getAssistantIdentity(agentId);
  }
}

/**
 * Get personality traits for an agent 
 */
export function getPersonalityTraits(agentId: string): string[] {
  const identity = getAssistantIdentity(agentId);
  return identity.personality;
}

/**
 * Get tone description for an agent
 */
export function getToneDescription(agentId: string): string {
  const identity = getAssistantIdentity(agentId);
  return identity.tone;
}

/**
 * Get voice configuration for an agent
 */
export function getVoiceConfig(agentId: string): { id: string; name: string } | undefined {
  const identity = getAssistantIdentity(agentId);
  return identity.voice;
}

/**
 * Get display name for an agent
 */
export function getDisplayName(agentId: string): string {
  const identity = getAssistantIdentity(agentId);
  return identity.name;
}

/**
 * Get icon component for an agent
 */
export function getAgentIcon(agentId: string): any {
  const identity = getAssistantIdentity(agentId);
  return identity.icon;
}

/**
 * Get color scheme for an agent
 */
export function getColorScheme(agentId: string): AssistantIdentity['color'] {
  const identity = getAssistantIdentity(agentId);
  return identity.color;
}

/**
 * Status descriptions for different agent states
 */
export const STATUS_MESSAGES = {
  thinking: "Processing your request...",
  responding: "Crafting a thoughtful response...",
  listening: "Ready to help you...",
  routing: "Finding the best agent for you...",
  connecting: "Establishing connection...",
  idle: "Standing by..."
};

/**
 * Get appropriate status message
 */
export function getStatusMessage(status: keyof typeof STATUS_MESSAGES): string {
  return STATUS_MESSAGES[status] || STATUS_MESSAGES.idle;
}