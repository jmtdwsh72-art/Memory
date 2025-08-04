import { AgentConfig, AgentMessage, AgentResponse } from '../utils/types';
import { MemoryManager } from '../utils/memory-manager';
import { getAgentConfig } from '../utils/config-utils';
import { useAgentMemoryWithPreset } from '../utils/memory-hooks';
import { ConversationalBehavior } from '../utils/conversational-behavior';

export class AutomationAgent {
  private config: AgentConfig;
  private memoryManager: MemoryManager;
  private conversational: ConversationalBehavior;

  constructor() {
    // Load validated configuration using centralized utility
    this.config = getAgentConfig('automation');
    this.memoryManager = new MemoryManager();
    this.conversational = new ConversationalBehavior();
  }

  async processInput(input: string, userId?: string): Promise<AgentResponse> {
    try {
      // Use centralized memory utilities with automation preset
      const memory = useAgentMemoryWithPreset(this.config.id, 'automation', userId);
      
      // Recall relevant memories using preset configuration
      const memoryContext = await memory.recallWithPreset(input);
      const contextString = memory.buildContext(memoryContext);
      
      // Check if we should ask clarifying questions
      const taskType = this.identifyTaskType(input);
      const hasRecentInteraction = await this.conversational.checkRecentInteraction(
        this.config.id,
        userId
      );
      
      // Calculate confidence based on task analysis
      const confidence = this.calculateTaskConfidence(input, taskType);
      
      // Determine if we should use conversational approach
      const shouldClarify = !hasRecentInteraction && 
        this.conversational.shouldAskClarification(input, confidence, userId);
      
      let response: string;
      
      if (shouldClarify) {
        // Generate conversational response with clarifying questions
        const acknowledgment = this.conversational.generateAcknowledgment('automation', { taskType });
        const questions = this.conversational.generateClarifyingQuestions('automation', input, { taskType });
        response = this.conversational.formatConversationalResponse(acknowledgment, questions);
      } else {
        // Generate full response
        response = await this.generateResponse(input, contextString);
      }
      
      // Store interaction using centralized utility with goal tracking
      const storedTaskType = this.identifyTaskType(input);
      const goalTag = this.extractGoalTag(input, storedTaskType);
      
      // Save as goal type with appropriate tags
      await memory.saveMemory(
        input, 
        response, 
        `automation_goal: ${goalTag}`,
        'goal',
        ['automation', storedTaskType, 'process_optimization', 'automation_goal']
      );

      await this.logInteraction({
        id: this.generateId(),
        timestamp: new Date(),
        agentName: this.config.id,
        input,
        output: response,
        memoryUsed: memoryContext.entries.map(m => m.id)
      });

      return {
        success: true,
        message: response,
        memoryUpdated: true
      };
    } catch (error) {
      return {
        success: false,
        message: `Automation agent error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }


  private async generateResponse(input: string, memoryContext: string): Promise<string> {
    const taskType = this.identifyTaskType(input);
    const baseResponse = this.generateTaskResponse(input, taskType);
    
    let response = baseResponse;

    // Add memory context if available
    if (memoryContext && memoryContext.trim()) {
      response += `\n\n${memoryContext}`;
    }

    response += '\n\n💾 This automation solution has been saved to my memory for future reference and iteration.';
    
    return response;
  }

  private calculateTaskConfidence(input: string, taskType: string): number {
    let confidence = 0.4; // Base confidence
    
    const lowerInput = input.toLowerCase();
    
    // Increase confidence for specific task details
    if (taskType === 'promptWriting' && (lowerInput.includes('help me') || lowerInput.includes('need to'))) {
      confidence += 0.3;
    }
    
    if (taskType === 'scripting' && (lowerInput.includes('daily') || lowerInput.includes('process') || lowerInput.includes('system'))) {
      confidence += 0.3;
    }
    
    // Check for context about the current state
    if (lowerInput.includes('currently') || lowerInput.includes('right now') || lowerInput.includes('existing')) {
      confidence += 0.2;
    }
    
    // Very short inputs need clarification
    if (input.split(' ').length < 5) {
      confidence -= 0.3;
    }
    
    return Math.min(Math.max(confidence, 0), 1.0);
  }

  private identifyTaskType(input: string): string {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('prompt') || lowerInput.includes('write') && (lowerInput.includes('ai') || lowerInput.includes('chatgpt') || lowerInput.includes('claude'))) {
      return 'promptWriting';
    }
    
    if (lowerInput.includes('script') || lowerInput.includes('automate') || lowerInput.includes('workflow')) {
      return 'scripting';
    }
    
    if (lowerInput.includes('idea') || lowerInput.includes('brainstorm') || lowerInput.includes('creative') || lowerInput.includes('generate')) {
      return 'ideaGeneration';
    }
    
    if (lowerInput.includes('template') || lowerInput.includes('format') || lowerInput.includes('standard')) {
      return 'templateCreation';
    }
    
    if (lowerInput.includes('optimize') || lowerInput.includes('improve') || lowerInput.includes('streamline')) {
      return 'processOptimization';
    }
    
    return 'general';
  }

  private generateTaskResponse(input: string, taskType: string): string {
    switch (taskType) {
      case 'promptWriting':
        return this.handlePromptWriting(input);
      case 'scripting':
        return this.handleScripting(input);
      case 'ideaGeneration':
        return this.handleIdeaGeneration(input);
      case 'templateCreation':
        return this.handleTemplateCreation(input);
      case 'processOptimization':
        return this.handleProcessOptimization(input);
      default:
        return this.handleGeneralAutomation(input);
    }
  }

  private handlePromptWriting(input: string): string {
    const keywords = this.extractKeywords(input);
    
    return `Hey! I can help you craft a solid prompt for that. Here's what I'm thinking:

**🎯 Optimized Prompt:**
"You are a specialized assistant focused on ${keywords.join(', ')}. Please provide detailed, actionable responses that include specific examples and step-by-step guidance. Always consider the user's context and offer practical next steps."

**💡 Why this works:**
- Clear role definition sets expectations
- Asks for specificity and examples
- Requests actionable guidance
- Considers user context

**🔧 Pro tips for better prompts:**
- Be specific about the output format you want
- Include examples when possible
- Set the tone (professional, casual, creative)
- Add constraints if needed (word count, style, etc.)

Want me to refine this further or create variations for different use cases?`;
  }

  private handleScripting(input: string): string {
    const keywords = this.extractKeywords(input);
    
    return `Perfect! Let's automate this task. Based on what you're describing, here's a practical approach:

**🚀 Automation Strategy:**
I'd recommend creating a script that handles ${keywords.join(' and ')} efficiently.

**📝 Basic Script Structure:**
\`\`\`bash
#!/bin/bash
# Automation script for ${keywords[0] || 'your task'}

# Configuration
CONFIG_FILE="config.txt"
LOG_FILE="automation.log"

# Main function
main() {
    echo "Starting automation..." | tee -a $LOG_FILE
    # Your automation logic here
    echo "Automation complete!" | tee -a $LOG_FILE
}

# Error handling
handle_error() {
    echo "Error: $1" | tee -a $LOG_FILE
    exit 1
}

# Run main function
main "$@"
\`\`\`

**🎯 Implementation tips:**
- Start simple and iterate
- Add logging for debugging
- Include error handling
- Make it configurable with variables

Need help with a specific scripting language or want me to dive deeper into any part?`;
  }

  private handleIdeaGeneration(input: string): string {
    const keywords = this.extractKeywords(input);
    
    return `Awesome! Let's brainstorm some creative ideas around ${keywords.join(', ')}. Here's what I'm thinking:

**💡 Creative Ideas:**

**Option 1: The Quick Win Approach**
- Focus on immediate, low-effort solutions
- Build momentum with small successes
- Iterate based on feedback

**Option 2: The Innovation Route**
- Challenge existing assumptions
- Combine unexpected elements
- Look for cross-industry inspiration

**Option 3: The User-Centric Path**
- Start with user pain points
- Map the complete user journey
- Design for delight, not just function

**🎯 Next Steps:**
1. Pick the approach that resonates most
2. Create a quick prototype or mockup
3. Test with a small group
4. Iterate based on learnings

**🔄 Brainstorming techniques to try:**
- "What if we did the opposite?"
- "How would [successful company] solve this?"
- "What would this look like in 10 years?"

Which direction feels most promising? I can dive deeper into any of these!`;
  }

  private handleTemplateCreation(input: string): string {
    const keywords = this.extractKeywords(input);
    
    return `Great idea! Templates are huge time-savers. Let me create a flexible template structure for ${keywords.join(' and ')}:

**📋 Template Framework:**

\`\`\`
# [TEMPLATE NAME]
Date: [DATE]
Author: [AUTHOR]

## Objective
[What are you trying to achieve?]

## Key Elements
- Element 1: [DESCRIPTION]
- Element 2: [DESCRIPTION]
- Element 3: [DESCRIPTION]

## Action Items
[ ] Task 1
[ ] Task 2
[ ] Task 3

## Success Metrics
- Metric 1: [TARGET]
- Metric 2: [TARGET]

## Notes
[Additional context or considerations]
\`\`\`

**🎯 Customization Options:**
- Add/remove sections based on your needs
- Include dropdown options for common choices
- Create variations for different scenarios
- Build in approval/review checkpoints

**💡 Template Tips:**
- Keep it simple and scannable
- Use consistent formatting
- Include helpful prompts/questions
- Version control your templates

Want me to customize this for your specific use case or create additional template variations?`;
  }

  private handleProcessOptimization(input: string): string {
    const keywords = this.extractKeywords(input);
    
    return `Nice! Process optimization is my jam. Let's streamline this workflow around ${keywords.join(', ')}:

**🔍 Optimization Analysis:**

**Current State Assessment:**
- What steps are taking the most time?
- Where do bottlenecks typically occur?
- Which tasks are most repetitive?

**💡 Optimization Opportunities:**

**1. Automation Wins:**
- Automate repetitive data entry
- Set up automatic notifications
- Create template responses

**2. Process Improvements:**
- Eliminate redundant steps
- Parallel process where possible
- Standardize decision criteria

**3. Tool Upgrades:**
- Use better software/platforms
- Integrate systems to reduce context switching
- Implement keyboard shortcuts and hotkeys

**⚡ Quick Implementation Plan:**
1. **Week 1:** Identify top 3 pain points
2. **Week 2:** Implement one quick automation
3. **Week 3:** Standardize the improved process
4. **Week 4:** Measure results and iterate

**📊 Success Metrics:**
- Time saved per task
- Error reduction rate
- User satisfaction improvement

Ready to dive into any specific part of this process? I can help create detailed implementation plans!`;
  }

  private handleGeneralAutomation(_input: string): string {
    return `Hey there! I'm your go-to automation buddy. I can help you streamline pretty much anything:

**🛠️ What I'm great at helping with:**

**Prompt Engineering:**
- Crafting effective AI prompts
- Optimizing for different models
- Building prompt libraries

**Script Creation:**
- Bash, Python, Node.js scripts
- Workflow automation
- Data processing pipelines

**Creative Solutions:**
- Brainstorming innovative approaches
- Problem-solving frameworks
- Idea generation techniques

**Templates & Standardization:**
- Document templates
- Process frameworks
- Reusable formats

**Process Optimization:**
- Workflow analysis
- Bottleneck identification
- Efficiency improvements

**💬 Just tell me:**
- What task is eating up your time?
- What process feels clunky?
- What would you love to automate?

I'll whip up a practical solution that actually works. No over-engineering, just solid automation that saves you time and headaches.

What's bugging you today that we can fix together?`;
  }

  private extractKeywords(input: string): string[] {
    const words = input.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'i', 'me', 'my', 'we', 'us', 'you', 'your'];
    return words.filter(word => word.length > 3 && !stopWords.includes(word)).slice(0, 4);
  }

  private extractGoalTag(input: string, taskType: string): string {
    // Extract subject for goal tracking
    const subject = input.replace(/^(automate|build|create|script|optimize|streamline|help me with|i need|can you)/i, '').trim();
    const cleanSubject = subject.split(/\s+/).slice(0, 3).join('_').toLowerCase();
    return cleanSubject || taskType;
  }


  private async logInteraction(message: AgentMessage): Promise<void> {
    await this.memoryManager.logMessage(message);
  }

  private generateId(): string {
    return `automation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }
}