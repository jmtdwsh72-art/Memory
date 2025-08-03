import { AgentHandler } from '../types/agent-types';
import { welcomeAgentConfig } from './agent-welcome.config';

export class WelcomeAgent implements AgentHandler {
  private config = welcomeAgentConfig;

  async handle(input: string, context: any = {}): Promise<any> {
    const { sessionId, isFirstMessage = false } = context;

    // Welcome sequence for first-time users
    if (isFirstMessage || input.toLowerCase().includes('start') || input.toLowerCase().includes('welcome')) {
      return this.generateWelcomeSequence();
    }

    // Handle specific questions about Memory Agent
    if (this.isAboutMemory(input)) {
      return this.explainMemoryFeatures();
    }

    if (this.isAboutAgents(input)) {
      return this.explainAgents();
    }

    if (this.isAboutVoice(input)) {
      return this.explainVoiceFeatures();
    }

    if (this.isReadyToExplore(input)) {
      return this.generateExploreResponse();
    }

    // Default helpful response
    return this.generateHelpfulResponse(input);
  }

  private generateWelcomeSequence(): any {
    const welcomeMessage = `# 👋 Welcome to Memory Agent!

Hi there! I'm your **Welcome Agent**, and I'm excited to show you around! 

**Memory Agent** is your personal AI assistant that remembers everything across conversations. Here's what makes it special:

## 🧠 **Smart Memory**
- I remember our past conversations
- Context builds up over time
- Each agent has specialized knowledge

## 🤖 **Specialized Agents**
- **Research Agent** 🔍 - Deep analysis and investigation
- **Automation Agent** ⚡ - Scripting and workflow automation  
- **Creative Agent** ✨ - Brainstorming and creative writing
- **General Chat** 💬 - Everyday conversations and routing

## 🎤 **Voice Features**
- **Voice Input**: Click the mic to speak your messages
- **Voice Output**: Hear responses with natural AI voices
- **Mute Control**: Toggle voice on/off anytime

## 🚀 **Getting Started**
Ready to explore? You can:
- Ask me questions about any feature
- Try "**Show me the agents**" to see your options
- Or simply say "**I'm ready to explore**" when you want to start!

What would you like to know more about?`;

    return {
      reply: welcomeMessage,
      agentName: this.config.name,
      timestamp: new Date().toISOString(),
      memoryUsed: [],
      isOnboarding: true,
      showExploreButton: false
    };
  }

  private explainMemoryFeatures(): any {
    return {
      reply: `## 🧠 **Memory Features Explained**

Memory Agent's memory system is what sets it apart:

### **Short-term Memory** 
- Remembers everything in your current session
- Maintains conversation context
- Helps agents understand what we've discussed

### **Long-term Memory**
- Stores important information between sessions
- Learns your preferences and work patterns
- Each agent can access relevant memories

### **Memory Viewer** 📊
Click the **Brain icon** in the top bar to see:
- What information is stored
- How agents use memory
- Memory usage statistics

### **Privacy Notes** 🔒
- Your memory stays on your device and secure cloud storage
- You control what gets remembered
- Memory can be cleared anytime

Want to see the **Memory Viewer** in action, or learn about something else?`,
      agentName: this.config.name,
      timestamp: new Date().toISOString(),
      memoryUsed: [],
      isOnboarding: true
    };
  }

  private explainAgents(): any {
    return {
      reply: `## 🤖 **Meet Your AI Agents**

Each agent is specialized for different tasks:

### **🔍 Research Agent**
- Deep research and analysis
- Fact-checking and investigation
- Complex problem solving
- Perfect for: *"Research the latest trends in..."*

### **⚡ Automation Agent** 
- Scripting and workflow creation
- Process automation
- Technical implementations
- Perfect for: *"Help me automate..."*

### **✨ Creative Agent**
- Brainstorming and ideation
- Creative writing and storytelling
- Naming and branding
- Perfect for: *"I need creative ideas for..."*

### **💬 General Chat**
- Everyday conversations
- Task routing to other agents
- General assistance
- Perfect for: *"How do I..."*

### **Switching Agents** 🔄
- Click any agent in the sidebar to switch
- Or just start talking - I'll route you automatically!
- Each agent remembers your context

Ready to **meet your agents**?`,
      agentName: this.config.name,
      timestamp: new Date().toISOString(),
      memoryUsed: [],
      isOnboarding: true,
      showExploreButton: true
    };
  }

  private explainVoiceFeatures(): any {
    return {
      reply: `## 🎤 **Voice Features**

Memory Agent supports full voice interaction:

### **🎙️ Voice Input**
- Click the **microphone button** in the chat input
- Speak naturally - powered by OpenAI Whisper
- Works in any language
- Automatic transcription to text

### **🔊 Voice Output**  
- Each agent has a unique AI voice
- Click the **speaker icon** on any message
- Natural, conversational speech
- Powered by ElevenLabs

### **🔇 Voice Controls**
- **Global mute toggle** in the top bar
- **Per-message controls** on each response
- **Automatic voice selection** per agent

### **Voice Tips** 💡
- Speak clearly for best transcription
- Use voice for longer messages
- Great for accessibility and multitasking

Want to **try voice input** now, or explore other features?`,
      agentName: this.config.name,
      timestamp: new Date().toISOString(),
      memoryUsed: [],
      isOnboarding: true
    };
  }

  private generateExploreResponse(): any {
    return {
      reply: `## 🚀 **Perfect! You're Ready to Explore**

Great choice! You now know the basics of Memory Agent. Here's what happens next:

### **Choose Your First Agent** 🎯
- **Research Agent** 🔍 - For analysis and investigation
- **Creative Agent** ✨ - For brainstorming and ideas  
- **Automation Agent** ⚡ - For workflows and scripting
- **General Chat** 💬 - For everyday assistance

### **Pro Tips** 💡
- 🧠 Check the **Memory Viewer** to see what I remember
- 📋 Use the **Logs Panel** to track agent activities
- 🎤 Try **voice input** for a hands-free experience
- 🌙 Toggle **dark/light mode** for your preference

### **Need Help Later?** 
- Ask any agent "How do I...?"
- Check the Memory Panel for guidance
- I'll always be here if you need onboarding again!

**Click "Explore Agents" below to start your Memory Agent journey!** 🎉`,
      agentName: this.config.name,
      timestamp: new Date().toISOString(),
      memoryUsed: [],
      isOnboarding: true,
      showExploreButton: true,
      completesOnboarding: true
    };
  }

  private generateHelpfulResponse(input: string): any {
    return {
      reply: `I'm here to help you get started with Memory Agent! 

You can ask me about:
- 🧠 **Memory features** - "How does memory work?"
- 🤖 **Available agents** - "What agents are there?"
- 🎤 **Voice features** - "How do I use voice?"
- 🚀 **Getting started** - "I'm ready to explore!"

Or simply tell me what you'd like to learn about Memory Agent!`,
      agentName: this.config.name,
      timestamp: new Date().toISOString(),
      memoryUsed: [],
      isOnboarding: true
    };
  }

  private isAboutMemory(input: string): boolean {
    const memoryKeywords = ['memory', 'remember', 'storage', 'data', 'save', 'recall'];
    return memoryKeywords.some(keyword => 
      input.toLowerCase().includes(keyword)
    );
  }

  private isAboutAgents(input: string): boolean {
    const agentKeywords = ['agent', 'agents', 'assistant', 'research', 'creative', 'automation', 'chat'];
    return agentKeywords.some(keyword => 
      input.toLowerCase().includes(keyword)
    );
  }

  private isAboutVoice(input: string): boolean {
    const voiceKeywords = ['voice', 'speak', 'audio', 'microphone', 'mic', 'listen', 'talk'];
    return voiceKeywords.some(keyword => 
      input.toLowerCase().includes(keyword)
    );
  }

  private isReadyToExplore(input: string): boolean {
    const exploreKeywords = ['ready', 'explore', 'start', 'begin', 'go', 'continue', 'next'];
    return exploreKeywords.some(keyword => 
      input.toLowerCase().includes(keyword)
    );
  }
}