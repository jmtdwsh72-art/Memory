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
export declare const ASSISTANT_CONFIG: AssistantConfig;
export declare function getAssistantIdentity(agentId: string): AssistantIdentity;
export declare function getEnhancedAgentIdentity(agentId: string): AssistantIdentity | {
    id: string;
    name: string;
    tone: string;
    tagline: string | undefined;
    icon: string;
    color: string;
    voiceId: string | undefined;
    voiceName: string | undefined;
    personality: string[];
    description: string;
    status: "active" | "inactive" | "busy";
};
export declare function getPersonalityTraits(agentId: string): string[];
export declare function getToneDescription(agentId: string): string;
export declare function getVoiceConfig(agentId: string): {
    id: string;
    name: string;
} | undefined;
export declare function getDisplayName(agentId: string): string;
export declare function getAgentIcon(agentId: string): any;
export declare function getColorScheme(agentId: string): AssistantIdentity['color'];
export declare const STATUS_MESSAGES: {
    thinking: string;
    responding: string;
    listening: string;
    routing: string;
    connecting: string;
    idle: string;
};
export declare function getStatusMessage(status: keyof typeof STATUS_MESSAGES): string;
//# sourceMappingURL=assistant-identity.config.d.ts.map