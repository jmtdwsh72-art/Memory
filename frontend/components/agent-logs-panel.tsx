'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  MessageSquare, 
  Bot, 
  Filter, 
  RefreshCw, 
  AlertCircle, 
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { apiClient, type AgentLog } from '@/lib/api';
import { LogsShimmer } from './loading-shimmer';
import { cn } from '@/lib/utils';

interface AgentLogsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const AGENT_COLORS = {
  router: 'bg-gray-500',
  research: 'bg-blue-500',
  automation: 'bg-orange-500',
  default: 'bg-purple-500'
} as const;

const AGENT_ICONS = {
  router: MessageSquare,
  research: Bot,
  automation: Bot,
  default: Bot
} as const;

export function AgentLogsPanel({ isOpen, onClose, className }: AgentLogsPanelProps) {
  const [logs, setLogs] = React.useState<AgentLog[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = React.useState<string>('all');
  const [expandedLogs, setExpandedLogs] = React.useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = React.useState(false);

  const availableAgents = React.useMemo(() => {
    const agents = new Set(logs.map(log => log.agentName));
    return ['all', ...Array.from(agents).sort()];
  }, [logs]);

  const filteredLogs = React.useMemo(() => {
    if (selectedAgent === 'all') return logs;
    return logs.filter(log => log.agentName === selectedAgent);
  }, [logs, selectedAgent]);

  const fetchLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getLogs(
        selectedAgent === 'all' ? undefined : selectedAgent,
        10
      );
      
      setLogs(response.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  }, [selectedAgent]);

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getAgentColor = (agentName: string) => {
    return AGENT_COLORS[agentName as keyof typeof AGENT_COLORS] || AGENT_COLORS.default;
  };

  const getAgentIcon = (agentName: string) => {
    return AGENT_ICONS[agentName as keyof typeof AGENT_ICONS] || AGENT_ICONS.default;
  };

  // Fetch logs when panel opens or agent selection changes
  React.useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, fetchLogs]);

  // Auto-refresh logs every 30 seconds when panel is open
  React.useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [isOpen, fetchLogs]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={cn(
            'fixed right-0 top-0 h-full w-full max-w-2xl',
            'bg-background border-l border-border shadow-2xl',
            'flex flex-col overflow-hidden',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Agent Logs</h2>
                <p className="text-sm text-muted-foreground">
                  {filteredLogs.length} interaction{filteredLogs.length !== 1 ? 's' : ''}
                  {selectedAgent !== 'all' && ` from ${selectedAgent}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Refresh Button */}
              <button
                onClick={fetchLogs}
                disabled={loading}
                className={cn(
                  'p-2 rounded-lg hover:bg-accent transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  loading && 'opacity-50 cursor-not-allowed'
                )}
                aria-label="Refresh logs"
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </button>

              {/* Filter Toggle */}
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className={cn(
                  'p-2 rounded-lg hover:bg-accent transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  filterOpen && 'bg-accent'
                )}
                aria-label="Toggle filter"
              >
                <Filter className="h-4 w-4" />
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className={cn(
                  'p-2 rounded-lg hover:bg-accent transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                )}
                aria-label="Close logs panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <AnimatePresence>
            {filterOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-border bg-muted/30"
              >
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Filter by agent:</span>
                    <select
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className={cn(
                        'px-3 py-1 rounded-md border border-border bg-background',
                        'text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
                      )}
                    >
                      {availableAgents.map(agent => (
                        <option key={agent} value={agent}>
                          {agent === 'all' ? 'All Agents' : agent}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <LogsShimmer />
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full p-6">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load logs</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">{error}</p>
                <button
                  onClick={fetchLogs}
                  className={cn(
                    'px-4 py-2 rounded-lg bg-primary text-primary-foreground',
                    'hover:bg-primary/90 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                  )}
                >
                  Try Again
                </button>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No logs found</h3>
                <p className="text-sm text-muted-foreground text-center">
                  {selectedAgent === 'all' 
                    ? 'No agent interactions have been logged yet.'
                    : `No interactions found for the ${selectedAgent} agent.`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4 p-6">
                {filteredLogs.map((log, index) => {
                  const isExpanded = expandedLogs.has(log.id);
                  const AgentIcon = getAgentIcon(log.agentName);
                  
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'rounded-lg border border-border bg-card p-4',
                        'hover:shadow-md transition-shadow duration-200'
                      )}
                    >
                      {/* Log Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'h-8 w-8 rounded-full flex items-center justify-center',
                            getAgentColor(log.agentName)
                          )}>
                            <AgentIcon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <span className="font-medium text-foreground capitalize">
                              {log.agentName}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatTimestamp(log.timestamp)}
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => toggleLogExpansion(log.id)}
                          className={cn(
                            'p-1 rounded-md hover:bg-accent transition-colors',
                            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                          )}
                          aria-label={isExpanded ? 'Collapse log' : 'Expand log'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {/* Log Content */}
                      <div className="space-y-3">
                        {/* Input */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Input
                            </span>
                          </div>
                          <p className="text-sm text-foreground bg-muted/50 rounded-md p-2">
                            {isExpanded ? log.input : truncateText(log.input)}
                          </p>
                        </div>

                        {/* Output */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Output
                            </span>
                          </div>
                          <p className="text-sm text-foreground bg-muted/50 rounded-md p-2">
                            {isExpanded ? log.output : truncateText(log.output)}
                          </p>
                        </div>

                        {/* Memory Used */}
                        {log.memoryUsed.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Memory Used
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {log.memoryUsed.map((memoryId, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                                >
                                  {memoryId.substring(0, 8)}...
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}