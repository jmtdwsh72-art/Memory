'use client';

import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'relative rounded-lg bg-gradient-to-br from-primary to-primary/80 p-1.5',
          'shadow-lg ring-1 ring-primary/20',
          sizeClasses[size]
        )}
      >
        <div className="relative h-full w-full">
          <div className="absolute inset-0 rounded-md bg-white/20" />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="relative z-10 h-full w-full text-primary-foreground"
          >
            <path
              d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="currentColor"
              fillOpacity="0.1"
            />
            <path
              d="M9 12l2 2 4-4"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span
            className={cn(
              'font-bold tracking-tight text-foreground',
              textSizeClasses[size]
            )}
          >
            KenKai
          </span>
          <span className="text-xs text-muted-foreground -mt-1">
            Assistant
          </span>
        </div>
      )}
    </div>
  );
}