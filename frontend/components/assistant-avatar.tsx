'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getAssistantIdentity, getAgentIcon, getEnhancedAgentIdentity } from '@/lib/assistant-identity.config';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'active' | 'thinking' | 'responding' | 'offline';

interface AssistantAvatarProps {
  agentId: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  showStatus?: boolean;
  className?: string;
  animate?: boolean;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8', 
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16'
};

const iconSizeClasses: Record<AvatarSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5', 
  lg: 'h-6 w-6',
  xl: 'h-8 w-8'
};

const statusIndicatorSizes: Record<AvatarSize, string> = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-4 w-4'
};

const statusColors: Record<AvatarStatus, string> = {
  active: 'bg-green-500',
  thinking: 'bg-yellow-500',
  responding: 'bg-blue-500', 
  offline: 'bg-gray-400'
};

export function AssistantAvatar({ 
  agentId, 
  size = 'md', 
  status = 'active',
  showStatus = false,
  className,
  animate = true
}: AssistantAvatarProps) {
  const identity = getEnhancedAgentIdentity(agentId);
  const IconComponent = getAgentIcon(identity.icon || agentId);

  const avatarVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    },
    exit: { scale: 0.8, opacity: 0 }
  };

  const pulseVariants = {
    active: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    thinking: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    responding: {
      rotate: [0, 360],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      <motion.div
        variants={animate ? avatarVariants : undefined}
        initial={animate ? "initial" : undefined}
        animate={animate ? "animate" : undefined}
        exit={animate ? "exit" : undefined}
        className={cn(
          "flex items-center justify-center rounded-2xl",
          "border-2 border-white/20 shadow-lg backdrop-blur-sm",
          "bg-gradient-to-br transition-all duration-300",
          sizeClasses[size],
          // Use the agent's color scheme for gradient - dynamically generate colors
          `from-${identity.color}-600 to-${identity.color}-800`,
          `dark:from-${identity.color}-500 dark:to-${identity.color}-700`
        )}
      >
        <motion.div
          variants={animate && (status === 'active' || status === 'thinking' || status === 'responding') ? pulseVariants : undefined}
          animate={animate ? status : undefined}
          className={cn(
            "flex items-center justify-center",
            "text-white" // Use white text for better contrast on colored backgrounds
          )}
        >
          <IconComponent className={iconSizeClasses[size]} />
        </motion.div>
      </motion.div>

      {/* Status Indicator */}
      <AnimatePresence>
        {showStatus && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={cn(
              "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white shadow-sm",
              statusIndicatorSizes[size],
              statusColors[status]
            )}
          >
            {(status === 'thinking' || status === 'responding') && (
              <motion.div
                animate={{
                  opacity: [1, 0.5, 1]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="h-full w-full rounded-full bg-current"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Typing indicator avatar for when agents are responding
 */
export function TypingAvatar({ agentId, size = 'md' }: { agentId: string; size?: AvatarSize }) {
  return (
    <AssistantAvatar
      agentId={agentId}
      size={size}
      status="responding"
      showStatus={false}
      animate={true}
    />
  );
}

/**
 * Agent selector avatar that shows which agent is active
 */
interface AgentSelectorAvatarProps {
  agentId: string;
  isActive?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
  size?: AvatarSize;
}

export function AgentSelectorAvatar({ 
  agentId, 
  isActive = false, 
  isLoading = false,
  onClick,
  size = 'md'
}: AgentSelectorAvatarProps) {
  const identity = getEnhancedAgentIdentity(agentId);
  
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative rounded-2xl p-1 transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        isActive ? "ring-2 ring-offset-2" : "hover:ring-1 hover:ring-offset-1",
        "focus:ring-slate-400 ring-slate-300"
      )}
    >
      <AssistantAvatar
        agentId={agentId}
        size={size}
        status={isLoading ? 'thinking' : (isActive ? 'active' : 'offline')}
        showStatus={true}
        animate={true}
      />
      
      {/* Agent name tooltip */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="bg-slate-900 text-slate-100 text-xs px-2 py-1 rounded whitespace-nowrap">
          {identity.name}
        </div>
      </div>
    </motion.button>
  );
}

/**
 * Header avatar that shows current agent with smooth transitions
 */
interface HeaderAvatarProps {
  agentId: string;  
  status?: AvatarStatus;
  isLoading?: boolean;
}

export function HeaderAvatar({ agentId, status = 'active', isLoading = false }: HeaderAvatarProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={agentId}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <AssistantAvatar
          agentId={agentId}
          size="lg"
          status={isLoading ? 'thinking' : status}
          showStatus={true}
          animate={true}
        />
      </motion.div>
    </AnimatePresence>
  );
}