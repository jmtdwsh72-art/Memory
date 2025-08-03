'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceRecorder } from './voice-recorder';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type your message...",
  className 
}: ChatInputProps) {
  const [message, setMessage] = React.useState('');
  const [isFocused, setIsFocused] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTranscript = (transcript: string) => {
    setMessage(transcript);
    // Auto-focus the textarea after transcript is received
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(transcript.length, transcript.length);
      }
    }, 100);
  };

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <div className={cn('border-t border-border bg-background/95 backdrop-blur', className)}>
      <div className="mx-auto max-w-4xl p-3 md:p-4">
        <form onSubmit={handleSubmit} className="relative">
          <div
            className={cn(
              'relative flex items-end gap-1 md:gap-2 rounded-2xl border transition-all duration-200',
              'bg-background shadow-sm',
              isFocused
                ? 'border-primary/50 shadow-md ring-1 ring-primary/20'
                : 'border-border hover:border-primary/30'
            )}
          >
            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                disabled={disabled}
                rows={1}
                data-chat-input
                className={cn(
                  'w-full resize-none rounded-2xl bg-transparent px-3 md:px-4 py-3 pr-8 md:pr-12',
                  'text-sm placeholder:text-muted-foreground',
                  'focus:outline-none disabled:opacity-50',
                  'max-h-24 md:max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-border'
                )}
                style={{ minHeight: '44px' }}
              />

              {/* Character count */}
              <AnimatePresence>
                {message.length > 800 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute bottom-1 right-12 text-xs text-muted-foreground"
                  >
                    {message.length}/1000
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Voice Recorder */}
            <VoiceRecorder
              onTranscript={handleTranscript}
              disabled={disabled}
              maxDuration={20}
            />

            {/* Send Button */}
            <motion.button
              type="submit"
              disabled={!canSend}
              whileHover={canSend ? { scale: 1.05 } : {}}
              whileTap={canSend ? { scale: 0.95 } : {}}
              className={cn(
                'flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full mr-0.5 md:mr-1',
                'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring',
                'disabled:opacity-50 disabled:cursor-not-allowed transform-gpu will-change-transform',
                canSend
                  ? 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground'
              )}
              aria-label="Send message"
            >
              <AnimatePresence mode="wait">
                {disabled ? (
                  <motion.div
                    key="loading"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                  >
                    <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="send"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                  >
                    <Send className="h-3 w-3 md:h-4 md:w-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

        </form>

        {/* Shortcut hints */}
        <div className="mt-2 hidden sm:flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>Press <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> to send</span>
          <span>•</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded">Shift + Enter</kbd> for new line</span>
        </div>
      </div>
    </div>
  );
}