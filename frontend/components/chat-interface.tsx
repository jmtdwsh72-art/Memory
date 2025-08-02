'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageBubble, type Message } from './message-bubble';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading?: boolean;
  className?: string;
}

export function ChatInterface({ messages, isLoading, className }: ChatInterfaceProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = React.useState(true);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (shouldAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, shouldAutoScroll]);

  // Track if user has scrolled up
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  }, []);

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden',
        className
      )}
    >
      {/* Messages Container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-md mx-auto px-6"
            >
              <div className="mb-4">
                <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <div className="h-8 w-8 rounded-full bg-primary/20" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Welcome to KenKai Assistant
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Start a conversation with your AI assistant. Choose an agent from the sidebar 
                and ask questions or request help with various tasks.
              </p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>💡 <strong>Tip:</strong> Use memory mode to maintain context across conversations</p>
                <p>🎯 <strong>Try:</strong> "Research the latest AI developments" or "Help me plan a project"</p>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="space-y-0">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                />
              ))}
            </AnimatePresence>
            
            {/* Loading message */}
            {isLoading && (
              <MessageBubble
                message={{
                  id: 'loading',
                  type: 'agent',
                  content: '',
                  timestamp: new Date().toISOString(),
                  isLoading: true,
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {!shouldAutoScroll && messages.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => {
              setShouldAutoScroll(true);
              scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
              });
            }}
            className={cn(
              'absolute bottom-4 right-4 z-10',
              'h-10 w-10 rounded-full bg-primary text-primary-foreground',
              'shadow-lg border border-primary/20',
              'flex items-center justify-center',
              'hover:scale-105 transition-transform duration-200',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
            )}
            aria-label="Scroll to bottom"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m18 15-6-6-6 6" transform="rotate(180 12 12)" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}