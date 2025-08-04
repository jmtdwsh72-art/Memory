import { AgentConfig, AgentMessage, AgentResponse } from '../utils/types';
import { MemoryManager } from '../utils/memory-manager';
import { getAgentConfig } from '../utils/config-utils';
import { useAgentMemoryWithPreset } from '../utils/memory-hooks';
import { ConversationalBehavior } from '../utils/conversational-behavior';

export class CreativeAgent {
  private config: AgentConfig;
  private memoryManager: MemoryManager;
  private conversational: ConversationalBehavior;

  constructor() {
    // Load validated configuration using centralized utility
    this.config = getAgentConfig('creative');
    this.memoryManager = new MemoryManager();
    this.conversational = new ConversationalBehavior();
  }

  async processInput(input: string, userId?: string): Promise<AgentResponse> {
    try {
      // Use centralized memory utilities with creative preset
      const memory = useAgentMemoryWithPreset(this.config.id, 'creative', userId);
      
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
        const acknowledgment = this.conversational.generateAcknowledgment('creative', { taskType });
        const questions = this.conversational.generateClarifyingQuestions('creative', input, { taskType });
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
        `creative_goal: ${goalTag}`,
        'goal',
        ['creative', storedTaskType, 'brainstorming', 'creative_goal']
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
        message: `Creative agent error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }


  private async generateResponse(input: string, memoryContext: string): Promise<string> {
    const taskType = this.identifyTaskType(input);
    let response = '';

    switch (taskType) {
      case 'naming':
        response = this.generateNamingResponse(input);
        break;
      case 'story':
        response = this.generateStoryResponse(input);
        break;
      case 'brainstorm':
      default:
        response = this.generateBrainstormResponse(input);
        break;
    }

    // Add memory context if available
    if (memoryContext && memoryContext.trim()) {
      response += `\n\n${memoryContext}`;
    }

    response += '\n\n✨ This creative session has been saved to my memory for future inspiration!';
    
    return response;
  }

  private calculateTaskConfidence(input: string, taskType: string): number {
    let confidence = 0.4; // Base confidence
    
    const lowerInput = input.toLowerCase();
    
    // Increase confidence for specific task indicators
    if (taskType === 'naming' && (lowerInput.includes('company') || lowerInput.includes('product') || lowerInput.includes('brand'))) {
      confidence += 0.3;
    }
    
    if (taskType === 'story' && (lowerInput.includes('about') || lowerInput.includes('character') || lowerInput.includes('genre'))) {
      confidence += 0.3;
    }
    
    // Check for context indicators
    if (lowerInput.includes('for') || lowerInput.includes('about') || lowerInput.includes('that')) {
      confidence += 0.2;
    }
    
    // Short inputs have lower confidence
    if (input.split(' ').length < 5) {
      confidence -= 0.2;
    }
    
    return Math.min(Math.max(confidence, 0), 1.0);
  }

  private identifyTaskType(input: string): 'brainstorm' | 'naming' | 'story' {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('name') || lowerInput.includes('call') || lowerInput.includes('title')) {
      return 'naming';
    }
    if (lowerInput.includes('story') || lowerInput.includes('write') || lowerInput.includes('character') || lowerInput.includes('plot')) {
      return 'story';
    }
    return 'brainstorm';
  }

  private generateBrainstormResponse(input: string): string {
    const subject = this.extractSubject(input);
    const context = this.analyzeCreativeContext(input);
    
    return `🌟 Let's brainstorm some creative ideas for ${subject}!

💡 **Fresh Perspectives:**
${this.generateFreshPerspectives(subject, context)}

🎨 **Concrete Ideas:**
${this.generateConcreteIdeas(subject, context)}

🚀 **Implementation Ready:**
${this.generateImplementationIdeas(subject, context)}

✨ **Wild Card Options:**
${this.generateWildCardIdeas(subject, context)}

🎯 **My Top Recommendation:**
${this.generateTopRecommendation(subject, context)}

**Ready to develop any of these further?** I can help you flesh out the details, create variations, or brainstorm implementation strategies for whichever direction excites you most!`;
  }

  private generateNamingResponse(input: string): string {
    const subject = this.extractSubject(input);
    const namingContext = this.analyzeNamingContext(input);
    
    return `🎯 Perfect! Let me help you name ${subject}:

📝 **Tailored Name Ideas:**
${this.generateTailoredNames(subject, namingContext)}

🔤 **Creative Variations:**
${this.generateNameVariations(subject, namingContext)}

⭐ **My Top Pick:**
${this.generateTopNamePick(subject, namingContext)}

💡 **Branding Considerations:**
${this.generateBrandingAdvice(subject, namingContext)}

🔍 **Before You Decide:**
${this.generateNamingChecklist(subject)}

Want me to generate more options in any particular style, or shall we dive deeper into developing the branding around your favorite name?`;
  }

  private generateStoryResponse(input: string): string {
    const subject = this.extractSubject(input);
    const storyContext = this.analyzeStoryContext(input);
    
    return `📖 Exciting! Let me craft some story ideas around ${subject}:

**🌱 Story Concepts:**
${this.generateStoryConcepts(subject, storyContext)}

**🎭 Character Ideas:**
${this.generateCharacterIdeas(subject, storyContext)}

**🌍 Setting Options:**
${this.generateSettingOptions(subject, storyContext)}

**🔥 Conflict & Stakes:**
${this.generateConflictIdeas(subject, storyContext)}

**✨ Unique Hooks:**
${this.generateUniqueHooks(subject, storyContext)}

**📝 Writing Prompts:**
${this.generateWritingPrompts(subject, storyContext)}

Which direction sparks your imagination? I can help you develop any of these into a full story outline or create character profiles to get you started!`;
  }

  private extractSubject(input: string): string {
    // Enhanced extraction logic for various creative contexts
    const patterns = [
      /name\s+for\s+(?:a\s+|an\s+|the\s+|my\s+)?(.+)/i,
      /call\s+(?:it\s+|the\s+|this\s+|my\s+)?(.+)/i,
      /title\s+for\s+(?:a\s+|an\s+|the\s+|my\s+)?(.+)/i,
      /ideas?\s+for\s+(?:a\s+|an\s+|the\s+|my\s+)?(.+)/i,
      /brainstorm\s+(?:about\s+|for\s+|around\s+)?(.+)/i,
      /create\s+(?:a\s+|an\s+|some\s+)?(.+)/i,
      /story\s+about\s+(.+)/i,
      /write\s+(?:a\s+|an\s+|some\s+)?(.+)/i
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: extract meaningful words
    const words = input.replace(/^(brainstorm|create|generate|come up with|think of|ideas?|name|story)/i, '').trim();
    return words || 'your creative project';
  }

  // Context analysis methods
  private analyzeCreativeContext(input: string): any {
    const lowerInput = input.toLowerCase();
    return {
      type: this.determineCreativeType(lowerInput),
      industry: this.inferIndustry(lowerInput),
      tone: this.inferTone(lowerInput),
      target: this.inferTarget(lowerInput)
    };
  }

  private analyzeNamingContext(input: string): any {
    const lowerInput = input.toLowerCase();
    return {
      type: this.determineNamingType(lowerInput),
      industry: this.inferIndustry(lowerInput),
      style: this.inferNamingStyle(lowerInput)
    };
  }

  private analyzeStoryContext(input: string): any {
    const lowerInput = input.toLowerCase();
    return {
      genre: this.inferGenre(lowerInput),
      length: this.inferLength(lowerInput),
      audience: this.inferAudience(lowerInput)
    };
  }

  // Content generation methods
  private generateFreshPerspectives(subject: string, context: any): string {
    const perspectives = [
      `**Flip the Script**: What if ${subject} worked in reverse?`,
      `**Cross-Industry**: How would the gaming industry approach ${subject}?`,
      `**Future Vision**: Imagine ${subject} in 2030 with AI integration`,
      `**Simplicity Focus**: Strip ${subject} down to its absolute essence`
    ];
    return perspectives.join('\n');
  }

  private generateConcreteIdeas(subject: string, context: any): string {
    if (subject.toLowerCase().includes('app')) {
      return `1. **Social Integration**: Connect users with similar interests/goals
2. **Gamification Layer**: Progress tracking with rewards and achievements  
3. **AI Assistant**: Smart recommendations based on user behavior
4. **Community Features**: User-generated content and peer support`;
    }
    
    return `1. **User-Centric Approach**: Focus on solving real user pain points
2. **Modular Design**: Build components that work independently
3. **Feedback Loop**: Built-in system for continuous improvement
4. **Accessibility First**: Design for all users from the start`;
  }

  private generateImplementationIdeas(subject: string, context: any): string {
    return `1. **MVP Strategy**: Start with core feature and iterate
2. **Partner Integration**: Leverage existing platforms and APIs
3. **Content Strategy**: Plan for user onboarding and engagement
4. **Scalable Architecture**: Design for growth from day one`;
  }

  private generateWildCardIdeas(subject: string, context: any): string {
    return `1. **AR/VR Integration**: Immersive experience possibilities
2. **Blockchain Elements**: Decentralized features or NFT integration
3. **Voice Interface**: Hands-free interaction capabilities
4. **IoT Connection**: Smart device integration opportunities`;
  }

  private generateTopRecommendation(subject: string, context: any): string {
    return `I'd recommend focusing on the **User-Centric Approach** because:
• It ensures you're solving real problems, not imaginary ones
• It creates a strong foundation for product-market fit
• It guides all other design decisions naturally
• It's the most sustainable path to long-term success

Want me to help you map out the user journey and identify key pain points?`;
  }

  // Naming-specific methods
  private generateTailoredNames(subject: string, context: any): string {
    const subjectLower = subject.toLowerCase();
    
    if (subjectLower.includes('app')) {
      return `1. **FlowSpace** - Suggests smooth user experience
2. **ConnectCore** - Emphasizes connection and essential function
3. **PulseHub** - Implies activity and central gathering
4. **StreamLine** - Clean, efficient process
5. **Nexus** - Connection point for users`;
    }
    
    if (subjectLower.includes('business') || subjectLower.includes('company')) {
      return `1. **Catalyst Ventures** - Suggests transformation and growth
2. **Meridian Solutions** - Implies guidance and direction
3. **Apex Dynamics** - Peak performance and movement
4. **Compass Strategies** - Navigation and strategic direction
5. **Momentum Partners** - Forward movement and collaboration`;
    }
    
    return `1. **[Subject]Core** - Emphasizes the essential nature
2. **[Subject]Flow** - Suggests smooth, efficient operation
3. **[Subject]Hub** - Central gathering or connection point
4. **[Subject]Spark** - Innovation and energy
5. **[Subject]Nexus** - Connection and convergence`;
  }

  private generateNameVariations(subject: string, context: any): string {
    return `• **Portmanteau**: Blend two relevant words
• **Metaphorical**: Use nature, space, or journey imagery
• **Action-Based**: Verbs that describe what you do
• **Invented Words**: Create something entirely new
• **Acronyms**: Meaningful abbreviations with good pronunciation`;
  }

  private generateTopNamePick(subject: string, context: any): string {
    return `**FlowSpace** - Here's why it works:
• Easy to remember and pronounce
• Suggests both movement and environment
• Works across different contexts
• Has positive connotations
• Available domains likely exist (.com, .app)
• Scalable for future product expansion`;
  }

  private generateBrandingAdvice(subject: string, context: any): string {
    return `• **Domain Check**: Verify .com availability before deciding
• **Social Media**: Check Instagram, Twitter, TikTok handles
• **Trademark Search**: Basic USPTO search for conflicts
• **International Considerations**: How does it sound in other languages?
• **Visual Identity**: How will it look in logos and graphics?`;
  }

  private generateNamingChecklist(subject: string): string {
    return `□ Easy to spell and pronounce
□ Memorable after hearing once
□ Available domain name (.com preferred)
□ No negative connotations
□ Works in your target markets
□ Scales with business growth
□ Differentiates from competitors`;
  }

  // Story-specific methods
  private generateStoryConcepts(subject: string, context: any): string {
    const genre = context.genre || 'general';
    
    if (genre.includes('sci-fi') || subject.toLowerCase().includes('future')) {
      return `1. **The Last Creative**: In an AI-dominated world, human creativity becomes rare
2. **Memory Merchants**: People who sell their experiences as entertainment
3. **The Glitch**: Reality simulation starts showing cracks
4. **Quantum Twins**: Parallel universe versions start bleeding through`;
    }
    
    return `1. **The Unlikely Mentor**: Experienced guide meets eager newcomer
2. **Hidden World**: Ordinary person discovers extraordinary reality
3. **The Choice**: Character must decide between two life paths
4. **Second Chances**: Opportunity to redo a crucial moment`;
  }

  private generateCharacterIdeas(subject: string, context: any): string {
    return `• **The Dreamer**: Visionary with big ideas but needs grounding
• **The Skeptic**: Practical person who questions everything  
• **The Catalyst**: Character who drives change in others
• **The Guardian**: Protector of important knowledge/secrets
• **The Outsider**: Fresh perspective from different background`;
  }

  private generateSettingOptions(subject: string, context: any): string {
    return `• **Contemporary**: Modern day with familiar elements
• **Near Future**: 10-20 years ahead with believable tech
• **Alternate History**: Our world but one key thing changed
• **Hidden Society**: Secret world within our ordinary one
• **Liminal Space**: Between worlds, times, or realities`;
  }

  private generateConflictIdeas(subject: string, context: any): string {
    return `• **Internal Struggle**: Character vs their own fears/doubts
• **Relationship Tension**: Conflicting needs between characters
• **System Challenge**: Individual vs institution/society
• **Resource Scarcity**: Competition for limited valuable thing
• **Time Pressure**: Important deadline creates urgency`;
  }

  private generateUniqueHooks(subject: string, context: any): string {
    return `• **Inverted Expectations**: The "villain" is actually trying to help
• **Dual Timeline**: Past and present stories mirror each other
• **Unreliable Reality**: What seems real might not be
• **Role Reversal**: Characters swap positions/perspectives
• **Hidden Connection**: Seemingly unrelated events are linked`;
  }

  private generateWritingPrompts(subject: string, context: any): string {
    return `1. "The day I discovered that everyone else could hear thoughts, and I was the only one who couldn't..."
2. "The antique shop owner handed me the key and said, 'This opens any door, but only once.'"
3. "My reflection started moving independently three days ago, and today it waved at me."
4. "The job posting was simple: 'Night shift. No questions asked. Bring your own flashlight.'"
5. "Every morning I wake up knowing something I didn't know yesterday, but I can't remember learning it."`;
  }

  // Helper methods for context analysis
  private determineCreativeType(input: string): string {
    if (input.includes('product') || input.includes('app')) return 'product';
    if (input.includes('business') || input.includes('startup')) return 'business';
    if (input.includes('content') || input.includes('marketing')) return 'content';
    if (input.includes('event') || input.includes('campaign')) return 'event';
    return 'general';
  }

  private determineNamingType(input: string): string {
    if (input.includes('company') || input.includes('business')) return 'business';
    if (input.includes('product') || input.includes('app')) return 'product';
    if (input.includes('brand') || input.includes('logo')) return 'brand';
    if (input.includes('project') || input.includes('initiative')) return 'project';
    return 'general';
  }

  private inferIndustry(input: string): string {
    if (input.includes('tech') || input.includes('software') || input.includes('app')) return 'technology';
    if (input.includes('health') || input.includes('medical') || input.includes('wellness')) return 'healthcare';
    if (input.includes('education') || input.includes('learning') || input.includes('school')) return 'education';
    if (input.includes('finance') || input.includes('money') || input.includes('banking')) return 'finance';
    return 'general';
  }

  private inferTone(input: string): string {
    if (input.includes('professional') || input.includes('corporate')) return 'professional';
    if (input.includes('fun') || input.includes('playful') || input.includes('game')) return 'playful';
    if (input.includes('serious') || input.includes('formal')) return 'serious';
    if (input.includes('casual') || input.includes('friendly')) return 'casual';
    return 'balanced';
  }

  private inferTarget(input: string): string {
    if (input.includes('young') || input.includes('teen') || input.includes('student')) return 'youth';
    if (input.includes('professional') || input.includes('business')) return 'professionals';
    if (input.includes('family') || input.includes('parent')) return 'families';
    if (input.includes('senior') || input.includes('elderly')) return 'seniors';
    return 'general';
  }

  private inferNamingStyle(input: string): string {
    if (input.includes('modern') || input.includes('sleek')) return 'modern';
    if (input.includes('classic') || input.includes('traditional')) return 'classic';
    if (input.includes('creative') || input.includes('unique')) return 'creative';
    if (input.includes('simple') || input.includes('clean')) return 'simple';
    return 'balanced';
  }

  private inferGenre(input: string): string {
    if (input.includes('sci-fi') || input.includes('science fiction') || input.includes('future')) return 'sci-fi';
    if (input.includes('fantasy') || input.includes('magic') || input.includes('dragon')) return 'fantasy';
    if (input.includes('mystery') || input.includes('detective') || input.includes('crime')) return 'mystery';
    if (input.includes('romance') || input.includes('love')) return 'romance';
    if (input.includes('horror') || input.includes('scary') || input.includes('thriller')) return 'horror';
    return 'general';
  }

  private inferLength(input: string): string {
    if (input.includes('short') || input.includes('flash')) return 'short';
    if (input.includes('novel') || input.includes('book')) return 'novel';
    if (input.includes('screenplay') || input.includes('script')) return 'screenplay';
    return 'medium';
  }

  private inferAudience(input: string): string {
    if (input.includes('children') || input.includes('kids')) return 'children';
    if (input.includes('young adult') || input.includes('ya')) return 'young-adult';
    if (input.includes('adult') || input.includes('mature')) return 'adult';
    return 'general';
  }

  private extractGoalTag(input: string, taskType: string): string {
    // Extract subject for goal tracking
    const subject = this.extractSubject(input);
    const cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).slice(0, 3).join('_').toLowerCase();
    return cleanSubject || taskType;
  }

  private async logInteraction(message: AgentMessage): Promise<void> {
    await this.memoryManager.logMessage(message);
  }

  private generateId(): string {
    return `creative_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }
}