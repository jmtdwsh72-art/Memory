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
import { BrandedChatHeader } from '@/components/branded-chat-header';
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
      
      // Check if this response includes routing metadata
      if (response.routing && response.routing.shouldRedirect) {
        const { targetAgent, confidence, reasoning, originalMessage } = response.routing;
        
        // If target agent is the same as current agent, don't redirect - just continue conversation
        if (targetAgent === activeAgent) {
          console.log('[ChatPage] Staying in current thread, no redirection needed');
          
          // Just add the agent response to current thread
          const agentMessage: Message = {
            id: `agent_${Date.now()}`,
            type: 'agent',
            content: originalMessage,
            timestamp: response.timestamp,
            agentName: response.agentName || 'Assistant',
            agentId: targetAgent,
            memoryUsed: response.memoryUsed || [],
          };
          
          setMessages(prev => [...prev, agentMessage]);
          return;
        }
        
        console.log('[ChatPage] Detected routing decision:', { 
          from: activeAgent, 
          to: targetAgent, 
          confidence,
          reasoning
        });
        
        // Show routing message briefly, then redirect
        const routingMessage: Message = {
          id: `routing_${Date.now()}`,
          type: 'routing',
          content: `🧠 Routing to ${targetAgent} Agent (${Math.round(confidence * 100)}% confidence)...\n\n${originalMessage}`,
          timestamp: response.timestamp,
          agentName: 'Router',
          agentId: 'router',
          routedTo: targetAgent,
          memoryUsed: [],
        };
        
        setMessages(prev => [...prev, routingMessage]);
        
        // Navigate to the new agent thread after a brief delay
        setTimeout(() => {
          console.log('[ChatPage] Navigating to agent thread:', targetAgent);
          router.push(`/chat?agent=${targetAgent}`);
          setActiveAgent(targetAgent);
          
          // Clear messages and show the agent's response directly
          setMessages([]);
          
          // Add the final agent response to the new thread
          const agentMessage: Message = {
            id: `agent_${Date.now()}`,
            type: 'agent',
            content: originalMessage,
            timestamp: response.timestamp,
            agentName: response.agentName || 'Assistant',
            agentId: targetAgent,
            memoryUsed: response.memoryUsed || [],
          };
          
          setMessages([agentMessage]);
        }, 1500); // Show routing message for 1.5 seconds
        
      } else {
        // Regular agent message (no routing)
        const agentMessage: Message = {
          id: `agent_${Date.now()}`,
          type: 'agent',
          content: response.reply,
          timestamp: response.timestamp,
          agentName: response.agentName || 'Assistant',
          agentId: activeAgent,
          memoryUsed: response.memoryUsed || [],
        };
        
        console.log('[ChatPage] Adding regular agent message:', {
          agentId: agentMessage.agentId,
          contentLength: agentMessage.content.length
        });
        
        setMessages(prev => [...prev, agentMessage]);
      }
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

  const handleSendMessageToNewAgent = async (message: string, agentId: string) => {
    console.log('[ChatPage] Sending message to new agent:', { message, agentId, sessionId });
    
    // Clear current messages for the new agent thread
    setMessages([]);
    
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
    
    setMessages([userMessage]);

    // Send to the new agent with preserved session context
    try {
      await agentRequest.sendRequest(agentId, {
        input: message,
        sessionId, // Preserve the same session ID across agent switches
        context: `[Agent handoff from router] User session ${sessionId}`, // Add context for memory continuity
        isFirstMessage: false, // This is a continuation of the session, not truly first
      }, true); // Enable memory for continuity across agents
    } catch (error) {
      console.error('[ChatPage] Failed to send message to new agent:', error);
      // Error handling is managed by the hook's onError callback
    }
  };

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
            aria-label="Close sidebar"
          />
        )}

        {/* Main Layout Container */}
        <div className="flex h-screen">
          {/* Agent Sidebar */}
          <AgentSidebar
            activeAgent={activeAgent}
            onAgentSelect={(agentId) => {
              console.log('[ChatPage] Manual agent selection:', agentId);
              setActiveAgent(agentId);
              setSidebarOpen(false); // Close sidebar on mobile after selection
              
              // Update URL to reflect the new agent
              router.push(`/chat?agent=${agentId}`);
              
              // Clear messages for new agent thread (except if staying on router)
              if (agentId !== 'router') {
                setMessages([]);
              }
            }}
            className={cn(
              "fixed lg:relative lg:block z-50",
              "transition-transform duration-300 ease-in-out",
              "inset-y-0 left-0",
              sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
          {/* Branded Header */}
          <BrandedChatHeader
            activeAgent={activeAgent}
            isLoading={agentRequest.isLoading}
            status={agentRequest.isLoading ? 'thinking' : 'listening'}
            onToggleSidebar={() => setSidebarOpen(true)}
            onNavigateBack={navigateToDashboard}
          />
          
          {/* Action Bar */}
          <div className="border-b border-border/40 bg-background/50 backdrop-blur-sm">
            <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 lg:px-6">
              <div className="flex items-center gap-2">
                {/* Additional context info could go here */}
              </div>
              
              <div className="flex items-center gap-2">
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
              </div>
            </div>
          </div>

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