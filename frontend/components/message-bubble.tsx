'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bot, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimestamp } from '@/lib/utils';
import { VoicePlayer } from './voice-player';
import { AssistantAvatar } from './assistant-avatar';
import { getDisplayName, getEnhancedAgentIdentity } from '@/lib/assistant-identity.config';

export interface Message {
  id: string;
  type: 'user' | 'agent' | 'routing';
  content: string;
  timestamp: string;
  agentName?: string;
  agentId?: string;
  memoryUsed?: string[];
  isLoading?: boolean;
  routedTo?: string; // The agent this message was routed to
  isSubAgentReply?: boolean; // Whether this is a reply from a sub-agent after routing
}

interface MessageBubbleProps {
  message: Message;
  className?: string;
}

export function MessageBubble({ message, className }: MessageBubbleProps) {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.type === 'user';
  const isRouting = message.type === 'routing';
  const isSubAgentReply = message.isSubAgentReply;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  // Special styling for routing messages
  if (isRouting) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          'flex justify-center px-4 md:px-6 py-3',
          className
        )}
      >
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 border border-border/50 text-sm text-muted-foreground">
          <AssistantAvatar
            agentId="router"
            size="xs"
            status="thinking"
            animate={true}
          />
          <span>Routing to {message.routedTo ? getEnhancedAgentIdentity(message.routedTo).name : 'specialist'} agent...</span>
          <AssistantAvatar
            agentId={message.routedTo || 'router'}
            size="xs"
            status="active"
            animate={true}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        'group relative flex gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6',
        'transition-all duration-300 ease-out',
        'hover:bg-gradient-to-r',
        isUser 
          ? 'flex-row-reverse hover:from-primary/5 hover:to-primary/10' 
          : 'flex-row hover:from-accent/30 hover:to-accent/10',
        'rounded-xl border-l-4 border-transparent hover:border-primary/30',
        isSubAgentReply && 'ml-4 sm:ml-8 md:ml-12', // Indent sub-agent replies
        className
      )}
    >
      {/* Enhanced Avatar */}
      {isUser ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
          className={cn(
            'flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-2xl',
            'ring-2 ring-background transition-all duration-300 shadow-lg',
            'group-hover:ring-4 group-hover:ring-primary/20 group-hover:shadow-xl',
            'backdrop-blur-sm border border-white/10',
            'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70'
          )}
        >
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <User className="h-5 w-5 md:h-6 md:w-6" />
          </motion.div>
        </motion.div>
      ) : (
        <AssistantAvatar
          agentId={message.agentId || 'router'}
          size="md"
          status={message.isLoading ? 'thinking' : 'active'}
          animate={true}
          className="shrink-0"
        />
      )}

      {/* Enhanced Message Content */}
      <div
        className={cn(
          'min-w-0 flex-1 space-y-3',
          isUser ? 'text-right' : 'text-left'
        )}
      >
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, x: isUser ? 10 : -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'flex items-center gap-2 text-xs font-medium text-muted-foreground/80',
            isUser ? 'justify-end' : 'justify-start'
          )}
        >
          <motion.span 
            className="text-foreground/90 font-semibold"
            whileHover={{ scale: 1.05 }}
          >
            {isUser ? 'You' : (message.agentId ? getEnhancedAgentIdentity(message.agentId).name : message.agentName || 'Assistant')}
          </motion.span>
          <span className="text-muted-foreground/50">•</span>
          <span className="text-muted-foreground/70">{formatTimestamp(message.timestamp)}</span>
          {message.memoryUsed && message.memoryUsed.length > 0 && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <motion.span 
                className="text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full text-xs"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                {message.memoryUsed.length} memory
              </motion.span>
            </>
          )}
        </motion.div>

        {/* Premium Message Bubble */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
          className={cn(
            'relative rounded-2xl px-4 md:px-6 py-4 md:py-5 text-sm md:text-base leading-relaxed',
            'border shadow-lg transition-all duration-300 ease-out backdrop-blur-sm',
            'group-hover:shadow-xl group-hover:scale-[1.02] group-hover:-translate-y-1',
            'transform-gpu will-change-transform',
            isUser
              ? 'bg-gradient-to-br from-primary via-primary/95 to-primary/90 text-primary-foreground border-primary/30 ml-3 sm:ml-6 md:ml-12 shadow-primary/20'
              : 'bg-gradient-to-br from-card via-card/95 to-card/90 text-card-foreground border-border/50 mr-3 sm:mr-6 md:mr-12 group-hover:border-primary/30 shadow-black/5'
          )}
        >
          {message.isLoading ? (
            <div className="flex items-center gap-4">
              <div className="flex gap-1.5">
                <motion.div 
                  className="h-3 w-3 rounded-full bg-current shadow-lg"
                  animate={{ 
                    opacity: [0.3, 1, 0.3],
                    scale: [0.8, 1.2, 0.8],
                    y: [0, -4, 0]
                  }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
                />
                <motion.div 
                  className="h-3 w-3 rounded-full bg-current shadow-lg"
                  animate={{ 
                    opacity: [0.3, 1, 0.3],
                    scale: [0.8, 1.2, 0.8],
                    y: [0, -4, 0]
                  }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div 
                  className="h-3 w-3 rounded-full bg-current shadow-lg"
                  animate={{ 
                    opacity: [0.3, 1, 0.3],
                    scale: [0.8, 1.2, 0.8],
                    y: [0, -4, 0]
                  }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
                />
              </div>
              <motion.span 
                className="text-sm font-medium opacity-80"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                Thinking...
              </motion.span>
            </div>
          ) : (
            <motion.div 
              className="whitespace-pre-wrap break-words font-medium"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
            >
              {message.content}
            </motion.div>
          )}

          {/* Enhanced Action Buttons */}
          {!message.isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 0, scale: 1, y: 0 }}
              whileHover={{ opacity: 1 }}
              className={cn(
                'absolute -top-3 flex gap-1.5',
                'transition-all duration-300 ease-out',
                'group-hover:opacity-100',
                isUser ? '-left-3' : '-right-3'
              )}
            >
              {/* Voice Player for Agent Messages */}
              {!isUser && (
                <motion.div
                  whileHover={{ scale: 1.15, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <VoicePlayer
                    text={message.content}
                    agentId={message.agentId}
                    className="h-8 w-8 rounded-xl bg-background/95 backdrop-blur-sm border border-border/50 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-200"
                  />
                </motion.div>
              )}
              
              {/* Enhanced Copy Button */}
              <motion.button
                onClick={handleCopy}
                whileHover={{ scale: 1.15, y: -2 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400 }}
                className={cn(
                  'h-8 w-8 rounded-xl bg-background/95 backdrop-blur-sm border border-border/50',
                  'flex items-center justify-center text-muted-foreground',
                  'hover:bg-accent/80 hover:text-accent-foreground hover:border-primary/40',
                  'hover:shadow-lg hover:shadow-primary/10',
                  'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2',
                  'transform-gpu will-change-transform',
                  copied && 'bg-green-500/10 border-green-500/30 text-green-600'
                )}
                aria-label={copied ? 'Message copied' : 'Copy message to clipboard'}
                tabIndex={0}
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                      transition={{ duration: 0.2, type: "spring" }}
                    >
                      <Check className="h-4 w-4 text-green-500" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                      transition={{ duration: 0.2, type: "spring" }}
                    >
                      <Copy className="h-4 w-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}