'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageBubble, type Message } from './message-bubble';
import { Smile, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { completeOnboarding } from '@/lib/onboarding';
import { ChatInput } from './chat-input';

interface OnboardingInterfaceProps {
  onComplete: () => void;
  onSendMessage: (message: string) => void;
  messages: Message[];
  isLoading: boolean;
  className?: string;
}

export function OnboardingInterface({ 
  onComplete, 
  onSendMessage, 
  messages, 
  isLoading, 
  className 
}: OnboardingInterfaceProps) {
  const [showExploreButton, setShowExploreButton] = React.useState(false);
  
  // Check if the latest message indicates we should show the explore button
  React.useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.type === 'agent') {
      // Simple check for completion keywords in the message
      const content = lastMessage.content.toLowerCase();
      if (content.includes('ready to explore') || content.includes('explore agents') || content.includes('start your memory agent journey')) {
        setShowExploreButton(true);
      }
    }
  }, [messages]);

  const handleExplore = () => {
    completeOnboarding();
    onComplete();
  };

  const scrollToBottom = () => {
    const container = document.getElementById('onboarding-messages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-start welcome message if no messages
  React.useEffect(() => {
    if (messages.length === 0) {
      setTimeout(() => {
        onSendMessage('welcome');
      }, 1000);
    }
  }, [messages.length, onSendMessage]);

  return (
    <div className={cn('flex flex-col h-full bg-gradient-to-br from-sky-50/50 to-blue-50/50 dark:from-sky-950/20 dark:to-blue-950/20', className)}>
      {/* Welcome Header */}
      <motion.div 
        className="flex items-center justify-center p-6 border-b border-border/50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/10 border border-sky-200 dark:border-sky-800"
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 2, -2, 0]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Smile className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          </motion.div>
          <div>
            <h1 className="text-xl font-semibold text-sky-900 dark:text-sky-100">
              Welcome to Memory Agent
            </h1>
            <p className="text-sm text-sky-600 dark:text-sky-400">
              Let's get you started with your AI assistant
            </p>
          </div>
        </div>
      </motion.div>

      {/* Messages Container */}
      <div 
        id="onboarding-messages"
        className="flex-1 overflow-y-auto scroll-smooth"
        role="main"
        aria-label="Onboarding conversation"
      >
        <div className="max-w-4xl mx-auto px-4 py-6">
          <AnimatePresence>
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
                    stiffness: 400,
                    damping: 25,
                    delay: index === messages.length - 1 ? 0.2 : 0
                  }
                }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-4"
              >
                <MessageBubble 
                  message={message} 
                  className="hover:bg-sky-50/50 dark:hover:bg-sky-950/30 transition-colors duration-200"
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 px-4 py-4"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 border border-sky-200 dark:border-sky-800">
                <Smile className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <motion.div 
                    className="h-2 w-2 rounded-full bg-sky-500"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div 
                    className="h-2 w-2 rounded-full bg-sky-500"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div 
                    className="h-2 w-2 rounded-full bg-sky-500"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
                <motion.span 
                  className="text-sm text-sky-600 dark:text-sky-400"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Preparing your welcome...
                </motion.span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <AnimatePresence>
            {showExploreButton ? (
              <motion.div 
                className="flex flex-col gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Explore Button */}
                <motion.button
                  onClick={handleExplore}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'w-full flex items-center justify-center gap-3 px-6 py-4',
                    'bg-gradient-to-r from-sky-500 to-blue-500',
                    'text-white font-medium rounded-xl',
                    'shadow-lg hover:shadow-xl transition-all duration-300',
                    'border border-sky-300 dark:border-sky-700',
                    'hover:from-sky-600 hover:to-blue-600',
                    'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2'
                  )}
                >
                  <Sparkles className="h-5 w-5" />
                  <span>Explore Agents</span>
                  <ArrowRight className="h-5 w-5" />
                </motion.button>

                {/* Chat input for more questions */}
                <ChatInput
                  onSendMessage={onSendMessage}
                  disabled={isLoading}
                  placeholder="Ask me anything else about Memory Agent..."
                  className="border-sky-200 dark:border-sky-800 focus-within:border-sky-400 dark:focus-within:border-sky-600"
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ChatInput
                  onSendMessage={onSendMessage}
                  disabled={isLoading}
                  placeholder="Ask me about Memory Agent features..."
                  className="border-sky-200 dark:border-sky-800 focus-within:border-sky-400 dark:focus-within:border-sky-600"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}