'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  TrendingUp, 
  Filter, 
  Download, 
  RefreshCw, 
  Search, 
  Eye, 
  X,
  Calendar,
  Clock,
  User,
  Monitor,
  ChevronDown,
  ChevronRight
} from '@/lib/icons';
import { cn } from '@/lib/utils';

interface ErrorEntry {
  id: string;
  timestamp: string;
  type: 'UI' | 'API' | 'AGENT' | 'MEMORY' | 'TTS' | 'TRANSCRIPTION' | 'SYSTEM';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  agentId?: string;
  userId?: string;
  message: string;
  stack?: string;
  context: {
    input?: string;
    output?: string;
    memoryUsed?: string[];
    userAgent?: string;
    url?: string;
    sessionId?: string;
    requestId?: string;
  };
  metadata: {
    environment: string;
    version: string;
    nodeVersion: string;
  };
  resolved: boolean;
  userFeedback?: {
    message: string;
    timestamp: string;
    helpful: boolean;
  };
}

interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  errorsByAgent: Record<string, number>;
  recentErrors: ErrorEntry[];
  topErrors: { message: string; count: number }[];
}

interface ErrorAdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

type FilterType = 'all' | 'UI' | 'API' | 'AGENT' | 'MEMORY' | 'TTS' | 'TRANSCRIPTION' | 'SYSTEM';
type FilterSeverity = 'all' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export function ErrorAdminPanel({ isOpen, onClose, className }: ErrorAdminPanelProps) {
  const [stats, setStats] = React.useState<ErrorStats | null>(null);
  const [selectedError, setSelectedError] = React.useState<ErrorEntry | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterType, setFilterType] = React.useState<FilterType>('all');
  const [filterSeverity, setFilterSeverity] = React.useState<FilterSeverity>('all');
  const [timeRange, setTimeRange] = React.useState(7); // Days
  const [expandedErrors, setExpandedErrors] = React.useState<Set<string>>(new Set());

  // Fetch error statistics
  const fetchStats = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/errors/stats?days=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        console.error('Failed to fetch error stats');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  // Fetch error details
  const fetchErrorDetails = React.useCallback(async (errorId: string) => {
    try {
      const response = await fetch(`/api/errors/${errorId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedError(data.error);
      } else {
        console.error('Failed to fetch error details');
      }
    } catch (error) {
      console.error('Error fetching error details:', error);
    }
  }, []);

  // Filter errors based on current filters
  const filteredErrors = React.useMemo(() => {
    if (!stats) return [];

    return stats.recentErrors.filter(error => {
      // Search filter
      if (searchQuery && !error.message.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !error.agentId?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Type filter
      if (filterType !== 'all' && error.type !== filterType) {
        return false;
      }

      // Severity filter
      if (filterSeverity !== 'all' && error.severity !== filterSeverity) {
        return false;
      }

      return true;
    });
  }, [stats, searchQuery, filterType, filterSeverity]);

  // Toggle error expansion
  const toggleErrorExpansion = (errorId: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  };

  // Export errors as JSON
  const exportErrors = () => {
    if (!stats) return;

    const exportData = {
      timestamp: new Date().toISOString(),
      timeRange,
      stats,
      errors: filteredErrors
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-100 dark:bg-red-950/30';
      case 'HIGH': return 'text-orange-600 bg-orange-100 dark:bg-orange-950/30';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950/30';
      case 'LOW': return 'text-blue-600 bg-blue-100 dark:bg-blue-950/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-950/30';
    }
  };

  // Get type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SYSTEM': return 'text-red-600 bg-red-100 dark:bg-red-950/30';
      case 'AGENT': return 'text-purple-600 bg-purple-100 dark:bg-purple-950/30';
      case 'API': return 'text-blue-600 bg-blue-100 dark:bg-blue-950/30';
      case 'UI': return 'text-green-600 bg-green-100 dark:bg-green-950/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-950/30';
    }
  };

  // Fetch stats when panel opens or time range changes
  React.useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen, fetchStats]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              'fixed inset-4 md:inset-8 bg-background border border-border rounded-lg shadow-xl z-50',
              'flex flex-col overflow-hidden',
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <h2 className="text-lg font-semibold">Error Management</h2>
                {stats && (
                  <span className="text-sm text-muted-foreground">
                    {stats.totalErrors} errors in last {timeRange} days
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchStats}
                  disabled={isLoading}
                  className="p-2 hover:bg-accent rounded-lg"
                  title="Refresh"
                >
                  <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                </button>
                
                <button
                  onClick={exportErrors}
                  disabled={!stats}
                  className="p-2 hover:bg-accent rounded-lg"
                  title="Export errors"
                >
                  <Download className="h-4 w-4" />
                </button>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-accent rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <span>Loading error data...</span>
                  </div>
                </div>
              ) : stats ? (
                <div className="flex h-full">
                  {/* Main content */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Statistics */}
                    <div className="p-4 border-b border-border">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">{stats.totalErrors}</div>
                          <div className="text-sm text-red-600/80">Total Errors</div>
                        </div>
                        
                        <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {stats.errorsBySeverity.CRITICAL || 0}
                          </div>
                          <div className="text-sm text-orange-600/80">Critical</div>
                        </div>
                        
                        <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">
                            {stats.errorsBySeverity.HIGH || 0}
                          </div>
                          <div className="text-sm text-yellow-600/80">High Priority</div>
                        </div>
                        
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {Object.keys(stats.errorsByAgent).length}
                          </div>
                          <div className="text-sm text-blue-600/80">Affected Agents</div>
                        </div>
                      </div>

                      {/* Filters */}
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(Number(e.target.value))}
                            className="px-2 py-1 text-sm border border-border rounded bg-background"
                          >
                            <option value={1}>Last 24 hours</option>
                            <option value={7}>Last 7 days</option>
                            <option value={30}>Last 30 days</option>
                            <option value={90}>Last 90 days</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Search errors..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="px-2 py-1 text-sm border border-border rounded bg-background w-32"
                          />
                        </div>

                        <select
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value as FilterType)}
                          className="px-2 py-1 text-sm border border-border rounded bg-background"
                        >
                          <option value="all">All Types</option>
                          <option value="SYSTEM">System</option>
                          <option value="AGENT">Agent</option>
                          <option value="API">API</option>
                          <option value="UI">UI</option>
                          <option value="MEMORY">Memory</option>
                          <option value="TTS">TTS</option>
                          <option value="TRANSCRIPTION">Transcription</option>
                        </select>

                        <select
                          value={filterSeverity}
                          onChange={(e) => setFilterSeverity(e.target.value as FilterSeverity)}
                          className="px-2 py-1 text-sm border border-border rounded bg-background"
                        >
                          <option value="all">All Severities</option>
                          <option value="CRITICAL">Critical</option>
                          <option value="HIGH">High</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="LOW">Low</option>
                        </select>
                      </div>
                    </div>

                    {/* Error list */}
                    <div className="flex-1 overflow-y-auto p-4">
                      {filteredErrors.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <div className="text-center">
                            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No errors found matching your filters</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredErrors.map((error) => {
                            const isExpanded = expandedErrors.has(error.id);
                            
                            return (
                              <div
                                key={error.id}
                                className="border border-border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <button
                                        onClick={() => toggleErrorExpansion(error.id)}
                                        className="p-1 hover:bg-accent rounded"
                                      >
                                        {isExpanded ? (
                                          <ChevronDown className="h-3 w-3" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3" />
                                        )}
                                      </button>
                                      
                                      <span className={cn(
                                        'px-2 py-0.5 text-xs rounded-full font-medium',
                                        getSeverityColor(error.severity)
                                      )}>
                                        {error.severity}
                                      </span>
                                      
                                      <span className={cn(
                                        'px-2 py-0.5 text-xs rounded-full font-medium',
                                        getTypeColor(error.type)
                                      )}>
                                        {error.type}
                                      </span>
                                      
                                      {error.agentId && (
                                        <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-full">
                                          {error.agentId}
                                        </span>
                                      )}
                                      
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(error.timestamp).toLocaleString()}
                                      </span>
                                    </div>
                                    
                                    <p className="text-sm text-foreground mb-1 truncate">
                                      {error.message}
                                    </p>
                                    
                                    {error.context.url && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {error.context.url}
                                      </p>
                                    )}
                                  </div>
                                  
                                  <button
                                    onClick={() => fetchErrorDetails(error.id)}
                                    className="p-1 hover:bg-accent rounded ml-2"
                                    title="View details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                </div>

                                {/* Expanded details */}
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="mt-3 pt-3 border-t border-border"
                                    >
                                      {error.stack && (
                                        <details className="mb-3">
                                          <summary className="cursor-pointer text-xs font-medium mb-2">
                                            Stack Trace
                                          </summary>
                                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                            {error.stack}
                                          </pre>
                                        </details>
                                      )}
                                      
                                      {error.context.input && (
                                        <div className="mb-2">
                                          <div className="text-xs font-medium mb-1">Input:</div>
                                          <div className="text-xs bg-muted p-2 rounded">
                                            {error.context.input.substring(0, 200)}
                                            {error.context.input.length > 200 && '...'}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {error.userFeedback && (
                                        <div className="mb-2">
                                          <div className="text-xs font-medium mb-1">User Feedback:</div>
                                          <div className="text-xs bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                                            {error.userFeedback.message}
                                            <div className="text-xs text-muted-foreground mt-1">
                                              {new Date(error.userFeedback.timestamp).toLocaleString()}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Error details sidebar */}
                  {selectedError && (
                    <div className="w-96 border-l border-border p-4 overflow-y-auto">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Error Details</h3>
                        <button
                          onClick={() => setSelectedError(null)}
                          className="p-1 hover:bg-accent rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-4 text-sm">
                        <div>
                          <div className="font-medium mb-1">Error ID</div>
                          <div className="font-mono text-xs bg-muted p-2 rounded">
                            {selectedError.id}
                          </div>
                        </div>
                        
                        <div>
                          <div className="font-medium mb-1">Timestamp</div>
                          <div>{new Date(selectedError.timestamp).toLocaleString()}</div>
                        </div>
                        
                        <div>
                          <div className="font-medium mb-1">Type & Severity</div>
                          <div className="flex gap-2">
                            <span className={cn(
                              'px-2 py-1 text-xs rounded-full',
                              getTypeColor(selectedError.type)
                            )}>
                              {selectedError.type}
                            </span>
                            <span className={cn(
                              'px-2 py-1 text-xs rounded-full',
                              getSeverityColor(selectedError.severity)
                            )}>
                              {selectedError.severity}
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="font-medium mb-1">Message</div>
                          <div className="bg-muted p-2 rounded">{selectedError.message}</div>
                        </div>
                        
                        {selectedError.context.userAgent && (
                          <div>
                            <div className="font-medium mb-1">User Agent</div>
                            <div className="text-xs text-muted-foreground">
                              {selectedError.context.userAgent}
                            </div>
                          </div>
                        )}
                        
                        <div>
                          <div className="font-medium mb-1">Environment</div>
                          <div className="text-xs">
                            <div>Environment: {selectedError.metadata.environment}</div>
                            <div>Version: {selectedError.metadata.version}</div>
                            <div>Node: {selectedError.metadata.nodeVersion}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Failed to load error data</p>
                    <button
                      onClick={fetchStats}
                      className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}