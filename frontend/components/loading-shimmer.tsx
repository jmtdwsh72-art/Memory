'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ShimmerProps {
  className?: string;
  children?: React.ReactNode;
}

export function Shimmer({ className, children }: ShimmerProps) {
  return (
    <motion.div 
      className={cn('relative overflow-hidden rounded-md bg-muted/60', className)}
      animate={{
        background: [
          'hsl(var(--muted) / 0.6)',
          'hsl(var(--muted) / 0.8)',
          'hsl(var(--muted) / 0.6)'
        ]
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-background/20 to-transparent"
        animate={{
          x: ['-100%', '100%']
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      {children}
    </motion.div>
  );
}

export function MessageShimmer() {
  return (
    <motion.div 
      className="flex gap-3 px-4 py-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Shimmer className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Shimmer className="h-3 w-16" />
          <Shimmer className="h-3 w-12" />
        </div>
        <motion.div 
          className="space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Shimmer className="h-4 w-3/4" />
          <Shimmer className="h-4 w-1/2" />
        </motion.div>
      </div>
    </motion.div>
  );
}

export function SidebarShimmer() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div 
          key={i} 
          className="flex items-start gap-3 rounded-lg p-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
        >
          <Shimmer className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-24" />
            <Shimmer className="h-3 w-32" />
            <div className="flex items-center justify-between">
              <Shimmer className="h-3 w-12" />
              <Shimmer className="h-3 w-8" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function LogsShimmer() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shimmer className="h-6 w-6 rounded-full" />
              <Shimmer className="h-4 w-20" />
            </div>
            <Shimmer className="h-3 w-16" />
          </div>
          
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2">
              <Shimmer className="h-3 w-12" />
              <Shimmer className="h-4 w-3/4" />
            </div>
            <div className="flex items-center gap-2">
              <Shimmer className="h-3 w-16" />
              <Shimmer className="h-4 w-2/3" />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Shimmer className="h-3 w-20" />
            <div className="flex gap-1">
              <Shimmer className="h-5 w-8 rounded-full" />
              <Shimmer className="h-5 w-12 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MemoryShimmer() {
  return (
    <div className="p-6">
      {/* Stats Section */}
      <div className="mb-6">
        <Shimmer className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-border bg-card">
              <Shimmer className="h-8 w-12 mb-2" />
              <Shimmer className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Memory Entries */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            {/* Date Group Header */}
            <div className="mb-3">
              <Shimmer className="h-5 w-24" />
            </div>
            
            {/* Memory Cards */}
            <div className="space-y-3 ml-4">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Shimmer className="h-8 w-8 rounded-full" />
                      <div>
                        <Shimmer className="h-4 w-20 mb-1" />
                        <Shimmer className="h-3 w-16" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shimmer className="h-6 w-16 rounded-full" />
                      <Shimmer className="h-6 w-6 rounded" />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Shimmer className="h-3 w-12 mb-2" />
                      <Shimmer className="h-4 w-full mb-1" />
                      <Shimmer className="h-4 w-3/4" />
                    </div>
                    
                    <div>
                      <Shimmer className="h-3 w-16 mb-2" />
                      <Shimmer className="h-4 w-full mb-1" />
                      <Shimmer className="h-4 w-2/3" />
                    </div>

                    <div className="flex gap-2">
                      <Shimmer className="h-5 w-12 rounded-full" />
                      <Shimmer className="h-5 w-16 rounded-full" />
                      <Shimmer className="h-5 w-10 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}