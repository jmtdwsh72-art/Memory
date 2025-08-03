'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageBubble, type Message } from './message-bubble';
import { ChatErrorBoundary } from './error-boundary';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading?: boolean;
  className?: string;
}

export function ChatInterface({ messages, isLoading, className }: ChatInterfaceProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = React.useState(true);
  const [isScrolling, setIsScrolling] = React.useState(false);
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout>();

  // Smooth auto-scroll to bottom when new messages arrive
  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (shouldAutoScroll && messages.length > 0) {
      // Small delay to ensure DOM has updated
      const timer = setTimeout(() => {
        scrollToBottom('smooth');
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messages, shouldAutoScroll, scrollToBottom]);

  // Track if user has scrolled up and handle scroll state
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 80;
    
    setShouldAutoScroll(isNearBottom);
    setIsScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set scrolling to false after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ChatErrorBoundary>
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
        data-chat-container
        className={cn(
          "flex-1 overflow-y-auto scroll-smooth",
          "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
          "hover:scrollbar-thumb-muted-foreground/20"
        )}
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
          <div className="min-h-full flex flex-col justify-end">
            <div className="space-y-0 py-4">
              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0, 
                      scale: 1,
                      transition: {
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                        delay: index === messages.length - 1 ? 0.1 : 0
                      }
                    }}
                    exit={{ 
                      opacity: 0, 
                      y: -10, 
                      scale: 0.95,
                      transition: { duration: 0.2 }
                    }}
                  >
                    <MessageBubble
                      message={message}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Loading message */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <MessageBubble
                    message={{
                      id: 'loading',
                      type: 'agent',
                      content: '',
                      timestamp: new Date().toISOString(),
                      isLoading: true,
                    }}
                  />
                </motion.div>
              )}
            </div>
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
              scrollToBottom('smooth');
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
    </ChatErrorBoundary>
  );
}