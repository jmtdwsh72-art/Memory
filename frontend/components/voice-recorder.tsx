'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Square, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RecordingState = 'idle' | 'recording' | 'transcribing' | 'error';

interface VoiceRecorderProps {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
  maxDuration?: number; // in seconds, default 20
  className?: string;
}

interface RecordingSession {
  mediaRecorder: MediaRecorder | null;
  stream: MediaStream | null;
  chunks: Blob[];
}

export function VoiceRecorder({ 
  onTranscript, 
  disabled = false,
  maxDuration = 20,
  className 
}: VoiceRecorderProps) {
  const [state, setState] = React.useState<RecordingState>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const [duration, setDuration] = React.useState(0);
  const [permissionDenied, setPermissionDenied] = React.useState(false);
  
  const sessionRef = React.useRef<RecordingSession>({
    mediaRecorder: null,
    stream: null,
    chunks: []
  });
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const durationTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Check if browser supports recording
  const isSupported = React.useMemo(() => {
    return typeof navigator !== 'undefined' && 
           typeof navigator.mediaDevices !== 'undefined' &&
           typeof MediaRecorder !== 'undefined';
  }, []);

  const cleanup = React.useCallback(() => {
    const session = sessionRef.current;
    
    if (session.mediaRecorder) {
      session.mediaRecorder.stop();
      session.mediaRecorder = null;
    }
    
    if (session.stream) {
      session.stream.getTracks().forEach(track => track.stop());
      session.stream = null;
    }
    
    session.chunks = [];
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    
    setDuration(0);
  }, []);

  const requestMicPermission = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      setPermissionDenied(false);
      return stream;
    } catch (err: any) {
      console.error('Microphone permission error:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError('Microphone permission denied. Please allow access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError('Failed to access microphone. Please check your device settings.');
      }
      
      return null;
    }
  };

  const startRecording = async () => {
    if (!isSupported) {
      setError('Voice recording is not supported in this browser.');
      return;
    }

    setError(null);
    setState('recording');
    
    try {
      const stream = await requestMicPermission();
      if (!stream) {
        setState('idle');
        return;
      }

      const session = sessionRef.current;
      session.stream = stream;
      session.chunks = [];

      // Determine supported MIME type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      }

      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 64000
      });
      session.mediaRecorder = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          session.chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await processRecording();
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error);
        setError('Recording failed. Please try again.');
        setState('idle');
        cleanup();
      };

      mediaRecorder.start(100); // Collect data every 100ms
      
      // Start duration timer
      durationTimerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Auto-stop after max duration
      timerRef.current = setTimeout(() => {
        stopRecording();
      }, maxDuration * 1000);

    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording. Please try again.');
      setState('idle');
      cleanup();
    }
  };

  const stopRecording = () => {
    const session = sessionRef.current;
    if (session.mediaRecorder && session.mediaRecorder.state === 'recording') {
      session.mediaRecorder.stop();
    }
  };

  const processRecording = async () => {
    setState('transcribing');
    
    try {
      const session = sessionRef.current;
      if (session.chunks.length === 0) {
        throw new Error('No audio data recorded');
      }

      // Create blob from recorded chunks
      const mimeType = session.mediaRecorder?.mimeType || 'audio/webm';
      const audioBlob = new Blob(session.chunks, { type: mimeType });
      
      // Convert to base64
      const base64Audio = await blobToBase64(audioBlob);
      
      // Send to transcription API
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType: mimeType.split(';')[0], // Remove codec info
          language: 'en' // Could be made configurable
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Transcription failed');
      }

      const data = await response.json();
      
      if (!data.success || !data.transcript) {
        throw new Error('Empty transcript received');
      }

      // Call callback with transcript
      onTranscript(data.transcript);
      setState('idle');
      
    } catch (err: any) {
      console.error('Transcription error:', err);
      setError(err.message || 'Failed to transcribe audio. Please try again.');
      setState('error');
      
      // Auto-clear error after 3 seconds
      setTimeout(() => {
        if (state === 'error') {
          setState('idle');
          setError(null);
        }
      }, 3000);
    } finally {
      cleanup();
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleClick = () => {
    if (disabled) return;
    
    if (state === 'recording') {
      stopRecording();
    } else if (state === 'idle' || state === 'error') {
      setError(null);
      startRecording();
    }
  };

  // Handle escape key to cancel recording
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && state === 'recording') {
        setState('idle');
        cleanup();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [state, cleanup]);

  // Cleanup on unmount
  React.useEffect(() => {
    return cleanup;
  }, [cleanup]);

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <MicOff className="h-4 w-4" />
        <span>Voice input not supported</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1 md:gap-2', className)}>
      <motion.button
        onClick={handleClick}
        disabled={disabled || state === 'transcribing'}
        whileHover={{ scale: state === 'idle' ? 1.05 : 1 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'relative flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full',
          'transition-all duration-200 transform-gpu will-change-transform',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          state === 'idle' && 'bg-muted hover:bg-accent text-muted-foreground hover:text-foreground',
          state === 'recording' && 'bg-red-500 hover:bg-red-600 text-white',
          state === 'transcribing' && 'bg-blue-500 text-white',
          state === 'error' && 'bg-red-500 text-white',
          permissionDenied && 'bg-orange-500 text-white'
        )}
        title={
          permissionDenied ? 'Microphone permission denied' :
          state === 'recording' ? `Recording... ${duration}s (click to stop)` :
          state === 'transcribing' ? 'Transcribing audio...' :
          error || 'Click to start voice recording'
        }
      >
        {state === 'transcribing' ? (
          <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
        ) : state === 'error' || permissionDenied ? (
          <AlertCircle className="h-3 w-3 md:h-4 md:w-4" />
        ) : state === 'recording' ? (
          <motion.div
            animate={{ scale: [1, 0.8, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Square className="h-2 w-2 md:h-3 md:w-3" />
          </motion.div>
        ) : (
          <Mic className="h-3 w-3 md:h-4 md:w-4" />
        )}
        
        {/* Recording indicator ring */}
        {state === 'recording' && (
          <motion.div 
            className="absolute inset-0 rounded-full border-2 border-red-300"
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [1, 0, 1]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </motion.button>
      
      {/* Duration display */}
      {state === 'recording' && (
        <motion.span 
          className="text-xs md:text-sm text-muted-foreground min-w-[2ch] md:min-w-[3ch] font-mono"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {duration}s
        </motion.span>
      )}
      
      {/* Error message */}
      {error && state !== 'recording' && (
        <motion.span 
          className="text-xs md:text-sm text-red-500 max-w-[120px] md:max-w-[200px] truncate"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
        >
          {error}
        </motion.span>
      )}
    </div>
  );
}