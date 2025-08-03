'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoicePlayerProps {
  text: string;
  agentId?: string;
  voiceId?: string;
  className?: string;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export function VoicePlayer({ 
  text, 
  agentId, 
  voiceId, 
  className,
  onPlayStateChange 
}: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isMuted, setIsMuted] = React.useState(false);
  
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Check global mute state from localStorage
  React.useEffect(() => {
    const muteState = localStorage.getItem('tts-muted') === 'true';
    setIsMuted(muteState);
    
    // Listen for mute state changes
    const handleMuteChange = (event: CustomEvent) => {
      setIsMuted(event.detail.muted);
    };
    
    window.addEventListener('tts-mute-change' as any, handleMuteChange);
    return () => window.removeEventListener('tts-mute-change' as any, handleMuteChange);
  }, []);

  const handlePlay = async () => {
    if (isMuted) {
      // Show visual feedback that TTS is muted
      setError('Voice output is muted');
      setTimeout(() => setError(null), 2000);
      return;
    }

    if (isPlaying && audioRef.current) {
      // Stop current playback
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      onPlayStateChange?.(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.slice(0, 300), // Limit to 300 characters
          agentId,
          voiceId
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      const data = await response.json();
      
      if (!data.success || !data.audio) {
        throw new Error('Invalid response from TTS service');
      }

      // Convert base64 to blob
      const audioBlob = base64ToBlob(data.audio, data.mimeType);
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        onPlayStateChange?.(false);
        URL.revokeObjectURL(audioUrl);
      });

      audio.addEventListener('error', () => {
        setError('Failed to play audio');
        setIsPlaying(false);
        onPlayStateChange?.(false);
        URL.revokeObjectURL(audioUrl);
      });

      await audio.play();
      setIsPlaying(true);
      onPlayStateChange?.(true);

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('TTS Error:', err);
        setError(err.message || 'Failed to generate speech');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <button
      onClick={handlePlay}
      disabled={isLoading || !text || text.length === 0}
      className={cn(
        'inline-flex items-center justify-center',
        'h-8 w-8 rounded-md',
        'transition-all duration-200',
        'hover:bg-accent/50',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isPlaying && 'bg-primary/10 text-primary',
        error && 'text-destructive',
        className
      )}
      title={
        isMuted ? 'Voice output is muted' :
        isLoading ? 'Generating speech...' :
        isPlaying ? 'Stop playback' :
        error || 'Play voice'
      }
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isMuted ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className={cn('h-4 w-4', isPlaying && 'animate-pulse')} />
      )}
    </button>
  );
}

// Global mute toggle component
export function GlobalMuteToggle({ className }: { className?: string }) {
  const [isMuted, setIsMuted] = React.useState(false);

  React.useEffect(() => {
    const muteState = localStorage.getItem('tts-muted') === 'true';
    setIsMuted(muteState);
  }, []);

  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    localStorage.setItem('tts-muted', String(newMuteState));
    
    // Dispatch custom event to notify all VoicePlayer components
    window.dispatchEvent(new CustomEvent('tts-mute-change', { 
      detail: { muted: newMuteState } 
    }));
  };

  return (
    <motion.button
      onClick={toggleMute}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5',
        'rounded-md text-sm font-medium',
        'transition-all duration-300 ease-out',
        'hover:bg-accent/50 hover:shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'transform-gpu will-change-transform',
        isMuted && 'text-muted-foreground',
        className
      )}
      title={isMuted ? 'Unmute voice output' : 'Mute voice output'}
    >
      <motion.div
        animate={isMuted ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5 }}
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </motion.div>
      <motion.span
        key={isMuted ? 'muted' : 'unmuted'}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {isMuted ? 'Voice Muted' : 'Voice On'}
      </motion.span>
    </motion.button>
  );
}