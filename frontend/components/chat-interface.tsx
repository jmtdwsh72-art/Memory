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
          <div className="flex h-full items-center justify-center px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center max-w-sm sm:max-w-md mx-auto"
            >
              <motion.div 
                className="mb-6"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <div className="h-16 w-16 sm:h-20 sm:w-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 flex items-center justify-center shadow-lg backdrop-blur-sm border border-primary/10">
                  <motion.div 
                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/20 shadow-inner"
                    animate={{ 
                      scale: [1, 1.05, 1],
                      opacity: [0.8, 1, 0.8]
                    }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </div>
              </motion.div>
              <motion.h3 
                className="text-xl sm:text-2xl font-bold text-foreground mb-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Welcome to Memory Agent
              </motion.h3>
              <motion.p 
                className="text-sm sm:text-base text-muted-foreground mb-8 leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Start a conversation with your AI assistant. Choose an agent from the sidebar 
                and ask questions or request help with various tasks.
              </motion.p>
              <motion.div 
                className="space-y-3 text-xs sm:text-sm text-muted-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-accent/30 backdrop-blur-sm border border-accent/20">
                  <span className="text-lg">💡</span>
                  <p><strong className="text-foreground">Tip:</strong> Use memory mode to maintain context across conversations</p>
                </div>
                <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/5 backdrop-blur-sm border border-primary/10">
                  <span className="text-lg">🎯</span>
                  <p><strong className="text-foreground">Try:</strong> "Research the latest AI developments" or "Help me plan a project"</p>
                </div>
              </motion.div>
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

      {/* Enhanced Scroll to Bottom Button */}
      <AnimatePresence>
        {!shouldAutoScroll && messages.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setShouldAutoScroll(true);
              scrollToBottom('smooth');
            }}
            className={cn(
              'absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-10',
              'h-12 w-12 sm:h-14 sm:w-14 rounded-2xl',
              'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground',
              'shadow-xl shadow-primary/25 border border-primary/20 backdrop-blur-sm',
              'flex items-center justify-center',
              'transition-all duration-300 ease-out transform-gpu will-change-transform',
              'hover:shadow-2xl hover:shadow-primary/30',
              'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background'
            )}
            aria-label="Scroll to bottom"
          >
            <motion.svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{ y: [0, 2, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <path d="m18 15-6-6-6 6" transform="rotate(180 12 12)" />
            </motion.svg>
          </motion.button>
        )}
      </AnimatePresence>
      </div>
    </ChatErrorBoundary>
  );
}