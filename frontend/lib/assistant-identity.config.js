"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATUS_MESSAGES = exports.ASSISTANT_CONFIG = void 0;
exports.getAssistantIdentity = getAssistantIdentity;
exports.getEnhancedAgentIdentity = getEnhancedAgentIdentity;
exports.getPersonalityTraits = getPersonalityTraits;
exports.getToneDescription = getToneDescription;
exports.getVoiceConfig = getVoiceConfig;
exports.getDisplayName = getDisplayName;
exports.getAgentIcon = getAgentIcon;
exports.getColorScheme = getColorScheme;
exports.getStatusMessage = getStatusMessage;
const lucide_react_1 = require("lucide-react");
const agent_identity_1 = require("../../src/utils/agent-identity");
exports.ASSISTANT_CONFIG = {
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
            id: "rachel",
            name: "Rachel"
        },
        icon: lucide_react_1.Brain,
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
            icon: lucide_react_1.Bot
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
            icon: lucide_react_1.Search
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
                id: "domi",
                name: "Domi"
            },
            icon: lucide_react_1.Wand2
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
            icon: lucide_react_1.Cog
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
            icon: lucide_react_1.Brain
        }
    }
};
function getAssistantIdentity(agentId) {
    const defaultIdentity = exports.ASSISTANT_CONFIG.default;
    const agentOverrides = exports.ASSISTANT_CONFIG.agents[agentId] || {};
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
function getEnhancedAgentIdentity(agentId) {
    try {
        const backendIdentity = (0, agent_identity_1.getAgentIdentity)(agentId);
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
    }
    catch (error) {
        console.warn('Backend agent config not available, using frontend fallback for', agentId);
        return getAssistantIdentity(agentId);
    }
}
function getPersonalityTraits(agentId) {
    const identity = getAssistantIdentity(agentId);
    return identity.personality;
}
function getToneDescription(agentId) {
    const identity = getAssistantIdentity(agentId);
    return identity.tone;
}
function getVoiceConfig(agentId) {
    const identity = getAssistantIdentity(agentId);
    return identity.voice;
}
function getDisplayName(agentId) {
    const identity = getAssistantIdentity(agentId);
    return identity.name;
}
function getAgentIcon(agentId) {
    const identity = getAssistantIdentity(agentId);
    return identity.icon;
}
function getColorScheme(agentId) {
    const identity = getAssistantIdentity(agentId);
    return identity.color;
}
exports.STATUS_MESSAGES = {
    thinking: "Processing your request...",
    responding: "Crafting a thoughtful response...",
    listening: "Ready to help you...",
    routing: "Finding the best agent for you...",
    connecting: "Establishing connection...",
    idle: "Standing by..."
};
function getStatusMessage(status) {
    return exports.STATUS_MESSAGES[status] || exports.STATUS_MESSAGES.idle;
}
//# sourceMappingURL=assistant-identity.config.js.map