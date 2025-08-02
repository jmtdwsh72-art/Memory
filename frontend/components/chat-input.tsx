'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [isRecording, setIsRecording] = React.useState(false);
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

  const handleVoiceToggle = () => {
    setIsRecording(!isRecording);
    // TODO: Implement ElevenLabs integration
    console.log('Voice recording:', !isRecording);
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
      <div className="mx-auto max-w-4xl p-4">
        <form onSubmit={handleSubmit} className="relative">
          <div
            className={cn(
              'relative flex items-end gap-2 rounded-2xl border transition-all duration-200',
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
                className={cn(
                  'w-full resize-none rounded-2xl bg-transparent px-4 py-3 pr-12',
                  'text-sm placeholder:text-muted-foreground',
                  'focus:outline-none disabled:opacity-50',
                  'max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-border'
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

            {/* Voice Button */}
            <button
              type="button"
              onClick={handleVoiceToggle}
              disabled={disabled}
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isRecording
                  ? 'bg-red-500 text-white shadow-lg hover:bg-red-600'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
            >
              <AnimatePresence mode="wait">
                {isRecording ? (
                  <motion.div
                    key="recording"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                  >
                    <MicOff className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="not-recording"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                  >
                    <Mic className="h-4 w-4" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Recording indicator */}
              {isRecording && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-red-300"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!canSend}
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full mr-1',
                'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                canSend
                  ? 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:scale-105'
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
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="send"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Send className="h-4 w-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Voice Recording Feedback */}
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute -top-12 left-1/2 transform -translate-x-1/2"
              >
                <div className="flex items-center gap-2 rounded-full bg-red-500 px-3 py-1 text-xs text-white shadow-lg">
                  <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  Recording... (ElevenLabs integration coming soon)
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Shortcut hints */}
        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>Press <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> to send</span>
          <span>•</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded">Shift + Enter</kbd> for new line</span>
        </div>
      </div>
    </div>
  );
}