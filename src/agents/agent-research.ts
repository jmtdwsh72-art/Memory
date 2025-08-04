import { AgentConfig, AgentMessage, AgentResponse } from '../utils/types';
import { MemoryManager } from '../utils/memory-manager';
import { getAgentConfig } from '../utils/config-utils';
import { useAgentMemoryWithPreset } from '../utils/memory-hooks';

export class ResearchAgent {
  private config: AgentConfig;
  private memoryManager: MemoryManager;

  constructor() {
    // Load validated configuration using centralized utility
    this.config = getAgentConfig('research');
    this.memoryManager = new MemoryManager();
  }

  async processInput(input: string, userId?: string): Promise<AgentResponse> {
    try {
      // Use centralized memory utilities with research preset
      const memory = useAgentMemoryWithPreset(this.config.id, 'research', userId);
      
      // Recall relevant memories using preset configuration
      const memoryContext = await memory.recallWithPreset(input);
      const contextString = memory.buildContext(memoryContext);
      
      const response = await this.generateResponse(input, contextString);
      
      // Store interaction using centralized utility with goal tracking
      const intent = this.analyzeResearchIntent(input);
      const goalTag = `${intent.type}_${intent.subject.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).slice(0, 3).join('_').toLowerCase()}`;
      
      // Save as goal type with appropriate tags
      await memory.saveMemory(
        input, 
        response, 
        `research_goal: ${goalTag}`,
        'goal',
        ['research', intent.type, intent.subject.toLowerCase(), 'learning_goal']
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
        message: `Research agent error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }


  private async generateResponse(input: string, memoryContext: string): Promise<string> {
    // Analyze the intent and context to provide practical guidance
    const intent = this.analyzeResearchIntent(input);
    let response = '';

    // Generate contextual response based on user's actual need
    switch (intent.type) {
      case 'learning':
        response = this.generateLearningGuidance(input, intent);
        break;
      case 'comparison':
        response = this.generateComparisonAnalysis(input, intent);
        break;
      case 'explanation':
        response = this.generateExplanation(input, intent);
        break;
      case 'exploration':
        response = this.generateExplorationGuide(input, intent);
        break;
      case 'analysis':
        response = this.generateAnalysisFramework(input, intent);
        break;
      default:
        response = this.generateGeneralResearch(input, intent);
    }

    // Add contextual memory if available and relevant
    if (memoryContext && memoryContext.trim()) {
      response += `\n\n📚 **Building on our previous research:**\n${memoryContext}`;
    }

    // Add memory tag for goal tracking
    if (intent.subject) {
      response += `\n\n*Saving this as a ${intent.type} goal: ${intent.subject}*`;
    }
    
    return response;
  }

  private analyzeResearchIntent(input: string): { type: string; subject: string; specifics: string[] } {
    const lowerInput = input.toLowerCase().trim();
    
    // Learning patterns
    if (lowerInput.match(/\b(learn|understand|teach me|explain|how to|study|master)\b/)) {
      return {
        type: 'learning',
        subject: this.extractMainSubject(input),
        specifics: this.extractSpecifics(input)
      };
    }
    
    // Comparison patterns
    if (lowerInput.match(/\b(compare|vs|versus|difference|better|choose|alternatives)\b/)) {
      return {
        type: 'comparison',
        subject: this.extractMainSubject(input),
        specifics: this.extractComparables(input)
      };
    }
    
    // Explanation patterns
    if (lowerInput.match(/\b(what is|what are|define|meaning|concept of)\b/)) {
      return {
        type: 'explanation',
        subject: this.extractMainSubject(input),
        specifics: this.extractSpecifics(input)
      };
    }
    
    // Exploration patterns
    if (lowerInput.match(/\b(explore|investigate|research|find out|discover|trends)\b/)) {
      return {
        type: 'exploration',
        subject: this.extractMainSubject(input),
        specifics: this.extractSpecifics(input)
      };
    }
    
    // Analysis patterns
    if (lowerInput.match(/\b(analyze|analysis|evaluate|assess|examine|study)\b/)) {
      return {
        type: 'analysis',
        subject: this.extractMainSubject(input),
        specifics: this.extractSpecifics(input)
      };
    }
    
    return {
      type: 'general',
      subject: this.extractMainSubject(input),
      specifics: this.extractSpecifics(input)
    };
  }

  private generateLearningGuidance(input: string, intent: any): string {
    const subject = intent.subject;
    
    return `Absolutely! Here's a beginner-friendly roadmap to start learning ${subject}:

## 🎯 **Getting Started with ${subject}**

### **Step 1: Foundation Setup**
${this.generateFoundationSteps(subject)}

### **Step 2: Core Concepts**
${this.generateCoreConcepts(subject)}

### **Step 3: Practice & Application**
${this.generatePracticeSteps(subject)}

### **Step 4: Advanced Learning**
${this.generateAdvancedSteps(subject)}

## 📚 **Recommended Resources**
${this.generateResources(subject)}

## 🎯 **Next Steps**
${this.generateNextSteps(subject)}

Would you like me to help you dive deeper into any specific area, or shall we start with your first hands-on project?`;
  }

  private generateComparisonAnalysis(input: string, intent: any): string {
    const comparables = intent.specifics.length > 1 ? intent.specifics : this.inferComparables(intent.subject);
    
    return `Great question! Here's a comprehensive comparison to help you make an informed decision:

## 🔍 **${intent.subject} Comparison**

### **Key Evaluation Criteria:**
${this.generateEvaluationCriteria(intent.subject)}

### **Detailed Comparison:**
${this.generateDetailedComparison(comparables, intent.subject)}

### **Use Case Recommendations:**
${this.generateUseCaseRecommendations(comparables, intent.subject)}

## 🎯 **My Recommendation**
${this.generateRecommendation(comparables, intent.subject)}

## 📊 **Decision Framework**
${this.generateDecisionFramework(intent.subject)}

Need help with any specific aspect of this comparison, or would you like me to research more detailed information about any particular option?`;
  }

  private generateExplanation(input: string, intent: any): string {
    const subject = intent.subject;
    
    return `Let me break down ${subject} for you in clear, practical terms:

## 💡 **What is ${subject}?**
${this.generateConceptDefinition(subject)}

## 🔍 **Key Components**
${this.generateKeyComponents(subject)}

## 🚀 **How It Works**
${this.generateHowItWorks(subject)}

## 🌟 **Why It Matters**
${this.generateWhyItMatters(subject)}

## 📝 **Simple Example**
${this.generateSimpleExample(subject)}

## 🔗 **Related Concepts**
${this.generateRelatedConcepts(subject)}

Does this help clarify things? I'm happy to dive deeper into any part that interests you or explain how this applies to your specific situation!`;
  }

  private generateExplorationGuide(input: string, intent: any): string {
    const subject = intent.subject;
    
    return `Excellent! Let's explore ${subject} systematically. Here's your research roadmap:

## 🗺️ **${subject} Exploration Guide**

### **Phase 1: Current Landscape**
${this.generateCurrentLandscape(subject)}

### **Phase 2: Key Players & Trends**
${this.generateKeyPlayersAndTrends(subject)}

### **Phase 3: Deep Dive Areas**
${this.generateDeepDiveAreas(subject)}

### **Phase 4: Future Outlook**
${this.generateFutureOutlook(subject)}

## 🔍 **Research Methods**
${this.generateResearchMethods(subject)}

## 📊 **What to Look For**
${this.generateWhatToLookFor(subject)}

## 🎯 **Action Items**
${this.generateActionItems(subject)}

Ready to start with Phase 1, or would you prefer to focus on a specific aspect that caught your attention?`;
  }

  private generateAnalysisFramework(input: string, intent: any): string {
    const subject = intent.subject;
    
    return `Perfect! Let's set up a comprehensive analysis framework for ${subject}:

## 📊 **Analysis Framework for ${subject}**

### **1. Analytical Approach**
${this.generateAnalyticalApproach(subject)}

### **2. Data Collection Strategy**
${this.generateDataCollectionStrategy(subject)}

### **3. Evaluation Metrics**
${this.generateEvaluationMetrics(subject)}

### **4. Analysis Methods**
${this.generateAnalysisMethods(subject)}

### **5. Expected Insights**
${this.generateExpectedInsights(subject)}

## 🎯 **Implementation Plan**
${this.generateImplementationPlan(subject)}

## 📈 **Success Indicators**
${this.generateSuccessIndicators(subject)}

Shall we begin with the data collection phase, or would you like to refine any part of this framework first?`;
  }

  private generateGeneralResearch(input: string, intent: any): string {
    const subject = intent.subject;
    
    return `I'll help you research ${subject} thoroughly! Here's how we can approach this:

## 🔬 **Research Strategy for ${subject}**

### **Understanding Your Goals**
${this.generateGoalUnderstanding(subject)}

### **Research Approach**
${this.generateResearchApproach(subject)}

### **Key Questions to Explore**
${this.generateKeyQuestions(subject)}

### **Information Sources**
${this.generateInformationSources(subject)}

### **Next Steps**
${this.generateGeneralNextSteps(subject)}

What specific aspect of ${subject} would you like to focus on first? I can help you develop a more targeted research plan based on your particular interests or needs.`;
  }

  // Helper methods for generating practical, subject-specific content
  
  private extractMainSubject(input: string): string {
    // Remove common question words and extract the main subject
    const cleaned = input.replace(/^(i want to |how to |what is |tell me about |explain |learn |understand |study )/i, '').trim();
    const words = cleaned.split(/\s+/);
    
    // Look for key technical terms, proper nouns, or significant concepts
    const significantWords = words.filter(word => 
      word.length > 2 && 
      !['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about'].includes(word.toLowerCase())
    );
    
    return significantWords.slice(0, 3).join(' ') || 'the topic you mentioned';
  }

  private extractSpecifics(input: string): string[] {
    const words = input.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'i', 'want', 'to', 'how', 'what', 'is'];
    return words.filter(word => word.length > 3 && !stopWords.includes(word)).slice(0, 5);
  }

  private extractComparables(input: string): string[] {
    const vsMatches = input.match(/(.+?)\s+(?:vs|versus|compared to|against)\s+(.+)/i);
    if (vsMatches) {
      return [vsMatches[1].trim(), vsMatches[2].trim()];
    }
    
    const orMatches = input.match(/(.+?)\s+or\s+(.+)/i);
    if (orMatches) {
      return [orMatches[1].trim(), orMatches[2].trim()];
    }
    
    return this.extractSpecifics(input);
  }

  // Content generation methods with practical, subject-specific guidance
  
  private generateFoundationSteps(subject: string): string {
    const subjectLower = subject.toLowerCase();
    
    if (subjectLower.includes('python')) {
      return `• Install Python from python.org (choose the latest stable version)
• Set up a code editor (VS Code, PyCharm, or Sublime Text)
• Learn to use the command line/terminal
• Install pip package manager (usually comes with Python)`;
    }
    
    if (subjectLower.includes('javascript') || subjectLower.includes('web development')) {
      return `• Set up a text editor (VS Code recommended)
• Install Node.js from nodejs.org
• Learn HTML and CSS basics first
• Set up a local development environment`;
    }
    
    if (subjectLower.includes('machine learning') || subjectLower.includes('ai')) {
      return `• Strong foundation in Python programming
• Install Anaconda or Miniconda for package management
• Basic statistics and linear algebra knowledge
• Set up a Jupyter notebook environment`;
    }
    
    return `• Identify the core prerequisites and tools needed
• Set up your development/learning environment
• Gather essential resources and documentation
• Create a dedicated learning space and schedule`;
  }

  private generateCoreConcepts(subject: string): string {
    const subjectLower = subject.toLowerCase();
    
    if (subjectLower.includes('python')) {
      return `• Variables and data types (strings, numbers, lists, dictionaries)
• Control structures (if/else, loops)
• Functions and modules
• Object-oriented programming basics
• Error handling with try/except`;
    }
    
    if (subjectLower.includes('machine learning')) {
      return `• Supervised vs unsupervised learning
• Training and testing data concepts
• Common algorithms (linear regression, decision trees, neural networks)
• Model evaluation and validation
• Feature engineering and data preprocessing`;
    }
    
    return `• Fundamental principles and terminology
• Key concepts and their relationships
• Basic operations and processes
• Common patterns and best practices
• Essential tools and methodologies`;
  }

  private generatePracticeSteps(subject: string): string {
    const subjectLower = subject.toLowerCase();
    
    if (subjectLower.includes('python')) {
      return `• Build a simple calculator program
• Create a to-do list application
• Work with files (reading/writing data)
• Try web scraping with BeautifulSoup
• Build a simple game (like number guessing)`;
    }
    
    if (subjectLower.includes('machine learning')) {
      return `• Start with the Iris dataset classification
• Implement linear regression from scratch
• Use scikit-learn for common algorithms
• Work on a data visualization project
• Try a Kaggle competition for beginners`;
    }
    
    return `• Start with simple, hands-on exercises
• Build small projects to apply concepts
• Work through real-world examples
• Join practice communities or challenges
• Create a portfolio of your work`;
  }

  private generateAdvancedSteps(subject: string): string {
    const subjectLower = subject.toLowerCase();
    
    if (subjectLower.includes('python')) {
      return `• Learn advanced libraries (pandas, numpy, matplotlib)
• Understand decorators and context managers
• Explore web frameworks (Django, Flask)
• Master testing and debugging techniques
• Contribute to open-source projects`;
    }
    
    return `• Explore advanced techniques and methodologies
• Work on complex, multi-faceted projects
• Learn related technologies and integrations
• Participate in professional communities
• Consider specialization areas`;
  }

  private generateResources(subject: string): string {
    const subjectLower = subject.toLowerCase();
    
    if (subjectLower.includes('python')) {
      return `• **Online Courses**: Python.org tutorial, Codecademy, freeCodeCamp
• **Books**: "Automate the Boring Stuff with Python", "Python Crash Course"
• **Practice**: LeetCode, HackerRank, Project Euler
• **Documentation**: Official Python docs, Real Python website
• **Communities**: r/Python, Python Discord, Stack Overflow`;
    }
    
    if (subjectLower.includes('machine learning')) {
      return `• **Courses**: Andrew Ng's ML Course, Fast.ai, Kaggle Learn
• **Books**: "Hands-On Machine Learning", "Pattern Recognition and Machine Learning"
• **Platforms**: Google Colab, Jupyter notebooks, Kaggle
• **Libraries**: scikit-learn, TensorFlow, PyTorch
• **Communities**: r/MachineLearning, ML Twitter, Papers with Code`;
    }
    
    return `• **Official Documentation**: Primary source material and guides
• **Online Courses**: Structured learning platforms and MOOCs
• **Books**: Comprehensive textbooks and practical guides
• **Communities**: Forums, Discord servers, and professional networks
• **Practice Platforms**: Hands-on learning and project sites`;
  }

  private generateNextSteps(subject: string): string {
    return `1. **Start Today**: Pick one concept and spend 30 minutes on it
2. **Build Something**: Apply what you learn immediately through projects
3. **Join a Community**: Find others learning ${subject} for support and motivation
4. **Set Milestones**: Create weekly goals to track your progress
5. **Practice Regularly**: Consistency beats intensity - aim for daily practice

**Ready to begin?** I can help you create a personalized learning plan or guide you through your first project step by step!`;
  }

  private inferComparables(subject: string): string[] {
    const subjectLower = subject.toLowerCase();
    
    if (subjectLower.includes('python')) {
      return ['Python', 'JavaScript', 'Java'];
    }
    if (subjectLower.includes('react')) {
      return ['React', 'Vue', 'Angular'];
    }
    if (subjectLower.includes('database')) {
      return ['MySQL', 'PostgreSQL', 'MongoDB'];
    }
    
    return [subject, 'alternatives'];
  }

  // Simplified implementations for other methods (can be expanded based on specific subjects)
  private generateEvaluationCriteria(subject: string): string {
    return `• **Ease of Learning**: How beginner-friendly is each option?
• **Performance**: Speed and efficiency considerations
• **Community Support**: Documentation, tutorials, and help availability
• **Career Prospects**: Industry demand and job opportunities
• **Ecosystem**: Available libraries, tools, and integrations`;
  }

  private generateDetailedComparison(comparables: string[], subject: string): string {
    return comparables.map((item, index) => 
      `**${item}:**
• Strengths: [Key advantages and use cases]
• Weaknesses: [Limitations and challenges] 
• Best For: [Ideal scenarios and applications]`
    ).join('\n\n');
  }

  private generateUseCaseRecommendations(comparables: string[], subject: string): string {
    return `• **For Beginners**: [Most beginner-friendly option with reasoning]
• **For Performance**: [Best option when speed/efficiency is critical]
• **For Large Projects**: [Most suitable for enterprise-level applications]
• **For Quick Prototyping**: [Fastest to get started and build MVPs]`;
  }

  private generateRecommendation(comparables: string[], subject: string): string {
    return `Based on current trends and practical considerations, I'd recommend **${comparables[0] || subject}** for most beginners because:

• It has excellent learning resources and community support
• It's versatile and applicable to many different projects
• There's strong industry demand and career opportunities
• The learning curve is manageable for newcomers

However, the best choice ultimately depends on your specific goals and context. What are you hoping to achieve with ${subject}?`;
  }

  private generateDecisionFramework(subject: string): string {
    return `**Ask Yourself:**
1. What's my primary goal? (learning, career change, specific project)
2. How much time can I dedicate to learning?
3. Do I have any prior experience in related areas?
4. What kind of projects do I want to build?
5. Are there specific industry requirements I need to meet?

**Your answers will help determine the best path forward!**`;
  }

  // Simplified implementations for other template methods
  private generateConceptDefinition(subject: string): string {
    return `${subject} is [practical definition with real-world context and applications].`;
  }

  private generateKeyComponents(subject: string): string {
    return `• Component 1: [Brief description and purpose]
• Component 2: [Brief description and purpose]
• Component 3: [Brief description and purpose]`;
  }

  private generateHowItWorks(subject: string): string {
    return `Here's a simplified overview of how ${subject} works in practice: [step-by-step process with concrete examples].`;
  }

  private generateWhyItMatters(subject: string): string {
    return `${subject} is important because it [real-world impact and practical benefits for users].`;
  }

  private generateSimpleExample(subject: string): string {
    return `**Real-world example:** [Concrete, relatable example that demonstrates the concept in action].`;
  }

  private generateRelatedConcepts(subject: string): string {
    return `• Related Concept 1: [Brief explanation]
• Related Concept 2: [Brief explanation]
• Related Concept 3: [Brief explanation]`;
  }

  // Additional helper methods with simplified implementations
  private generateCurrentLandscape(subject: string): string {
    return `Current state of ${subject}: [overview of current trends, key players, and developments]`;
  }

  private generateKeyPlayersAndTrends(subject: string): string {
    return `Key players and trends in ${subject}: [important companies, technologies, and emerging patterns]`;
  }

  private generateDeepDiveAreas(subject: string): string {
    return `Areas worth exploring in depth: [specific aspects that warrant detailed investigation]`;
  }

  private generateFutureOutlook(subject: string): string {
    return `Future outlook for ${subject}: [predictions and emerging opportunities]`;
  }

  private generateResearchMethods(subject: string): string {
    return `Research methods for ${subject}: [specific approaches and methodologies to investigate this topic]`;
  }

  private generateWhatToLookFor(subject: string): string {
    return `Key indicators to watch: [metrics, signals, and patterns that matter for ${subject}]`;
  }

  private generateActionItems(subject: string): string {
    return `Immediate action items: [specific steps you can take to deepen your understanding]`;
  }

  private generateAnalyticalApproach(subject: string): string {
    return `Analytical approach for ${subject}: [systematic methodology for analysis]`;
  }

  private generateDataCollectionStrategy(subject: string): string {
    return `Data collection strategy: [sources and methods for gathering relevant information]`;
  }

  private generateEvaluationMetrics(subject: string): string {
    return `Key metrics to evaluate: [quantitative and qualitative measures]`;
  }

  private generateAnalysisMethods(subject: string): string {
    return `Analysis methods: [specific techniques and tools for examination]`;
  }

  private generateExpectedInsights(subject: string): string {
    return `Expected insights: [types of findings and conclusions you can anticipate]`;
  }

  private generateImplementationPlan(subject: string): string {
    return `Implementation plan: [step-by-step approach to executing the analysis]`;
  }

  private generateSuccessIndicators(subject: string): string {
    return `Success indicators: [how you'll know the analysis is complete and valuable]`;
  }

  private generateGoalUnderstanding(subject: string): string {
    return `Understanding your research goals for ${subject}: [framework for clarifying objectives]`;
  }

  private generateResearchApproach(subject: string): string {
    return `Research approach: [systematic methodology tailored to ${subject}]`;
  }

  private generateKeyQuestions(subject: string): string {
    return `Key questions to explore: [important questions that will guide your research]`;
  }

  private generateInformationSources(subject: string): string {
    return `Information sources: [reliable sources for researching ${subject}]`;
  }

  private generateGeneralNextSteps(subject: string): string {
    return `Next steps for researching ${subject}: [immediate actions you can take]`;
  }


  private async logInteraction(message: AgentMessage): Promise<void> {
    await this.memoryManager.logMessage(message);
  }

  private generateId(): string {
    return `research_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }
}