import { AgentConfig } from './types';
import { getAgentConfig as getConfigFromRegistry, validateAgentId } from '../config/agent-config';

/**
 * Error thrown when agent configuration is invalid or missing
 */
export class AgentConfigError extends Error {
  constructor(
    message: string,
    public readonly agentId: string,
    public readonly validationErrors?: string[]
  ) {
    super(message);
    this.name = 'AgentConfigError';
  }
}

/**
 * Validation schema for agent configuration
 */
const REQUIRED_CONFIG_FIELDS = [
  'id',
  'name',
  'tone',
  'goal',
  'description',
  'memoryScope',
  'tools',
  'keywords',
  'icon',
  'color',
  'status'
] as const;

const VALID_MEMORY_SCOPES = ['session', 'persistent', 'temporary'] as const;
const VALID_STATUSES = ['active', 'inactive', 'maintenance'] as const;

/**
 * Validates agent configuration structure and values
 */
function validateAgentConfig(config: any, agentId: string): string[] {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    errors.push('Configuration object is missing or invalid');
    return errors;
  }

  // Check required fields
  for (const field of REQUIRED_CONFIG_FIELDS) {
    if (!(field in config)) {
      errors.push(`Missing required field: ${field}`);
    } else if (config[field] === null || config[field] === undefined) {
      errors.push(`Field '${field}' cannot be null or undefined`);
    }
  }

  // Validate specific field types and values
  if (config.id && typeof config.id !== 'string') {
    errors.push('Field "id" must be a string');
  } else if (config.id && config.id !== agentId) {
    errors.push(`Config ID "${config.id}" does not match requested agent ID "${agentId}"`);
  }

  if (config.name && typeof config.name !== 'string') {
    errors.push('Field "name" must be a string');
  }

  if (config.tone && typeof config.tone !== 'string') {
    errors.push('Field "tone" must be a string');
  }

  if (config.goal && typeof config.goal !== 'string') {
    errors.push('Field "goal" must be a string');
  }

  if (config.description && typeof config.description !== 'string') {
    errors.push('Field "description" must be a string');
  }

  if (config.memoryScope && !VALID_MEMORY_SCOPES.includes(config.memoryScope)) {
    errors.push(`Field "memoryScope" must be one of: ${VALID_MEMORY_SCOPES.join(', ')}`);
  }

  if (config.tools && !Array.isArray(config.tools)) {
    errors.push('Field "tools" must be an array');
  } else if (config.tools && config.tools.some((tool: any) => typeof tool !== 'string')) {
    errors.push('All items in "tools" array must be strings');
  }

  if (config.keywords && !Array.isArray(config.keywords)) {
    errors.push('Field "keywords" must be an array');
  } else if (config.keywords && config.keywords.some((keyword: any) => typeof keyword !== 'string')) {
    errors.push('All items in "keywords" array must be strings');
  }

  if (config.icon && typeof config.icon !== 'string') {
    errors.push('Field "icon" must be a string');
  }

  if (config.color && typeof config.color !== 'string') {
    errors.push('Field "color" must be a string');
  }

  if (config.status && !VALID_STATUSES.includes(config.status)) {
    errors.push(`Field "status" must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  return errors;
}

/**
 * Loads and validates agent configuration from the registry
 * 
 * @param agentId - The ID of the agent to load configuration for
 * @returns Validated agent configuration
 * @throws {AgentConfigError} If configuration is invalid or missing
 */
export function getAgentConfig(agentId: string): AgentConfig {
  // Validate agent ID format
  if (!agentId || typeof agentId !== 'string') {
    throw new AgentConfigError(
      'Invalid agent ID provided',
      agentId || 'undefined'
    );
  }

  // Check if agent exists in registry
  if (!validateAgentId(agentId)) {
    throw new AgentConfigError(
      `Agent "${agentId}" not found in registry`,
      agentId
    );
  }

  // Load configuration from registry
  const config = getConfigFromRegistry(agentId);
  
  if (!config) {
    throw new AgentConfigError(
      `Configuration not found for agent "${agentId}"`,
      agentId
    );
  }

  // Validate configuration structure
  const validationErrors = validateAgentConfig(config, agentId);
  
  if (validationErrors.length > 0) {
    throw new AgentConfigError(
      `Invalid configuration for agent "${agentId}"`,
      agentId,
      validationErrors
    );
  }

  // Return a deep copy to prevent mutations
  return {
    id: config.id,
    name: config.name,
    tone: config.tone,
    goal: config.goal,
    description: config.description,
    memoryScope: config.memoryScope,
    tools: [...config.tools],
    keywords: [...config.keywords],
    icon: config.icon,
    color: config.color,
    status: config.status
  };
}

/**
 * Gets agent configuration with fallback defaults
 * Useful when you want to provide default behavior instead of throwing errors
 * 
 * @param agentId - The ID of the agent to load configuration for
 * @param fallbackConfig - Default configuration to use if loading fails
 * @returns Agent configuration or fallback
 */
export function getAgentConfigWithFallback(
  agentId: string,
  fallbackConfig: Partial<AgentConfig>
): AgentConfig {
  try {
    return getAgentConfig(agentId);
  } catch (error) {
    console.warn(`[config-utils] Failed to load config for agent "${agentId}":`, error);
    
    // Create complete config from fallback
    const defaultConfig: AgentConfig = {
      id: agentId,
      name: fallbackConfig.name || `${agentId} Agent`,
      tone: fallbackConfig.tone || 'professional',
      goal: fallbackConfig.goal || 'Assist users with their requests',
      description: fallbackConfig.description || 'General purpose assistant',
      memoryScope: fallbackConfig.memoryScope || 'session',
      tools: fallbackConfig.tools || [],
      keywords: fallbackConfig.keywords || [agentId],
      icon: fallbackConfig.icon || 'Bot',
      color: fallbackConfig.color || 'gray',
      status: fallbackConfig.status || 'active',
      ...fallbackConfig
    };

    return defaultConfig;
  }
}

/**
 * Validates that an agent configuration is complete and valid
 * 
 * @param config - Configuration to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateAgentConfigStructure(config: any): string[] {
  if (!config || typeof config !== 'object') {
    return ['Configuration object is missing or invalid'];
  }

  return validateAgentConfig(config, config.id || 'unknown');
}

/**
 * Creates a typed agent configuration object with validation
 * Useful for programmatically creating agent configs
 * 
 * @param config - Partial configuration object
 * @returns Complete, validated agent configuration
 * @throws {AgentConfigError} If configuration is invalid
 */
export function createAgentConfig(config: Partial<AgentConfig> & { id: string }): AgentConfig {
  if (!config.id) {
    throw new AgentConfigError('Agent ID is required', 'unknown');
  }

  const fullConfig: AgentConfig = {
    name: `${config.id} Agent`,
    tone: 'professional',
    goal: 'Assist users with their requests',
    description: 'General purpose assistant',
    memoryScope: 'session',
    tools: [],
    keywords: [config.id],
    icon: 'Bot',
    color: 'gray',
    status: 'active',
    ...config
  };

  const validationErrors = validateAgentConfig(fullConfig, config.id);
  
  if (validationErrors.length > 0) {
    throw new AgentConfigError(
      `Invalid configuration for agent "${config.id}"`,
      config.id,
      validationErrors
    );
  }

  return fullConfig;
}

/**
 * Gets agent configuration as a readonly object
 * Prevents accidental mutations of configuration
 * 
 * @param agentId - The ID of the agent to load configuration for
 * @returns Readonly agent configuration
 */
export function getReadonlyAgentConfig(agentId: string): Readonly<AgentConfig> {
  const config = getAgentConfig(agentId);
  return Object.freeze({
    ...config,
    tools: Object.freeze([...config.tools]) as readonly string[],
    keywords: Object.freeze([...config.keywords]) as readonly string[]
  }) as Readonly<AgentConfig>;
}

/**
 * Type guard to check if an object is a valid agent configuration
 */
export function isValidAgentConfig(obj: any): obj is AgentConfig {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const validationErrors = validateAgentConfig(obj, obj.id || 'unknown');
  return validationErrors.length === 0;
}

/**
 * Utility to get commonly needed config properties
 */
export function getAgentEssentials(agentId: string): {
  id: string;
  name: string;
  tone: string;
  memoryScope: string;
  keywords: string[];
} {
  const config = getAgentConfig(agentId);
  return {
    id: config.id,
    name: config.name,
    tone: config.tone,
    memoryScope: config.memoryScope,
    keywords: config.keywords
  };
}