/**
 * Agent monitoring and optimization utilities
 * Provides safeguards against common agent issues and performance monitoring
 */

import * as React from 'react';

interface AgentMetrics {
  agentId: string;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastUsed: Date;
  memoryUsage: number;
}

interface AgentHealth {
  status: 'healthy' | 'warning' | 'error';
  issues: string[];
  metrics: AgentMetrics;
}

class AgentMonitor {
  private metrics: Map<string, AgentMetrics> = new Map();
  private requestTimes: Map<string, number[]> = new Map();
  private memoryGrowthTracking: Map<string, number[]> = new Map();

  // Track agent request
  trackRequest(agentId: string, startTime: number, endTime: number, success: boolean) {
    const metrics = this.getMetrics(agentId);
    metrics.requestCount++;
    metrics.lastUsed = new Date();
    
    if (!success) {
      metrics.errorCount++;
    }

    // Track response times (keep last 10)
    const times = this.requestTimes.get(agentId) || [];
    times.push(endTime - startTime);
    if (times.length > 10) times.shift();
    this.requestTimes.set(agentId, times);

    // Update average response time
    metrics.averageResponseTime = times.reduce((a, b) => a + b, 0) / times.length;

    this.metrics.set(agentId, metrics);
  }

  // Track memory usage
  trackMemoryUsage(agentId: string, memoryEntries: number) {
    const metrics = this.getMetrics(agentId);
    metrics.memoryUsage = memoryEntries;

    // Track memory growth
    const growth = this.memoryGrowthTracking.get(agentId) || [];
    growth.push(memoryEntries);
    if (growth.length > 20) growth.shift();
    this.memoryGrowthTracking.set(agentId, growth);
  }

  // Get agent health status
  getAgentHealth(agentId: string): AgentHealth {
    const metrics = this.getMetrics(agentId);
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'error' = 'healthy';

    // Check error rate
    const errorRate = metrics.requestCount > 0 ? metrics.errorCount / metrics.requestCount : 0;
    if (errorRate > 0.5) {
      issues.push(`High error rate: ${Math.round(errorRate * 100)}%`);
      status = 'error';
    } else if (errorRate > 0.2) {
      issues.push(`Elevated error rate: ${Math.round(errorRate * 100)}%`);
      status = 'warning';
    }

    // Check response time
    if (metrics.averageResponseTime > 5000) {
      issues.push(`Slow response time: ${Math.round(metrics.averageResponseTime)}ms`);
      status = status === 'error' ? 'error' : 'warning';
    }

    // Check memory growth
    const growth = this.memoryGrowthTracking.get(agentId) || [];
    if (growth.length > 10) {
      const recentGrowth = growth.slice(-5);
      const oldGrowth = growth.slice(0, 5);
      const recentAvg = recentGrowth.reduce((a, b) => a + b, 0) / recentGrowth.length;
      const oldAvg = oldGrowth.reduce((a, b) => a + b, 0) / oldGrowth.length;
      
      if (recentAvg > oldAvg * 2) {
        issues.push('Rapid memory growth detected');
        status = status === 'error' ? 'error' : 'warning';
      }
    }

    // Check for excessive memory usage
    if (metrics.memoryUsage > 1000) {
      issues.push(`High memory usage: ${metrics.memoryUsage} entries`);
      status = status === 'error' ? 'error' : 'warning';
    }

    return { status, issues, metrics };
  }

  // Get all agent health statuses
  getAllAgentHealth(): Record<string, AgentHealth> {
    const health: Record<string, AgentHealth> = {};
    Array.from(this.metrics.keys()).forEach(agentId => {
      health[agentId] = this.getAgentHealth(agentId);
    });
    return health;
  }

  // Detect routing loops
  detectRoutingLoop(agentId: string, previousAgents: string[]): boolean {
    // Check if we're switching between the same agents repeatedly
    const recentSwitches = previousAgents.slice(-6);
    const uniqueAgents = new Set(recentSwitches);
    
    // If we have few unique agents but many switches, it's likely a loop
    if (recentSwitches.length >= 6 && uniqueAgents.size <= 2) {
      console.warn(`Potential routing loop detected involving agents: ${Array.from(uniqueAgents).join(', ')}`);
      return true;
    }

    return false;
  }

  // Generate optimization recommendations
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const allHealth = this.getAllAgentHealth();

    Object.entries(allHealth).forEach(([agentId, health]) => {
      if (health.status === 'error') {
        recommendations.push(`🔴 ${agentId}: Critical issues - ${health.issues.join(', ')}`);
      } else if (health.status === 'warning') {
        recommendations.push(`🟡 ${agentId}: Performance concerns - ${health.issues.join(', ')}`);
      }

      // Specific recommendations
      if (health.metrics.averageResponseTime > 3000) {
        recommendations.push(`⏱️ ${agentId}: Consider caching or optimizing agent responses`);
      }

      if (health.metrics.memoryUsage > 500) {
        recommendations.push(`🧠 ${agentId}: Consider implementing memory cleanup strategies`);
      }

      if (health.metrics.errorCount > 10) {
        recommendations.push(`🚨 ${agentId}: Review error handling and fallback mechanisms`);
      }
    });

    return recommendations;
  }

  // Reset metrics for an agent
  resetMetrics(agentId: string) {
    this.metrics.delete(agentId);
    this.requestTimes.delete(agentId);
    this.memoryGrowthTracking.delete(agentId);
  }

  // Clear all metrics
  clearAll() {
    this.metrics.clear();
    this.requestTimes.clear();
    this.memoryGrowthTracking.clear();
  }

  private getMetrics(agentId: string): AgentMetrics {
    return this.metrics.get(agentId) || {
      agentId,
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      lastUsed: new Date(),
      memoryUsage: 0,
    };
  }
}

// Singleton instance
export const agentMonitor = new AgentMonitor();

// Enhanced API client with monitoring
export function createMonitoredApiClient() {
  const originalSendRequest = async (agentId: string, request: any, includeMemory: boolean) => {
    const startTime = Date.now();
    let success = false;
    
    try {
      // Import the API client
      const { apiClient } = await import('./api');
      const response = await apiClient.sendAgentRequest(agentId, request, includeMemory);
      success = true;
      
      // Track memory usage if available
      if (response.memoryUsed) {
        agentMonitor.trackMemoryUsage(agentId, response.memoryUsed.length);
      }
      
      return response;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const endTime = Date.now();
      agentMonitor.trackRequest(agentId, startTime, endTime, success);
    }
  };

  return { sendAgentRequest: originalSendRequest };
}

// Hook for monitoring data in React components
export function useAgentMonitoring() {
  const [health, setHealth] = React.useState<Record<string, AgentHealth>>({});
  const [recommendations, setRecommendations] = React.useState<string[]>([]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setHealth(agentMonitor.getAllAgentHealth());
      setRecommendations(agentMonitor.getOptimizationRecommendations());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    health,
    recommendations,
    monitor: agentMonitor,
  };
}