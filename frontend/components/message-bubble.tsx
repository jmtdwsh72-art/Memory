'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimestamp } from '@/lib/utils';

export interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: string;
  agentName?: string;
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
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ 
        type: 'spring', 
        stiffness: 300, 
        damping: 30,
        opacity: { duration: 0.2 }
      }}
      className={cn(
        'group flex gap-3 px-4 py-4',
        isUser ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          'ring-2 ring-background',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

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
        <div
          className={cn(
            'relative rounded-2xl px-4 py-3 text-sm',
            'border shadow-sm transition-all duration-200',
            'group-hover:shadow-md',
            isUser
              ? 'bg-primary text-primary-foreground border-primary/20 ml-12'
              : 'bg-card text-card-foreground border-border mr-12'
          )}
        >
          {message.isLoading ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-current animate-pulse" />
                <div 
                  className="h-2 w-2 rounded-full bg-current animate-pulse" 
                  style={{ animationDelay: '0.2s' }}
                />
                <div 
                  className="h-2 w-2 rounded-full bg-current animate-pulse"
                  style={{ animationDelay: '0.4s' }}
                />
              </div>
              <span className="text-xs opacity-70">Thinking...</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}

          {/* Copy Button */}
          {!message.isLoading && (
            <button
              onClick={handleCopy}
              className={cn(
                'absolute -top-2 opacity-0 group-hover:opacity-100',
                'h-6 w-6 rounded-full bg-background border border-border',
                'flex items-center justify-center text-muted-foreground',
                'hover:bg-accent hover:text-accent-foreground',
                'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring',
                isUser ? '-left-2' : '-right-2'
              )}
              aria-label="Copy message"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}