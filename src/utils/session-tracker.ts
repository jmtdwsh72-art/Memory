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
    context?: any
  ): void {
    this.sessions.set(userId, {
      lastAgentResponse: response,
      lastAgentId: agentId,
      lastResponseTime: new Date(),
      lastReasoningLevel: reasoningLevel,
      continuationContext: context
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
   * Get all active sessions (for debugging)
   */
  getActiveSessions(): string[] {
    this.cleanupExpiredSessions();
    return Array.from(this.sessions.keys());
  }
}

// Export singleton instance
export const sessionTracker = new SessionTracker();