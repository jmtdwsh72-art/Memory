'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bot, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimestamp } from '@/lib/utils';
import { VoicePlayer } from './voice-player';

export interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: string;
  agentName?: string;
  agentId?: string;
  memoryUsed?: string[];
  isLoading?: boolean;
}

interface MessageBubbleProps {
  message: Message;
  className?: string;
}

export function MessageBubble({ message, className }: MessageBubbleProps) {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.type === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  return (
    <div
      className={cn(
        'group flex gap-3 px-4 py-3 md:py-4',
        'transition-all duration-200 ease-out',
        'hover:bg-accent/30',
        isUser ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      {/* Avatar */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          'ring-2 ring-background transition-all duration-200',
          'group-hover:ring-primary/20',
          isUser
            ? 'bg-primary text-primary-foreground group-hover:bg-primary/90'
            : 'bg-secondary text-secondary-foreground group-hover:bg-secondary/80'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </motion.div>

      {/* Message Content */}
      <div
        className={cn(
          'min-w-0 flex-1 space-y-2',
          isUser ? 'text-right' : 'text-left'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-2 text-xs text-muted-foreground',
            isUser ? 'justify-end' : 'justify-start'
          )}
        >
          <span className="font-medium">
            {isUser ? 'You' : message.agentName || 'Assistant'}
          </span>
          <span>•</span>
          <span>{formatTimestamp(message.timestamp)}</span>
          {message.memoryUsed && message.memoryUsed.length > 0 && (
            <>
              <span>•</span>
              <span className="text-primary">
                {message.memoryUsed.length} memory
              </span>
            </>
          )}
        </div>

        {/* Bubble */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className={cn(
            'relative rounded-2xl px-4 py-3 text-sm',
            'border shadow-sm transition-all duration-300 ease-out',
            'group-hover:shadow-lg group-hover:scale-[1.01]',
            'transform-gpu will-change-transform',
            isUser
              ? 'bg-primary text-primary-foreground border-primary/20 ml-8 md:ml-12'
              : 'bg-card text-card-foreground border-border mr-8 md:mr-12 group-hover:border-primary/20'
          )}
        >
          {message.isLoading ? (
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <motion.div 
                  className="h-2 w-2 rounded-full bg-current"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                />
                <motion.div 
                  className="h-2 w-2 rounded-full bg-current"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div 
                  className="h-2 w-2 rounded-full bg-current"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                />
              </div>
              <motion.span 
                className="text-xs opacity-70"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Thinking...
              </motion.span>
            </div>
          ) : (
            <motion.div 
              className="whitespace-pre-wrap break-words"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {message.content}
            </motion.div>
          )}

          {/* Action Buttons */}
          {!message.isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0, scale: 1 }}
              whileHover={{ opacity: 1 }}
              className={cn(
                'absolute -top-2 flex gap-1',
                'transition-all duration-300 ease-out',
                'group-hover:opacity-100',
                isUser ? '-left-2' : '-right-2'
              )}
            >
              {/* Voice Player for Agent Messages */}
              {!isUser && (
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <VoicePlayer
                    text={message.content}
                    agentId={message.agentId}
                    className="h-6 w-6 rounded-full bg-background border border-border hover:border-primary/30 hover:shadow-md"
                  />
                </motion.div>
              )}
              
              {/* Copy Button */}
              <motion.button
                onClick={handleCopy}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'h-6 w-6 rounded-full bg-background border border-border',
                  'flex items-center justify-center text-muted-foreground',
                  'hover:bg-accent hover:text-accent-foreground hover:border-primary/30',
                  'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                  'transform-gpu will-change-transform'
                )}
                aria-label={copied ? 'Message copied' : 'Copy message to clipboard'}
                tabIndex={0}
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Check className="h-3 w-3 text-green-500" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Copy className="h-3 w-3" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}