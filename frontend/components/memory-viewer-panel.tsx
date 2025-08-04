'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Clock, 
  Filter, 
  RefreshCw, 
  AlertCircle, 
  ChevronDown,
  ChevronUp,
  X,
  Search,
  Trash2,
  Calendar,
  Tag,
  TrendingUp,
  Bot
} from 'lucide-react';
import { apiClient, type MemoryEntry, type MemoryResponse } from '@/lib/api';
import { MemoryShimmer } from './loading-shimmer';
import { cn } from '@/lib/utils';

interface MemoryViewerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  memory: MemoryEntry | null;
}

const MEMORY_TYPE_COLORS = {
  log: 'bg-blue-500',
  summary: 'bg-green-500',
  pattern: 'bg-purple-500',
  correction: 'bg-red-500',
  goal: 'bg-orange-500'
} as const;

const MEMORY_TYPE_LABELS = {
  log: 'Log',
  summary: 'Summary',
  pattern: 'Pattern',
  correction: 'Correction',
  goal: 'Goal'
} as const;

function DeleteConfirmModal({ isOpen, onClose, onConfirm, memory }: DeleteConfirmModalProps) {
  if (!isOpen || !memory) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card border border-border rounded-lg p-6 max-w-md w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Delete Memory</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Are you sure you want to delete this memory? This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-md p-3 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                'px-2 py-1 text-xs rounded-full text-white font-medium',
                MEMORY_TYPE_COLORS[memory.type]
              )}>
                {MEMORY_TYPE_LABELS[memory.type]}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(memory.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-foreground">
              {memory.summary.length > 100 
                ? memory.summary.substring(0, 100) + '...'
                : memory.summary
              }
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className={cn(
                'px-4 py-2 rounded-lg border border-border bg-background text-foreground',
                'hover:bg-accent transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
              )}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={cn(
                'px-4 py-2 rounded-lg bg-destructive text-destructive-foreground',
                'hover:bg-destructive/90 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
              )}
            >
              Delete Memory
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function MemoryViewerPanel({ isOpen, onClose, className }: MemoryViewerPanelProps) {
  const [memoryData, setMemoryData] = React.useState<MemoryResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = React.useState<string>('all');
  const [selectedType, setSelectedType] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedMemories, setExpandedMemories] = React.useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [deleteModal, setDeleteModal] = React.useState<{
    isOpen: boolean;
    memory: MemoryEntry | null;
  }>({ isOpen: false, memory: null });

  const availableAgents = React.useMemo(() => {
    if (!memoryData) return ['all'];
    const agents = new Set([memoryData.agentId]);
    return ['all', ...Array.from(agents).sort()];
  }, [memoryData]);

  const availableTypes = React.useMemo(() => {
    if (!memoryData) return ['all'];
    const types = new Set(memoryData.recentMemories?.map(m => m.type) || []);
    return ['all', ...Array.from(types).sort()];
  }, [memoryData]);

  const filteredMemories = React.useMemo(() => {
    if (!memoryData?.recentMemories) return [];
    
    let filtered = memoryData.recentMemories;
    
    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(memory => memory.type === selectedType);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(memory => 
        memory.summary.toLowerCase().includes(query) ||
        memory.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [memoryData, selectedType, searchQuery]);

  const groupedMemories = React.useMemo(() => {
    const groups: Record<string, MemoryEntry[]> = {};
    
    filteredMemories.forEach(memory => {
      const date = new Date(memory.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(memory);
    });
    
    // Sort groups by date (newest first) and memories within groups by creation time
    const sortedGroups = Object.entries(groups)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([date, memories]) => [
        date,
        memories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      ] as [string, MemoryEntry[]]);
    
    return sortedGroups;
  }, [filteredMemories]);

  const fetchMemory = React.useCallback(async () => {
    if (selectedAgent === 'all') return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getMemory(selectedAgent, undefined, 50, 0.1);
      setMemoryData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch memory');
    } finally {
      setLoading(false);
    }
  }, [selectedAgent]);

  const handleDeleteMemory = async (memory: MemoryEntry) => {
    try {
      await apiClient.deleteMemory(memory.agentId, memory.id);
      
      // Remove from local state
      setMemoryData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          recentMemories: prev.recentMemories.filter(m => m.id !== memory.id),
          stats: {
            ...prev.stats,
            totalEntries: prev.stats.totalEntries - 1,
            byType: {
              ...prev.stats.byType,
              [memory.type]: (prev.stats.byType[memory.type] || 1) - 1
            }
          }
        };
      });
      
      setDeleteModal({ isOpen: false, memory: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete memory');
    }
  };

  const toggleMemoryExpansion = (memoryId: string) => {
    setExpandedMemories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memoryId)) {
        newSet.delete(memoryId);
      } else {
        newSet.add(memoryId);
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
      minute: '2-digit'
    });
  };

  const formatDateGroup = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Fetch memory when panel opens or agent selection changes
  React.useEffect(() => {
    if (isOpen && selectedAgent !== 'all') {
      fetchMemory();
    }
  }, [isOpen, fetchMemory]);

  if (!isOpen) return null;

  return (
    <>
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
              'fixed right-0 top-0 h-full w-full max-w-4xl',
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
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Memory Viewer</h2>
                  <p className="text-sm text-muted-foreground">
                    {memoryData 
                      ? `${filteredMemories.length} memor${filteredMemories.length !== 1 ? 'ies' : 'y'}`
                      : 'Select an agent to view memories'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Refresh Button */}
                <button
                  onClick={fetchMemory}
                  disabled={loading || selectedAgent === 'all'}
                  className={cn(
                    'p-2 rounded-lg hover:bg-accent transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    (loading || selectedAgent === 'all') && 'opacity-50 cursor-not-allowed'
                  )}
                  aria-label="Refresh memory"
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
                  aria-label="Close memory panel"
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
                  <div className="p-4 space-y-4">
                    {/* Agent Selection */}
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Agent:</span>
                      <select
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        className={cn(
                          'px-3 py-1 rounded-md border border-border bg-background',
                          'text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
                        )}
                      >
                        <option value="all">Select an agent</option>
                        <option value="router">Router</option>
                        <option value="research">Research</option>
                        <option value="automation">Automation</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Memory Type Filter */}
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Type:</span>
                        <select
                          value={selectedType}
                          onChange={(e) => setSelectedType(e.target.value)}
                          className={cn(
                            'px-3 py-1 rounded-md border border-border bg-background',
                            'text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
                          )}
                        >
                          {availableTypes.map(type => (
                            <option key={type} value={type}>
                              {type === 'all' ? 'All Types' : MEMORY_TYPE_LABELS[type as keyof typeof MEMORY_TYPE_LABELS] || type}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Search Input */}
                      <div className="flex items-center gap-2 flex-1">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search memories..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className={cn(
                            'flex-1 px-3 py-1 rounded-md border border-border bg-background',
                            'text-sm text-foreground placeholder:text-muted-foreground',
                            'focus:outline-none focus:ring-2 focus:ring-ring'
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {selectedAgent === 'all' ? (
                <div className="flex flex-col items-center justify-center h-full p-6">
                  <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Select an Agent</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Choose an agent from the filter above to view its memory entries.
                  </p>
                </div>
              ) : loading ? (
                <MemoryShimmer />
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full p-6">
                  <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load memory</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">{error}</p>
                  <button
                    onClick={fetchMemory}
                    className={cn(
                      'px-4 py-2 rounded-lg bg-primary text-primary-foreground',
                      'hover:bg-primary/90 transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                    )}
                  >
                    Try Again
                  </button>
                </div>
              ) : !memoryData || filteredMemories.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6">
                  <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No memories found</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    {searchQuery || selectedType !== 'all'
                      ? 'No memories match your current filters.'
                      : 'This agent has no stored memories yet.'
                    }
                  </p>
                </div>
              ) : (
                <div className="p-6">
                  {/* Stats Section */}
                  {memoryData && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Memory Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-lg border border-border bg-card">
                          <div className="text-2xl font-bold text-foreground">
                            {memoryData.stats.totalEntries}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Entries</div>
                        </div>
                        <div className="p-4 rounded-lg border border-border bg-card">
                          <div className="text-2xl font-bold text-foreground">
                            {memoryData.averageRelevance.toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">Avg Relevance</div>
                        </div>
                        <div className="p-4 rounded-lg border border-border bg-card">
                          <div className="text-2xl font-bold text-foreground">
                            {Object.keys(memoryData.stats.byType).length}
                          </div>
                          <div className="text-sm text-muted-foreground">Memory Types</div>
                        </div>
                        <div className="p-4 rounded-lg border border-border bg-card">
                          <div className="text-2xl font-bold text-foreground">
                            {memoryData.patterns.length}
                          </div>
                          <div className="text-sm text-muted-foreground">Patterns</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Memory Entries */}
                  <div className="space-y-6">
                    {groupedMemories.map(([dateGroup, memories]) => (
                      <div key={dateGroup}>
                        {/* Date Group Header */}
                        <div className="flex items-center gap-2 mb-4">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <h4 className="text-sm font-semibold text-foreground">
                            {formatDateGroup(dateGroup)}
                          </h4>
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs text-muted-foreground">
                            {memories.length} memor{memories.length !== 1 ? 'ies' : 'y'}
                          </span>
                        </div>
                        
                        {/* Memory Cards */}
                        <div className="space-y-3 ml-6">
                          {memories.map((memory, index) => {
                            const isExpanded = expandedMemories.has(memory.id);
                            
                            return (
                              <motion.div
                                key={memory.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={cn(
                                  'rounded-lg border border-border bg-card p-4',
                                  'hover:shadow-md transition-shadow duration-200'
                                )}
                              >
                                {/* Memory Header */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      'h-8 w-8 rounded-full flex items-center justify-center',
                                      MEMORY_TYPE_COLORS[memory.type]
                                    )}>
                                      <span className="text-white text-xs font-bold">
                                        {memory.type.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-foreground">
                                          {MEMORY_TYPE_LABELS[memory.type]}
                                        </span>
                                        {memory.relevanceScore && (
                                          <div className="flex items-center gap-1">
                                            <TrendingUp className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">
                                              {(memory.relevanceScore * 100).toFixed(0)}%
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {formatTimestamp(memory.createdAt)}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    <span className={cn(
                                      'px-2 py-1 text-xs rounded-full text-white font-medium',
                                      MEMORY_TYPE_COLORS[memory.type]
                                    )}>
                                      {MEMORY_TYPE_LABELS[memory.type]}
                                    </span>
                                    <button
                                      onClick={() => setDeleteModal({ isOpen: true, memory })}
                                      className={cn(
                                        'p-1 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive',
                                        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                                      )}
                                      aria-label="Delete memory"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => toggleMemoryExpansion(memory.id)}
                                      className={cn(
                                        'p-1 rounded-md hover:bg-accent transition-colors',
                                        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                                      )}
                                      aria-label={isExpanded ? 'Collapse memory' : 'Expand memory'}
                                    >
                                      {isExpanded ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Memory Content */}
                                <div className="space-y-3">
                                  {/* Summary */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Summary
                                      </span>
                                    </div>
                                    <p className="text-sm text-foreground bg-muted/50 rounded-md p-3">
                                      {isExpanded ? memory.summary : truncateText(memory.summary)}
                                    </p>
                                  </div>

                                  {/* Tags */}
                                  {memory.tags && memory.tags.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                          Tags
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {memory.tags.map((tag, idx) => (
                                          <span
                                            key={idx}
                                            className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Metadata */}
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <div>Frequency: {memory.frequency}</div>
                                    <div>Last accessed: {formatTimestamp(memory.lastAccessed)}</div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, memory: null })}
        onConfirm={() => deleteModal.memory && handleDeleteMemory(deleteModal.memory)}
        memory={deleteModal.memory}
      />
    </>
  );
}