'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Menu, ScrollText, Brain, ArrowLeft } from 'lucide-react';
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
import { shouldShowOnboarding } from '@/lib/onboarding';

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get initial agent from URL params
  const initialAgent = searchParams.get('agent') || 'router';
  const voiceEnabled = searchParams.get('voice') === 'true';
  
  const [activeAgent, setActiveAgent] = React.useState(initialAgent);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const agentRequest = useAgentRequestWithRecovery({
    onSuccess: (response) => {
      console.log('[ChatPage] Agent response received:', response);
      
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
      
      console.log('[ChatPage] Adding agent message:', agentMessage);
      
      setMessages(prev => {
        console.log('[ChatPage] Previous messages:', prev);
        const newMessages = [...prev, agentMessage];
        console.log('[ChatPage] New messages:', newMessages);
        return newMessages;
      });
    },
    onError: (error) => {
      console.error('[ChatPage] Agent request error:', error);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        type: 'agent',
        content: `I encountered an error: ${error.message}. Please try again or contact support if this persists.`,
        timestamp: new Date().toISOString(),
        agentName: 'System',
        agentId: 'system',
        memoryUsed: [],
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  const [sessionId] = React.useState(() => generateSessionId());
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [logsOpen, setLogsOpen] = React.useState(false);
  const [memoryOpen, setMemoryOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(false);

  // Check if onboarding should be shown
  React.useEffect(() => {
    const checkOnboarding = async () => {
      const shouldShow = await shouldShowOnboarding();
      setShowOnboarding(shouldShow);
    };
    checkOnboarding();
  }, []);

  // Handle onboarding completion
  const handleOnboardingComplete = React.useCallback(() => {
    setShowOnboarding(false);
    // Mark onboarding as completed in localStorage or state management
    localStorage.setItem('onboarding_completed', 'true');
  }, []);

  const handleSendMessage = async (message: string, options?: { voice?: boolean }) => {
    console.log('[ChatPage] Sending message:', message, 'to agent:', activeAgent);
    
    // Add user message immediately
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      agentName: 'User',
      agentId: 'user',
      memoryUsed: [],
    };
    
    console.log('[ChatPage] Adding user message:', userMessage);
    
    setMessages(prev => {
      console.log('[ChatPage] Previous messages before user:', prev);
      const newMessages = [...prev, userMessage];
      console.log('[ChatPage] Messages after adding user:', newMessages);
      return newMessages;
    });

    // Send to agent
    try {
      await agentRequest.sendRequest(activeAgent, {
        input: message,
        sessionId,
        isFirstMessage: messages.length === 0,
      }, true);
    } catch (error) {
      console.error('[ChatPage] Failed to send message:', error);
      // Error handling is managed by the hook's onError callback
    }
  };

  const handleRetryLastMessage = React.useCallback(() => {
    const lastUserMessage = [...messages].reverse().find(m => m.type === 'user');
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage.content);
    }
  }, [messages, handleSendMessage]);

  const navigateToDashboard = () => {
    router.push('/dashboard');
  };

  // Show onboarding if user hasn't completed it
  if (showOnboarding) {
    return (
      <KeyboardShortcutProvider>
        <OnboardingInterface 
          onComplete={handleOnboardingComplete} 
          onSendMessage={handleSendMessage}
          messages={messages}
          isLoading={agentRequest.isLoading}
        />
      </KeyboardShortcutProvider>
    );
  }

  return (
    <KeyboardShortcutProvider>
      <div className="min-h-screen bg-background">
        <CommandPaletteIntegration 
          activeAgent={activeAgent}
          isMemoryOpen={memoryOpen}
          isLogsOpen={logsOpen}
          isSettingsOpen={settingsOpen}
          isSidebarOpen={sidebarOpen}
          onAgentSelect={setActiveAgent}
          onOpenMemory={() => setMemoryOpen(true)}
          onOpenLogs={() => setLogsOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onClearChat={() => setMessages([])}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNavigateToDashboard={navigateToDashboard}
        />
        
        {/* Mobile Menu Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Agent Sidebar */}
        <AgentSidebar
          activeAgent={activeAgent}
          onAgentSelect={setActiveAgent}
          className="lg:translate-x-0"
        />

        {/* Main Layout */}
        <div className="lg:pl-80">
          {/* Header Bar */}
          <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/95 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
              <div className="flex items-center gap-4">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-lg hover:bg-accent transition-colors lg:hidden"
                  aria-label="Open agent sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>

                {/* Back to Dashboard */}
                <button
                  onClick={navigateToDashboard}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>

                {/* Agent Status Indicator */}
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-foreground capitalize">
                    {activeAgent} Agent
                  </span>
                  {agentRequest.isLoading && (
                    <div className="text-xs text-muted-foreground">
                      Thinking...
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Action Buttons */}
                <GlobalMuteToggle />
                
                <button
                  onClick={() => setLogsOpen(true)}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                  aria-label="View logs"
                >
                  <ScrollText className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setMemoryOpen(true)}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                  aria-label="View memory"
                >
                  <Brain className="h-4 w-4" />
                </button>

                <SettingsToggle 
                  onClick={() => setSettingsOpen(!settingsOpen)} 
                />
                
                <CommandPaletteTrigger />
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Chat Workspace */}
          <main className="relative">
            <div className="mx-auto max-w-4xl">
              {/* Chat Interface */}
              <div className="flex min-h-[calc(100vh-4rem)] flex-col">
                <div className="flex-1 overflow-hidden">
                  <ChatInterface 
                    messages={messages}
                    isLoading={agentRequest.isLoading}
                    className="h-full"
                  />
                </div>

                {/* Chat Input - Sticky at bottom */}
                <div className="sticky bottom-0 border-t border-border/40 bg-background/95 backdrop-blur-xl p-4 lg:p-6">
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    disabled={agentRequest.isLoading}
                    placeholder={`Message ${activeAgent} agent...`}
                  />
                </div>
              </div>
            </div>

            {/* Error Recovery */}
            {agentRequest.error && (
              <ErrorRecovery
                error={agentRequest.error}
                onRetry={handleRetryLastMessage}
                onDismiss={agentRequest.reset}
              />
            )}
          </main>
        </div>

        {/* Side Panels */}
        <LazyLogsPanel
          isOpen={logsOpen}
          onClose={() => setLogsOpen(false)}
        />

        <LazyMemoryViewer
          isOpen={memoryOpen}
          onClose={() => setMemoryOpen(false)}
        />

        <SettingsPanel
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />

        {/* Development Overlay */}
        <DevOverlay />
      </div>
    </KeyboardShortcutProvider>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}