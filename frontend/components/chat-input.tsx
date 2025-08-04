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
    <div className={cn('bg-transparent', className)}>
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <form onSubmit={handleSubmit} className="relative">
          <div
            className={cn(
              'relative flex items-end gap-2 md:gap-3 rounded-2xl border transition-all duration-300',
              'bg-background/80 backdrop-blur-xl shadow-lg',
              isFocused
                ? 'border-primary/60 shadow-xl ring-2 ring-primary/20 scale-[1.02]'
                : 'border-border/40 hover:border-primary/40 hover:shadow-lg',
              'hover:scale-[1.01] transform-gpu will-change-transform'
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
                  'w-full resize-none rounded-2xl bg-transparent px-4 md:px-5 py-4 pr-12 md:pr-16',
                  'text-sm md:text-base placeholder:text-muted-foreground/70',
                  'focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
                  'max-h-32 md:max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-border/20 scrollbar-track-transparent',
                  'transition-all duration-200 ease-out'
                )}
                style={{ minHeight: '52px' }}
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

            {/* Enhanced Send Button */}
            <motion.button
              type="submit"
              disabled={!canSend}
              whileHover={canSend ? { scale: 1.08, rotate: 15 } : {}}
              whileTap={canSend ? { scale: 0.92 } : {}}
              className={cn(
                'relative flex h-11 w-11 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-full mr-1',
                'transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'disabled:cursor-not-allowed transform-gpu will-change-transform',
                'shadow-lg hover:shadow-xl',
                canSend
                  ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70'
                  : 'bg-muted/50 text-muted-foreground/50 shadow-sm',
                'backdrop-blur-sm border border-white/10'
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

        {/* Enhanced Shortcut Hints */}
        <div className="mt-3 hidden sm:flex items-center justify-center gap-6 text-xs text-muted-foreground/80">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted/50 rounded-md font-mono text-xs border border-border/30 shadow-sm">
              Enter
            </kbd>
            <span>to send</span>
          </div>
          <div className="w-px h-3 bg-border/30" />
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted/50 rounded-md font-mono text-xs border border-border/30 shadow-sm">
              Shift + Enter
            </kbd>
            <span>new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}