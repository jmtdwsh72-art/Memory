'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Brain, MessageCircle, Mic, Search, Cog, Wand2, Bot, Target } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function DashboardPage() {
  const router = useRouter();

  const handleStartChat = () => {
    router.push('/chat');
  };

  const handleAgentSelect = (agentId: string) => {
    router.push(`/chat?agent=${agentId}`);
  };

  const handleVoiceDemo = () => {
    router.push('/chat?voice=true');
  };

  const agents = [
    {
      id: 'research',
      name: 'Research Agent',
      description: 'Deep dive into topics, analyze data, and provide comprehensive insights with structured learning paths.',
      icon: <Search className="h-6 w-6 text-white" />,
      color: 'bg-blue-500',
    },
    {
      id: 'creative',
      name: 'Creative Agent',
      description: 'Generate ideas, brainstorm solutions, and help with creative projects and naming challenges.',
      icon: <Wand2 className="h-6 w-6 text-white" />,
      color: 'bg-purple-500',
    },
    {
      id: 'automation',
      name: 'Automation Agent',
      description: 'Streamline workflows, create efficient processes, and build automation strategies.',
      icon: <Cog className="h-6 w-6 text-white" />,
      color: 'bg-green-500',
    },
    {
      id: 'router',
      name: 'General Chat',
      description: 'Start with natural conversation and let me route you to the perfect specialized agent.',
      icon: <Bot className="h-6 w-6 text-white" />,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-semibold text-foreground">Memory Agent</span>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 lg:px-6 py-20">
        <div className="text-center mb-16">
          <div className="mb-6">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
              Welcome back,
              <br />
              <span className="text-primary">ready to think together?</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Your AI-powered memory assistant with specialized agents for research, creativity, and automation.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 max-w-2xl mx-auto">
            <button
              onClick={handleStartChat}
              className="flex items-center gap-4 p-4 rounded-lg border text-left transition-all duration-200 hover:shadow-md hover:border-primary/50 bg-primary text-primary-foreground border-primary hover:bg-primary/90"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/20">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Start Chat</div>
                <div className="text-sm text-primary-foreground/80">Begin a conversation</div>
              </div>
            </button>
            
            <button
              onClick={handleVoiceDemo}
              className="flex items-center gap-4 p-4 rounded-lg border text-left transition-all duration-200 hover:shadow-md hover:border-primary/50 bg-card border-border hover:bg-accent"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Mic className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Voice Demo</div>
                <div className="text-sm text-muted-foreground">Try voice interaction</div>
              </div>
            </button>
          </div>
        </div>

        {/* Agent Cards */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Choose Your AI Assistant</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Each agent is specialized for different types of tasks and maintains memory across all your conversations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => handleAgentSelect(agent.id)}
                className="group relative overflow-hidden rounded-xl border border-border/50 p-6 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm hover:border-border transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/10 transform hover:scale-105"
              >
                <div className="relative z-10">
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg mb-4 transition-colors duration-300 ${agent.color}`}>
                    {agent.icon}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {agent.name}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {agent.description}
                  </p>
                  
                  <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="text-xs text-primary font-medium">
                      Click to start →
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Goals Preview */}
        <div className="p-8 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <Target className="h-6 w-6 text-primary" />
            <h3 className="text-xl font-semibold text-foreground">Recent Goals</h3>
          </div>

          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h4 className="text-lg font-medium text-foreground mb-2">No goals yet</h4>
            <p className="text-muted-foreground mb-4">
              Start a conversation to set learning goals and track your progress
            </p>
            <button
              onClick={handleStartChat}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              Start Your First Goal
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-6 text-center text-sm text-muted-foreground">
          Memory Agent - Your AI-powered thinking companion
        </div>
      </footer>
    </div>
  );
}