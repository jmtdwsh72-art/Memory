'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Menu, X, ScrollText, Brain } from 'lucide-react';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { AgentSidebar } from '@/components/agent-sidebar';
import { ChatInterface } from '@/components/chat-interface';
import { ChatInput } from '@/components/chat-input';
import { LazyLogsPanel } from '@/components/lazy-logs-panel';
import { LazyMemoryViewer } from '@/components/lazy-memory-viewer';
import { SettingsPanel, SettingsToggle } from '@/components/settings-panel';
import { CommandPaletteIntegration } from '@/components/command-palette-integration';
import { CommandPaletteTrigger } from '@/components/command-palette-trigger';
import { KeyboardShortcutProvider } from '@/components/keyboard-shortcut-provider';
import { DevOverlay } from '@/components/dev-overlay';
import { type Message } from '@/components/message-bubble';
import { GlobalMuteToggle } from '@/components/voice-player';
import { OnboardingInterface } from '@/components/onboarding-interface';
import { ErrorRecovery } from '@/components/error-recovery';
import { useAgentRequestWithRecovery } from '@/hooks/use-agent-request';
import { apiClient } from '@/lib/api';
import { generateSessionId } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { shouldShowOnboarding, hasCompletedOnboarding } from '@/lib/onboarding';

export default function HomePage() {
  const [activeAgent, setActiveAgent] = React.useState('router');
  const [messages, setMessages] = React.useState<Message[]>([]);
  const agentRequest = useAgentRequestWithRecovery({
    onSuccess: (response) => {
      // Add agent response to messages
      const agentMessage: Message = {
        id: `agent_${Date.now()}`,
        type: 'agent',
        content: response.reply,
        timestamp: response.timestamp,
        agentName: response.agentName,
        agentId: activeAgent,
        memoryUsed: response.memoryUsed,
      };
      setMessages(prev => [...prev, agentMessage]);
    }
  });
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [logsOpen, setLogsOpen] = React.useState(false);
  const [memoryOpen, setMemoryOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [sessionId] = React.useState(() => generateSessionId());
  const [isOnboarding, setIsOnboarding] = React.useState(false);
  const [onboardingChecked, setOnboardingChecked] = React.useState(false);

  // Check onboarding status on mount
  React.useEffect(() => {
    let mounted = true;

    const checkOnboarding = async () => {
      try {
        const showOnboarding = await shouldShowOnboarding();
        if (mounted) {
          setIsOnboarding(showOnboarding);
          if (showOnboarding) {
            setActiveAgent('welcome');
          }
          setOnboardingChecked(true);
        }
      } catch (error) {
        console.error('Failed to check onboarding:', error);
        if (mounted) {
          setOnboardingChecked(true);
        }
      }
    };

    checkOnboarding();

    return () => {
      mounted = false;
    };
  }, []);

  // Listen for onboarding completion
  React.useEffect(() => {
    const handleOnboardingComplete = () => {
      setIsOnboarding(false);
      setActiveAgent('router');
      setMessages([]); // Clear welcome messages
    };

    window.addEventListener('onboarding-complete', handleOnboardingComplete);
    return () => window.removeEventListener('onboarding-complete', handleOnboardingComplete);
  }, []);

  const handleSendMessage = async (input: string) => {
    if (agentRequest.isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      await agentRequest.sendRequest(
        activeAgent,
        { input, sessionId, isFirstMessage: messages.length === 0 },
        !isOnboarding // Enable memory only if not onboarding
      );
    } catch (error) {
      // Error recovery UI will handle the display
      console.error('Failed to send message:', error);
    }
  };

  const handleAgentSelect = (agentId: string) => {
    setActiveAgent(agentId);
    setSidebarOpen(false);
  };

  const handleCompleteOnboarding = () => {
    setIsOnboarding(false);
    setActiveAgent('router');
    setMessages([]); // Clear welcome messages
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleToggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  // Handle escape key for closing panels
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (settingsOpen) {
          setSettingsOpen(false);
        } else if (memoryOpen) {
          setMemoryOpen(false);
        } else if (logsOpen) {
          setLogsOpen(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [logsOpen, memoryOpen, settingsOpen]);

  // Ensure only one panel is open at a time
  const handleOpenLogs = () => {
    setMemoryOpen(false);
    setSettingsOpen(false);
    setLogsOpen(true);
  };

  const handleOpenMemory = () => {
    setLogsOpen(false);
    setSettingsOpen(false);
    setMemoryOpen(true);
  };

  const handleOpenSettings = () => {
    setLogsOpen(false);
    setMemoryOpen(false);
    setSettingsOpen(true);
  };

  // Show loading state while checking onboarding
  if (!onboardingChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <motion.div
            className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <span className="text-muted-foreground">Loading Memory Agent...</span>
        </div>
      </div>
    );
  }

  // Show onboarding interface
  if (isOnboarding) {
    return (
      <KeyboardShortcutProvider>
        <div className="flex h-screen bg-background">
          <OnboardingInterface
            onComplete={handleCompleteOnboarding}
            onSendMessage={handleSendMessage}
            messages={messages}
            isLoading={agentRequest.isLoading}
          />
        </div>
      </KeyboardShortcutProvider>
    );
  }

  return (
    <KeyboardShortcutProvider>
      <div className="flex h-screen bg-background">
      {/* Skip to main content link for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>
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
            <motion.div 
              className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div 
                className="h-2 w-2 rounded-full bg-green-500"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.span 
                className="capitalize font-medium"
                key={activeAgent}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {activeAgent} Agent
              </motion.span>
            </motion.div>

            {/* Logs toggle */}
            <motion.button
              onClick={handleOpenLogs}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'p-2 rounded-lg transition-all duration-200 ease-out',
                'hover:bg-accent hover:shadow-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'flex items-center gap-2 transform-gpu will-change-transform',
                logsOpen && 'bg-accent shadow-sm'
              )}
              aria-label="Open logs viewer"
            >
              <motion.div
                animate={logsOpen ? { rotate: 180 } : { rotate: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ScrollText className="h-4 w-4" />
              </motion.div>
              <span className="hidden sm:inline text-sm font-medium">Logs</span>
            </motion.button>

            {/* Memory toggle */}
            <motion.button
              onClick={handleOpenMemory}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'p-2 rounded-lg transition-all duration-200 ease-out',
                'hover:bg-accent hover:shadow-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'flex items-center gap-2 transform-gpu will-change-transform',
                memoryOpen && 'bg-accent shadow-sm'
              )}
              aria-label="Open memory viewer"
            >
              <motion.div
                animate={memoryOpen ? { 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                } : {}}
                transition={{ duration: 0.5 }}
              >
                <Brain className="h-4 w-4" />
              </motion.div>
              <span className="hidden sm:inline text-sm font-medium">Memory</span>
            </motion.button>

            {/* Command Palette Trigger */}
            <CommandPaletteTrigger className="hidden md:flex" />

            {/* Voice Mute Toggle */}
            <GlobalMuteToggle className="hidden sm:flex" />

            {/* Settings toggle */}
            <SettingsToggle 
              onClick={handleOpenSettings}
              className={settingsOpen ? 'bg-accent shadow-sm' : ''}
            />

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
        <main 
          id="main-content"
          className="flex flex-1 flex-col overflow-hidden"
          role="main"
          aria-label="Chat interface"
        >
          <ChatInterface
            messages={messages}
            isLoading={agentRequest.isLoading}
            className="flex-1"
          />
          
          {/* Error Recovery UI */}
          {agentRequest.showErrorRecovery && agentRequest.error && (
            <div className="p-4 border-t border-border">
              <ErrorRecovery
                error={agentRequest.error}
                onRetry={agentRequest.handleRetry}
                onDismiss={agentRequest.handleDismissError}
                context={`Sending message to ${activeAgent} agent`}
                showDetails={process.env.NODE_ENV === 'development'}
                maxRetries={3}
              />
            </div>
          )}
          
          <div role="region" aria-label="Message input">
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={agentRequest.isLoading}
              placeholder={`Message ${activeAgent} agent...`}
            />
          </div>
        </main>
      </div>

      {/* Agent Logs Panel */}
      <LazyLogsPanel
        isOpen={logsOpen}
        onClose={() => setLogsOpen(false)}
      />

      {/* Memory Viewer Panel */}
      <LazyMemoryViewer
        isOpen={memoryOpen}
        onClose={() => setMemoryOpen(false)}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Command Palette */}
      <CommandPaletteIntegration
        activeAgent={activeAgent}
        isMemoryOpen={memoryOpen}
        isLogsOpen={logsOpen}
        isSettingsOpen={settingsOpen}
        isSidebarOpen={sidebarOpen}
        onAgentSelect={handleAgentSelect}
        onOpenMemory={handleOpenMemory}
        onOpenLogs={handleOpenLogs}
        onOpenSettings={handleOpenSettings}
        onClearChat={handleClearChat}
        onToggleSidebar={handleToggleSidebar}
      />

      {/* Dev Overlay */}
      <DevOverlay />
    </div>
    </KeyboardShortcutProvider>
  );
}