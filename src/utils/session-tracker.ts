/**
 * Session Tracker
 * 
 * Tracks the last agent response for each user session to enable
 * feedback analysis and continuation detection.
 */

interface SessionData {
  lastAgentResponse: string;
  lastAgentId: string;
  lastResponseTime: Date;
  lastReasoningLevel?: string;
  continuationContext?: any;
  lastAssistantId?: string;
  lastThreadId?: string;
  lastRoutingTime?: Date;
}

class SessionTracker {
  private sessions: Map<string, SessionData> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  /**
   * Store the last agent response for a user session
   */
  setLastResponse(
    userId: string,
    agentId: string,
    response: string,
    reasoningLevel?: string,
    context?: any,
    assistantId?: string,
    threadId?: string
  ): void {
    const existing = this.sessions.get(userId);
    this.sessions.set(userId, {
      lastAgentResponse: response,
      lastAgentId: agentId,
      lastResponseTime: new Date(),
      lastReasoningLevel: reasoningLevel,
      continuationContext: context,
      lastAssistantId: assistantId || existing?.lastAssistantId,
      lastThreadId: threadId || existing?.lastThreadId,
      lastRoutingTime: assistantId ? new Date() : existing?.lastRoutingTime
    });
    
    // Clean up old sessions
    this.cleanupExpiredSessions();
  }

  /**
   * Get the last agent response for a user session
   */
  getLastResponse(userId: string): SessionData | null {
    const session = this.sessions.get(userId);
    
    if (!session) {
      return null;
    }
    
    // Check if session has expired
    const now = new Date();
    const timeDiff = now.getTime() - session.lastResponseTime.getTime();
    
    if (timeDiff > this.SESSION_TIMEOUT) {
      this.sessions.delete(userId);
      return null;
    }
    
    return session;
  }

  /**
   * Clear session data for a user
   */
  clearSession(userId: string): void {
    this.sessions.delete(userId);
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];
    
    for (const [userId, session] of this.sessions.entries()) {
      const timeDiff = now.getTime() - session.lastResponseTime.getTime();
      if (timeDiff > this.SESSION_TIMEOUT) {
        expiredSessions.push(userId);
      }
    }
    
    for (const userId of expiredSessions) {
      this.sessions.delete(userId);
    }
  }

  /**
   * Check if input is a follow-up that should continue with the same assistant
   */
  shouldContinueWithLastAssistant(userId: string, input: string): boolean {
    const session = this.getLastResponse(userId);
    if (!session || !session.lastAssistantId) {
      return false;
    }
    
    // Check if routing happened recently (within 5 minutes)
    if (session.lastRoutingTime) {
      const timeSinceRouting = Date.now() - session.lastRoutingTime.getTime();
      if (timeSinceRouting > 5 * 60 * 1000) {
        return false;
      }
    }
    
    return this.isFollowUpInput(input);
  }

  /**
   * Check if input is a vague follow-up
   */
  private isFollowUpInput(input: string): boolean {
    const trimmedInput = input.trim().toLowerCase();
    
    // Very short affirmative responses
    const shortAffirmatives = [
      'yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'continue', 'go on', 'proceed',
      'next', 'more', 'tell me more', 'what else', 'and then', 'keep going'
    ];
    
    if (shortAffirmatives.includes(trimmedInput)) {
      return true;
    }
    
    // Short responses under 15 characters that are likely follow-ups
    if (trimmedInput.length <= 15) {
      const followUpPatterns = [
        /^(and|then|also|plus|additionally)/,
        /^(what about|how about)/,
        /^(can you|could you) (also|too)/,
        /^(tell me|show me) (more|about)/
      ];
      
      return followUpPatterns.some(pattern => pattern.test(trimmedInput));
    }
    
    return false;
  }

  /**
   * Get last assistant info for continuing conversation
   */
  getLastAssistantInfo(userId: string): { assistantId: string; threadId?: string; agentType: string } | null {
    const session = this.getLastResponse(userId);
    if (!session || !session.lastAssistantId) {
      return null;
    }
    
    return {
      assistantId: session.lastAssistantId,
      threadId: session.lastThreadId,
      agentType: session.lastAgentId
    };
  }

  /**
   * Get all active sessions (for debugging)
   */
  getActiveSessions(): string[] {
    this.cleanupExpiredSessions();
    return Array.from(this.sessions.keys());
  }
}

// Export singleton instance
export const sessionTracker = new SessionTracker();