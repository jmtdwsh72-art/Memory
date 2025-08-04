import { AgentConfig, AgentResponse } from '../utils/types';
import { WelcomeAgent } from './agent-welcome';
import { getAgentConfig } from '../utils/config-utils';
import { logAgentError } from '../utils/error-logger';

export class WelcomeAgentWrapper {
  private config: AgentConfig;
  private welcomeAgent: WelcomeAgent;

  constructor() {
    this.config = getAgentConfig('welcome');
    this.welcomeAgent = new WelcomeAgent();
  }

  async processInput(input: string, userId?: string): Promise<AgentResponse> {
    const requestId = `welcome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const context = {
        sessionId: userId,
        isFirstMessage: input.toLowerCase().includes('welcome') || input.toLowerCase().includes('start')
      };

      const response = await this.welcomeAgent.handle(input, context);
      
      if (!response || !response.success || typeof response.message !== 'string') {
        throw new Error('Invalid response from WelcomeAgent');
      }

      console.log('[WelcomeAgentWrapper] Response:', {
        input,
        hasMessage: !!response.message,
        messageLength: response.message?.length
      });

      return {
        success: true,
        message: response.message,
        memoryUpdated: response.memoryUpdated || false
      };
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Welcome agent processing failed');
      
      await logAgentError('welcome', errorObj, {
        input,
        userId,
        requestId
      });
      
      console.error('[WelcomeAgentWrapper] Error:', errorObj);
      
      return {
        success: false,
        message: `Welcome agent error: ${errorObj.message}`
      };
    }
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }
}