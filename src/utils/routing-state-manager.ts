import { MemoryManager } from './memory-manager';

export interface RoutingState {
  lastRoutedAgent: string;
  lastRoutedTime: number;
  lastUserInput: string;
  routingCount: number;
  currentThread: string;
  sessionStartTime: number;
  recentIntents: Array<{
    intent: string;
    agentId: string;
    confidence: number;
    timestamp: number;
    inputHash: string;
  }>;
}

export interface RoutingDecision {
  shouldRoute: boolean;
  targetAgent: string;
  confidence: number;
  reason: string;
  suppressIntro: boolean;
  dampingApplied: number;
}

export class RoutingStateManager {
  private memoryManager: MemoryManager;
  private sessionStates: Map<string, RoutingState> = new Map();

  constructor() {
    this.memoryManager = new MemoryManager();
  }

  /**
   * Initialize or get routing state for a session
   */
  getRoutingState(sessionId: string, currentAgent?: string): RoutingState {
    if (!this.sessionStates.has(sessionId)) {
      const state: RoutingState = {
        lastRoutedAgent: currentAgent || 'router',
        lastRoutedTime: 0,
        lastUserInput: '',
        routingCount: 0,
        currentThread: currentAgent || 'router',
        sessionStartTime: Date.now(),
        recentIntents: []
      };
      this.sessionStates.set(sessionId, state);
      return state;
    }
    
    const state = this.sessionStates.get(sessionId)!;
    // Update current thread if provided
    if (currentAgent && currentAgent !== state.currentThread) {
      state.currentThread = currentAgent;
    }
    
    return state;
  }

  /**
   * Evaluate whether routing should occur based on current state
   */
  evaluateRouting(
    sessionId: string,
    targetAgent: string,
    baseConfidence: number,
    userInput: string,
    intentPattern: string,
    currentAgent?: string
  ): RoutingDecision {
    const state = this.getRoutingState(sessionId, currentAgent);
    const now = Date.now();
    const inputHash = this.hashInput(userInput);

    // 1. Prevent Same-Agent Re-Routing
    if (targetAgent === state.currentThread) {
      // Only allow if explicitly requesting reset or very high confidence
      const isResetRequest = this.isResetRequest(userInput);
      if (!isResetRequest && baseConfidence < 0.95) {
        return {
          shouldRoute: false,
          targetAgent: state.currentThread,
          confidence: baseConfidence,
          reason: 'Already in target agent thread',
          suppressIntro: true,
          dampingApplied: 0
        };
      }
      
      if (isResetRequest) {
        return {
          shouldRoute: false, // Don't route, but allow fresh start
          targetAgent: state.currentThread,
          confidence: baseConfidence,
          reason: 'Reset request within same agent',
          suppressIntro: false, // Allow fresh intro for reset
          dampingApplied: 0
        };
      }
    }

    // 2. Session-Aware Routing Memory
    const timeSinceLastRoute = now - state.lastRoutedTime;
    const recentRoutingToSameAgent = state.lastRoutedAgent === targetAgent && 
                                   timeSinceLastRoute < 30000; // 30 seconds

    if (recentRoutingToSameAgent && baseConfidence < 0.9) {
      return {
        shouldRoute: false,
        targetAgent: state.currentThread,
        confidence: baseConfidence,
        reason: 'Recent routing to same agent (< 30s)',
        suppressIntro: true,
        dampingApplied: 0
      };
    }

    // 3. Confidence Dampening for Repeat Intents
    let adjustedConfidence = baseConfidence;
    let dampingApplied = 0;
    
    const recentSimilarIntent = state.recentIntents.find(intent => 
      intent.intent === intentPattern && 
      intent.agentId === targetAgent &&
      (now - intent.timestamp) < 120000 && // Within 2 minutes
      this.calculateInputSimilarity(inputHash, intent.inputHash) > 0.7
    );

    if (recentSimilarIntent) {
      dampingApplied = 0.2;
      adjustedConfidence = Math.max(0.1, baseConfidence - dampingApplied);
    }

    // 4. Check for repetitive user inputs
    const isRepetitiveInput = this.isRepetitiveInput(userInput, state.lastUserInput);
    if (isRepetitiveInput && timeSinceLastRoute < 60000) { // 1 minute
      return {
        shouldRoute: false,
        targetAgent: state.currentThread,
        confidence: adjustedConfidence,
        reason: 'Repetitive input detected',
        suppressIntro: true,
        dampingApplied
      };
    }

    // 5. Determine if intro should be suppressed
    const suppressIntro = this.shouldSuppressIntro(state, targetAgent, now);

    // 6. Decide whether to route based on adjusted confidence
    const shouldRoute = adjustedConfidence >= 0.7 && targetAgent !== state.currentThread;

    return {
      shouldRoute,
      targetAgent,
      confidence: adjustedConfidence,
      reason: shouldRoute ? 
        `Routing confidence: ${adjustedConfidence.toFixed(2)}${dampingApplied > 0 ? ' (damped)' : ''}` :
        'Confidence too low after evaluation',
      suppressIntro,
      dampingApplied
    };
  }

  /**
   * Update routing state after a routing decision
   */
  updateRoutingState(
    sessionId: string,
    targetAgent: string,
    userInput: string,
    intentPattern: string,
    confidence: number,
    wasRouted: boolean
  ): void {
    const state = this.getRoutingState(sessionId);
    const now = Date.now();
    
    if (wasRouted) {
      state.lastRoutedAgent = targetAgent;
      state.lastRoutedTime = now;
      state.routingCount++;
      state.currentThread = targetAgent;
    }
    
    state.lastUserInput = userInput;
    
    // Track intent history
    state.recentIntents.push({
      intent: intentPattern,
      agentId: targetAgent,
      confidence,
      timestamp: now,
      inputHash: this.hashInput(userInput)
    });
    
    // Keep only recent intents (last 10 or within 5 minutes)
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    state.recentIntents = state.recentIntents
      .filter(intent => intent.timestamp > fiveMinutesAgo)
      .slice(-10);
  }

  /**
   * Check if user is requesting a reset or fresh start
   */
  private isResetRequest(input: string): boolean {
    const lowerInput = input.toLowerCase().trim();
    const resetPatterns = [
      /^(start over|reset|begin again|new conversation|fresh start)/,
      /^(clear|restart|go back)/,
      /\b(start from scratch|begin anew|fresh topic)\b/
    ];
    
    return resetPatterns.some(pattern => pattern.test(lowerInput));
  }

  /**
   * Check if current input is repetitive
   */
  private isRepetitiveInput(current: string, previous: string): boolean {
    if (!previous || !current) return false;
    
    const similarity = this.calculateStringSimilarity(
      current.toLowerCase().trim(),
      previous.toLowerCase().trim()
    );
    
    return similarity > 0.8;
  }

  /**
   * Determine if agent intro should be suppressed
   */
  private shouldSuppressIntro(state: RoutingState, targetAgent: string, now: number): boolean {
    // Suppress if user was recently in this agent's thread
    const wasRecentlyInAgent = state.recentIntents.some(intent =>
      intent.agentId === targetAgent && 
      (now - intent.timestamp) < 300000 // 5 minutes
    );
    
    // Suppress if this is a continuation of the same session
    const isSessionContinuation = (now - state.sessionStartTime) > 60000 && // Session > 1 minute
                                 state.routingCount > 0;
    
    return wasRecentlyInAgent || isSessionContinuation;
  }

  /**
   * Generate hash for input comparison
   */
  private hashInput(input: string): string {
    const normalized = input.toLowerCase().replace(/[^\w\s]/g, '').trim();
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Calculate similarity between two inputs
   */
  private calculateInputSimilarity(hash1: string, hash2: string): number {
    return hash1 === hash2 ? 1.0 : 0.0;
  }

  /**
   * Calculate string similarity for repetitive input detection
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0.0;
    
    const words1 = str1.split(/\s+/).filter(w => w.length > 2);
    const words2 = str2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0.0;
    
    const commonWords = words1.filter(word => words2.includes(word));
    return (commonWords.length * 2) / (words1.length + words2.length);
  }

  /**
   * Clear expired session states (cleanup)
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    for (const [sessionId, state] of this.sessionStates.entries()) {
      if (state.sessionStartTime < oneHourAgo) {
        this.sessionStates.delete(sessionId);
      }
    }
  }

  /**
   * Get routing analytics for debugging
   */
  getRoutingAnalytics(sessionId: string): any {
    const state = this.sessionStates.get(sessionId);
    if (!state) return null;
    
    return {
      currentThread: state.currentThread,
      routingCount: state.routingCount,
      sessionDuration: Date.now() - state.sessionStartTime,
      recentIntents: state.recentIntents.length,
      lastRoutedAgent: state.lastRoutedAgent,
      timeSinceLastRoute: Date.now() - state.lastRoutedTime
    };
  }
}