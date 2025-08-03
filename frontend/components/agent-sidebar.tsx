'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { 
  Brain,
  ChevronRight,
  Circle,
  CheckCircle,
} from '@/lib/icons';
import { iconComponents, getIconComponent } from '@/lib/icons';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'inactive' | 'busy';
  lastActivity?: string;
  color?: string;
}

interface AgentSidebarProps {
  activeAgent: string;
  onAgentSelect: (agentId: string) => void;
  className?: string;
}

function getIconComponentElement(iconName: string): React.ReactNode {
  const IconComponent = getIconComponent(iconName);
  return <IconComponent className="h-5 w-5" />;
}

function StatusIndicator({ status }: { status: Agent['status'] }) {
  const statusConfig = {
    active: { color: 'text-green-500', icon: CheckCircle },
    inactive: { color: 'text-gray-400', icon: Circle },
    busy: { color: 'text-yellow-500', icon: Circle },
  };

  const { color, icon: Icon } = statusConfig[status];

  return (
    <motion.div 
      className={cn('flex items-center gap-1', color)}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
    >
      <motion.div
        animate={status === 'active' ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Icon className="h-3 w-3" />
      </motion.div>
      <span className="text-xs capitalize font-medium">{status}</span>
    </motion.div>
  );
}

export function AgentSidebar({ activeAgent, onAgentSelect, className }: AgentSidebarProps) {
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch('/api/agents');
        const data = await response.json();
        
        const agentList = data.agents
          .filter((agent: any) => agent.id !== 'welcome') // Exclude Welcome Agent from sidebar
          .map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            description: agent.description,
            icon: getIconComponentElement(agent.icon),
            status: agent.status,
            color: agent.color
          }));
        
        setAgents(agentList);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
        // Fallback to default agents if API fails
        setAgents([
          {
            id: 'router',
            name: 'General Chat',
            description: 'General conversation and task routing',
            icon: getIconComponentElement('MessageCircle'),
            status: 'active',
          },
          {
            id: 'research',
            name: 'Research Agent',
            description: 'Deep research and analysis tasks',
            icon: getIconComponentElement('Search'),
            status: 'active',
          },
          {
            id: 'automation',
            name: 'Automation Agent',
            description: 'Prompt writing, scripting, and idea generation',
            icon: getIconComponentElement('Zap'),
            status: 'active',
          },
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchAgents();
  }, []);

  if (loading) {
    return (
      <div className={cn(
        'flex h-full w-80 flex-col border-r border-border bg-card',
        'md:w-64 lg:w-80',
        className
      )}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
            <span className="font-semibold text-card-foreground">Loading...</span>
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-3 p-3">
                  <div className="h-10 w-10 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 rounded bg-muted" />
                    <div className="h-3 w-32 rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        'flex h-full w-80 flex-col border-r border-border bg-card',
        'md:w-64 lg:w-80',
        className
      )}
      role="navigation"
      aria-label="Agent selection sidebar"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <span className="font-semibold text-card-foreground">Agents</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {agents.filter(a => a.status === 'active').length} active
        </div>
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1 p-2">
          {agents.map((agent, index) => (
            <motion.button
              key={agent.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onAgentSelect(agent.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onAgentSelect(agent.id);
                }
              }}
              className={cn(
                'group relative flex w-full items-start gap-3 rounded-lg p-3 text-left',
                'transition-all duration-300 ease-out',
                'hover:bg-accent/50 hover:shadow-md hover:border-primary/10',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                'transform-gpu will-change-transform',
                activeAgent === agent.id
                  ? 'bg-primary/10 ring-1 ring-primary/20 shadow-md border border-primary/20'
                  : 'hover:shadow-sm border border-transparent'
              )}
              aria-pressed={activeAgent === agent.id}
              aria-label={`Select ${agent.name} agent. ${agent.description}. Status: ${agent.status}`}
              role="button"
              tabIndex={0}
            >
              {/* Active indicator */}
              {activeAgent === agent.id && (
                <motion.div
                  layoutId="active-agent"
                  className="absolute left-0 top-3 h-6 w-1 rounded-r-full bg-primary"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}

              {/* Icon */}
              <motion.div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  'border transition-all duration-300 ease-out',
                  'group-hover:shadow-sm',
                  activeAgent === agent.id
                    ? 'border-primary/30 bg-primary/15 text-primary shadow-sm'
                    : 'border-border bg-background text-muted-foreground group-hover:border-primary/20 group-hover:bg-primary/5 group-hover:text-primary'
                )}
                whileHover={activeAgent !== agent.id ? { 
                  scale: 1.05,
                  rotate: 2
                } : {}}
                transition={{ duration: 0.2 }}
              >
                {agent.icon}
              </motion.div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3
                    className={cn(
                      'font-medium text-sm',
                      activeAgent === agent.id
                        ? 'text-primary'
                        : 'text-card-foreground group-hover:text-primary'
                    )}
                  >
                    {agent.name}
                  </h3>
                  <motion.div
                    animate={{
                      rotate: activeAgent === agent.id ? 90 : 0
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 transition-colors duration-200',
                        activeAgent === agent.id
                          ? 'text-primary'
                          : 'text-muted-foreground group-hover:text-primary'
                      )}
                    />
                  </motion.div>
                </div>
                
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {agent.description}
                </p>
                
                <div className="mt-2 flex items-center justify-between">
                  <StatusIndicator status={agent.status} />
                  {agent.lastActivity && (
                    <span className="text-xs text-muted-foreground">
                      {agent.lastActivity}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Memory Usage</span>
            <span>24MB / 100MB</span>
          </div>
          <div className="mt-2 h-1 rounded-full bg-muted">
            <div className="h-1 w-1/4 rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </aside>
  );
}