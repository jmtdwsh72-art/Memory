'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Menu, X, ScrollText, Brain } from 'lucide-react';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { AgentSidebar } from '@/components/agent-sidebar';
import { ChatInterface } from '@/components/chat-interface';
import { ChatInput } from '@/components/chat-input';
import { AgentLogsPanel } from '@/components/agent-logs-panel';
import { MemoryViewerPanel } from '@/components/memory-viewer-panel';
import { type Message } from '@/components/message-bubble';
import { apiClient } from '@/lib/api';
import { generateSessionId } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const [activeAgent, setActiveAgent] = React.useState('router');
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [logsOpen, setLogsOpen] = React.useState(false);
  const [memoryOpen, setMemoryOpen] = React.useState(false);
  const [sessionId] = React.useState(() => generateSessionId());

  const handleSendMessage = async (input: string) => {
    if (isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await apiClient.sendAgentRequest(
        activeAgent,
        { input, sessionId },
        true // Enable memory
      );

      // Add agent response
      const agentMessage: Message = {
        id: `agent_${Date.now()}`,
        type: 'agent',
        content: response.reply,
        timestamp: response.timestamp,
        agentName: response.agentName,
        memoryUsed: response.memoryUsed,
      };

      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        type: 'agent',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date().toISOString(),
        agentName: 'System',
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgentSelect = (agentId: string) => {
    setActiveAgent(agentId);
    setSidebarOpen(false);
  };

  // Handle escape key for closing panels
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (memoryOpen) {
          setMemoryOpen(false);
        } else if (logsOpen) {
          setLogsOpen(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [logsOpen, memoryOpen]);

  // Ensure only one panel is open at a time
  const handleOpenLogs = () => {
    setMemoryOpen(false);
    setLogsOpen(true);
  };

  const handleOpenMemory = () => {
    setLogsOpen(false);
    setMemoryOpen(true);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={{ x: -320 }}
        animate={{ x: sidebarOpen ? 0 : -320 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'fixed left-0 top-0 z-50 h-full md:relative md:z-0',
          'md:translate-x-0 md:block',
          sidebarOpen ? 'block' : 'hidden md:block'
        )}
      >
        <AgentSidebar
          activeAgent={activeAgent}
          onAgentSelect={handleAgentSelect}
        />
      </motion.div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 hover:bg-accent rounded-md"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Logo */}
            <Logo size="sm" />
          </div>

          <div className="flex items-center gap-2">
            {/* Agent status */}
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="capitalize">{activeAgent} Agent</span>
            </div>

            {/* Logs toggle */}
            <button
              onClick={handleOpenLogs}
              className={cn(
                'p-2 rounded-lg hover:bg-accent transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'flex items-center gap-2',
                logsOpen && 'bg-accent'
              )}
              aria-label="Open logs viewer"
            >
              <ScrollText className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Logs</span>
            </button>

            {/* Memory toggle */}
            <button
              onClick={handleOpenMemory}
              className={cn(
                'p-2 rounded-lg hover:bg-accent transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'flex items-center gap-2',
                memoryOpen && 'bg-accent'
              )}
              aria-label="Open memory viewer"
            >
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Memory</span>
            </button>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Mobile close button */}
            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-2 hover:bg-accent rounded-md"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            className="flex-1"
          />
          
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isLoading}
            placeholder={`Message ${activeAgent} agent...`}
          />
        </div>
      </div>

      {/* Agent Logs Panel */}
      <AgentLogsPanel
        isOpen={logsOpen}
        onClose={() => setLogsOpen(false)}
      />

      {/* Memory Viewer Panel */}
      <MemoryViewerPanel
        isOpen={memoryOpen}
        onClose={() => setMemoryOpen(false)}
      />
    </div>
  );
}