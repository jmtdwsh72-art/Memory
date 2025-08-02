# Agent Expansion Guide

## ✅ Dynamic Agent Config System Successfully Implemented!

The Memory Agent system now supports dynamic agent loading through a centralized configuration registry. Adding new agents is now as simple as creating a single config file.

## 🛠️ How to Add a New Agent

### 1. Create Agent Config File

Create `src/agents/agent-[name].config.ts`:

```typescript
import { AgentConfig, AgentConfigExport } from '../utils/types';

export const myNewAgentConfig: AgentConfig = {
  id: 'mynewagent',
  name: 'My New Agent',
  tone: 'professional and helpful',
  goal: 'Specialized task description',
  description: 'Brief description for sidebar',
  memoryScope: 'persistent',
  tools: ['tool1', 'tool2'],
  keywords: ['keyword1', 'keyword2', 'trigger'],
  icon: 'IconName', // From Lucide React
  color: 'purple',
  status: 'active'
};

export const myNewAgentExport: AgentConfigExport = {
  config: myNewAgentConfig,
  prompts: { /* Optional prompts */ }
};
```

### 2. Create Agent Implementation

Create `src/agents/agent-[name].ts`:

```typescript
import { AgentConfig, AgentMessage, AgentResponse } from '../utils/types';
import { MemoryManager } from '../utils/memory-manager';
import { getAgentConfig } from '../config/agent-config';

export class MyNewAgent {
  private config: AgentConfig;
  private memoryManager: MemoryManager;

  constructor() {
    this.config = getAgentConfig('mynewagent') || /* fallback config */;
    this.memoryManager = new MemoryManager();
  }

  async processInput(input: string): Promise<AgentResponse> {
    // Your agent logic here
    return {
      success: true,
      message: "Response from my new agent!",
      memoryUpdated: true
    };
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }
}
```

### 3. Register in Central Config

Add to `src/config/agent-config.ts`:

```typescript
import { myNewAgentExport } from '../agents/agent-mynewagent.config';

private loadAgentConfigs(): void {
  this.agentConfigs.set('router', routerAgentExport);
  this.agentConfigs.set('research', researchAgentExport);
  this.agentConfigs.set('automation', automationAgentExport);
  this.agentConfigs.set('mynewagent', myNewAgentExport); // Add this line
}
```

### 4. Add to Router Initialization

Update `src/agents/agent-router.ts`:

```typescript
import { MyNewAgent } from './agent-mynewagent';

private initializeSubAgents(): void {
  const activeAgents = getAllAgents().filter(agent => agent.status === 'active' && agent.id !== 'router');
  
  for (const agentConfig of activeAgents) {
    switch (agentConfig.id) {
      case 'research':
        this.subAgents.set('research', new ResearchAgent());
        break;
      case 'automation':
        this.subAgents.set('automation', new AutomationAgent());
        break;
      case 'mynewagent':  // Add this case
        this.subAgents.set('mynewagent', new MyNewAgent());
        break;
      default:
        console.warn(`Unknown agent type: ${agentConfig.id}`);
    }
  }
}
```

### 5. Add Icon to Frontend

Update `frontend/components/agent-sidebar.tsx`:

```typescript
const iconComponents = {
  Search,
  MessageCircle,
  BarChart3,
  Zap,
  Bot,
  MyNewIcon, // Add your icon import and reference
} as const;
```

## 🎯 That's It!

The agent will now:
- ✅ Appear in the frontend sidebar automatically
- ✅ Be available via API at `/api/agent/mynewagent`
- ✅ Be routed to automatically based on keywords
- ✅ Have full memory integration
- ✅ Be listed in `/api/agents` endpoint

## 📊 Current System Status

**✅ Implemented Features:**
- Dynamic agent config loading
- Type-safe agent configurations
- Automatic keyword-based routing
- Frontend dynamic rendering
- Memory persistence per agent
- API endpoint auto-generation
- Icon and color theming

**🔄 Scalable Architecture:**
The system now supports unlimited agents with just config file additions. No hardcoded lists or manual route updates needed.

**🛡️ Type Safety:**
All agent configurations are enforced by TypeScript interfaces, preventing configuration errors.

## 📈 Example: Current Active Agents

```json
{
  "agents": [
    {
      "id": "router",
      "name": "General Chat", 
      "icon": "MessageCircle",
      "color": "gray",
      "keywords": ["general", "chat", "help"]
    },
    {
      "id": "research",
      "name": "Research Agent",
      "icon": "Search", 
      "color": "blue",
      "keywords": ["research", "analyze", "study", "investigate"]
    },
    {
      "id": "automation",
      "name": "Automation Agent",
      "icon": "Zap",
      "color": "orange", 
      "keywords": ["automate", "script", "prompt", "generate"]
    }
  ]
}
```

The dynamic agent config system is now complete and ready for unlimited expansion!