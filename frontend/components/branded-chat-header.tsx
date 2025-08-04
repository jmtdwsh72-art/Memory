'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, ArrowLeft, Brain, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { HeaderAvatar } from '@/components/assistant-avatar';
import { 
  getAssistantIdentity, 
  getDisplayName, 
  getStatusMessage,
  getEnhancedAgentIdentity,
  ASSISTANT_CONFIG 
} from '@/lib/assistant-identity.config';

type StatusType = 'thinking' | 'responding' | 'listening' | 'routing' | 'connecting' | 'idle';

interface BrandedChatHeaderProps {
  activeAgent: string;
  isLoading?: boolean;
  status?: StatusType;
  onToggleSidebar?: () => void;
  onNavigateBack?: () => void;
  className?: string;
  compact?: boolean;
}

export function BrandedChatHeader({
  activeAgent,
  isLoading = false,
  status = 'listening',
  onToggleSidebar,
  onNavigateBack,
  className,
  compact = false
}: BrandedChatHeaderProps) {
  const agentIdentity = getEnhancedAgentIdentity(activeAgent);
  const agentDisplayName = agentIdentity.name;
  const statusMessage = getStatusMessage(status);

  const headerVariants = {
    initial: { opacity: 0, y: -10 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  const statusVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.2,
        delay: 0.1
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      transition: { duration: 0.15 }
    }
  };

  if (compact) {
    return (
      <motion.header
        variants={headerVariants}
        initial="initial"
        animate="animate"
        className={cn(
          "sticky top-0 z-30 w-full border-b border-border/40",
          "bg-background/95 backdrop-blur-xl",
          className
        )}
      >
        <div className="flex h-14 items-center justify-between px-4">
          {/* Left side - Mobile menu + Avatar + Name */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-2 rounded-lg hover:bg-accent transition-colors lg:hidden"
                aria-label="Open agent sidebar"
              >
                <Menu className="h-4 w-4" />
              </button>
            )}

            <HeaderAvatar
              agentId={activeAgent}
              status={isLoading ? 'thinking' : 'active'}
              isLoading={isLoading}
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-foreground truncate">
                  {agentDisplayName}
                </h1>
                {isLoading && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap className="h-3 w-3 text-muted-foreground" />
                  </motion.div>
                )}
              </div>
              
              <AnimatePresence mode="wait">
                <motion.p
                  key={status}
                  variants={statusVariants}
                  initial="initial" 
                  animate="animate"
                  exit="exit"
                  className="text-xs text-muted-foreground truncate"
                >
                  {statusMessage}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </div>
      </motion.header>
    );
  }

  return (
    <motion.header
      variants={headerVariants}
      initial="initial"
      animate="animate"
      className={cn(
        "sticky top-0 z-30 w-full border-b border-border/40",
        "bg-background/95 backdrop-blur-xl",
        className
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-4 lg:px-6 gap-1 sm:gap-2">
        {/* Left side */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
          {/* Mobile Menu Button */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg hover:bg-accent transition-colors lg:hidden"
              aria-label="Open agent sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          {/* Back to Dashboard */}
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          )}

          {/* Brand Identity Section */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
            {/* Memory Agent Brand */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-slate-100">
                <Brain className="h-5 w-5" />
              </div>
              <div className="hidden md:block">
                <h1 className="text-lg font-semibold text-foreground">
                  {ASSISTANT_CONFIG.default.name}
                </h1>
              </div>
            </div>

            {/* Separator */}
            <div className="h-6 w-px bg-border hidden md:block" />

            {/* Current Agent */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <HeaderAvatar
                agentId={activeAgent}
                status={isLoading ? 'thinking' : 'active'}
                isLoading={isLoading}
              />
              
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {agentDisplayName}
                  </span>
                  {isLoading && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Zap className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  )}
                </div>
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={status}
                    variants={statusVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="text-xs text-muted-foreground"
                  >
                    {statusMessage}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </motion.header>
  );
}

/**
 * Status indicator component for showing agent activity
 */
interface StatusIndicatorProps {
  status: StatusType;
  isLoading?: boolean;
  className?: string;
}

export function StatusIndicator({ status, isLoading = false, className }: StatusIndicatorProps) {
  const getStatusColor = () => {
    if (isLoading) return 'text-yellow-500';
    
    switch (status) {
      case 'thinking':
      case 'responding':
        return 'text-blue-500';
      case 'listening':
        return 'text-green-500';
      case 'routing':
        return 'text-purple-500';
      case 'connecting':
        return 'text-orange-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <motion.div
      animate={{
        scale: [1, 1.2, 1],
        opacity: isLoading ? [1, 0.5, 1] : 1
      }}
      transition={{
        duration: isLoading ? 1 : 2,
        repeat: isLoading ? Infinity : 0,
        ease: "easeInOut"
      }}
      className={cn(
        "h-2 w-2 rounded-full",
        getStatusColor(),
        className
      )}
    />
  );
}