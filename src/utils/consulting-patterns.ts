/**
 * Consulting Patterns Module
 * 
 * Provides agent-specific consulting utilities for clarifying questions,
 * structured frameworks, and suggested next steps tailored to each agent's
 * reasoning style and expertise domain.
 */

import { ReasoningLevel } from './reasoning-depth';

export interface ConsultingUtility {
  getClarifyingQuestions(input: string, reasoningLevel?: ReasoningLevel): string[];
  getStructuredFramework(input: string, reasoningLevel?: ReasoningLevel): string;
  getSuggestedNextSteps(input: string, reasoningLevel?: ReasoningLevel): string[];
}

interface InputAnalysis {
  keywords: string[];
  intent: string;
  domain: string;
  complexity: 'low' | 'medium' | 'high';
  hasSpecifics: boolean;
}

/**
 * Analyze user input to extract intent, keywords, and complexity
 */
function analyzeInput(input: string): InputAnalysis {
  const lowerInput = input.toLowerCase().trim();
  const words = lowerInput.split(/\s+/).filter(w => w.length > 2);
  
  // Extract keywords (filter out common words)
  const commonWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'
  ]);
  const keywords = words.filter(w => !commonWords.has(w));
  
  // Determine intent
  let intent = 'general';
  if (/\b(how|what|why|when|where)\b/.test(lowerInput)) intent = 'question';
  if (/\b(create|build|make|generate|design)\b/.test(lowerInput)) intent = 'creation';
  if (/\b(analyze|research|find|investigate|study)\b/.test(lowerInput)) intent = 'analysis';
  if (/\b(optimize|improve|automate|streamline)\b/.test(lowerInput)) intent = 'optimization';
  if (/\b(plan|strategy|approach|framework)\b/.test(lowerInput)) intent = 'planning';
  
  // Detect domain
  let domain = 'general';
  if (/\b(business|marketing|sales|revenue)\b/.test(lowerInput)) domain = 'business';
  if (/\b(tech|software|code|programming|app|python|javascript|java|html|css|coding|learn.*code|learn.*programming)\b/.test(lowerInput)) domain = 'coding';
  if (/\b(design|brand|creative|art|visual)\b/.test(lowerInput)) domain = 'design';
  if (/\b(data|analytics|research|statistics)\b/.test(lowerInput)) domain = 'data';
  if (/\b(process|workflow|automation|system)\b/.test(lowerInput)) domain = 'process';
  
  // Assess complexity and specificity
  const complexity = input.length > 100 || keywords.length > 8 ? 'high' : 
                    input.length > 50 || keywords.length > 4 ? 'medium' : 'low';
  const hasSpecifics = /\b(specific|exactly|precisely|detailed)\b/.test(lowerInput) || 
                      keywords.length > 6;
  
  return { keywords, intent, domain, complexity, hasSpecifics };
}

/**
 * Research Agent Consulting Utility
 * Focus: Logical breakdown, structured thinking, Socratic clarification
 */
const researchConsulting: ConsultingUtility = {
  getClarifyingQuestions(input: string, reasoningLevel: ReasoningLevel = 'intermediate'): string[] {
    const analysis = analyzeInput(input);
    const questions: string[] = [];
    
    // Special handling for coding/programming learning requests
    if (input.includes('learn to code') || input.includes('learn programming') || 
        /\b(learn|learning)\b.*\b(code|coding|programming|python|javascript|java|html|css)\b/i.test(input)) {
      return [
        "What kind of coding are you most interested in — websites, apps, automations, or something else?",
        "Have you ever written any code before? Even a little helps.",
        "Do you prefer to learn by reading, watching, or doing?"
      ];
    }
    
    // Socratic questioning based on intent, complexity, and reasoning level
    switch (analysis.intent) {
      case 'question':
        if (reasoningLevel === 'basic') {
          questions.push("What's the main thing you want to know about this?");
          questions.push("Would you like a simple summary or more details?");
        } else if (reasoningLevel === 'advanced') {
          questions.push("What theoretical framework or methodology should guide this analysis?");
          questions.push("What edge cases or nuanced considerations are most critical?");
        } else {
          questions.push("What specific aspect of this topic is most important for your current goals?");
          if (!analysis.hasSpecifics) {
            questions.push("Are you looking for a high-level overview or detailed technical analysis?");
          }
        }
        break;
        
      case 'analysis':
        if (reasoningLevel === 'basic') {
          questions.push("What are you trying to decide or figure out?");
          questions.push("What's most important to you in making this choice?");
        } else if (reasoningLevel === 'advanced') {
          questions.push("What quantitative metrics and qualitative factors should weight the analysis?");
          questions.push("What are the second-order effects and systemic implications to consider?");
        } else {
          questions.push("What criteria should I use to evaluate and compare different options?");
          questions.push("What's the intended outcome or decision you need to make with this research?");
        }
        break;
        
      case 'planning':
        questions.push("What constraints or requirements should I factor into this analysis?");
        questions.push("Who is the target audience for this research and planning work?");
        break;
        
      default:
        questions.push("What's the core problem or opportunity you're trying to understand?");
        if (analysis.complexity === 'low') {
          questions.push("Are there specific aspects or angles you'd like me to focus on?");
        }
    }
    
    // Domain-specific questions
    if (analysis.domain === 'business') {
      questions.push("What business context or market conditions should I consider?");
    } else if (analysis.domain === 'technology') {
      questions.push("What technical constraints or platform requirements are relevant?");
    } else if (analysis.domain === 'data') {
      questions.push("What data sources or methodologies would be most valuable?");
    }
    
    // Return questions based on reasoning level
    const questionCount = reasoningLevel === 'advanced' ? 3 : reasoningLevel === 'basic' ? 2 : Math.min(3, questions.length);
    return questions.slice(0, questionCount);
  },

  getStructuredFramework(input: string, reasoningLevel: ReasoningLevel = 'intermediate'): string {
    const analysis = analyzeInput(input);
    
    let framework = `# Research Framework: ${analysis.intent.charAt(0).toUpperCase() + analysis.intent.slice(1)}\n\n`;
    
    // Core research methodology
    framework += `## 🔍 Research Methodology\n\n`;
    framework += `**Primary Question**: ${input}\n\n`;
    
    switch (analysis.intent) {
      case 'analysis':
        framework += `### Analysis Structure\n`;
        framework += `1. **Current State Assessment**\n   - Baseline metrics and conditions\n   - Key stakeholders and influences\n\n`;
        framework += `2. **Comparative Analysis**\n   - Options evaluation matrix\n   - Pros/cons assessment\n\n`;
        framework += `3. **Gap Analysis**\n   - Identified discrepancies\n   - Root cause investigation\n\n`;
        framework += `4. **Evidence Synthesis**\n   - Key findings summary\n   - Confidence levels and limitations\n\n`;
        break;
        
      case 'planning':
        framework += `### Planning Structure\n`;
        framework += `1. **Objective Definition**\n   - Primary goals and success metrics\n   - Scope and boundaries\n\n`;
        framework += `2. **Environmental Scan**\n   - Market/context analysis\n   - Competitor/alternative assessment\n\n`;
        framework += `3. **Strategic Options**\n   - Alternative approaches\n   - Risk-benefit analysis\n\n`;
        framework += `4. **Implementation Roadmap**\n   - Phased approach\n   - Resource requirements\n\n`;
        break;
        
      default:
        framework += `### Investigation Structure\n`;
        framework += `1. **Problem Framing**\n   - Core question decomposition\n   - Assumption identification\n\n`;
        framework += `2. **Information Gathering**\n   - Primary sources\n   - Secondary research\n\n`;
        framework += `3. **Pattern Analysis**\n   - Trend identification\n   - Correlation assessment\n\n`;
        framework += `4. **Insight Generation**\n   - Key takeaways\n   - Actionable recommendations\n\n`;
    }
    
    framework += `## 📊 Success Criteria\n\n`;
    if (reasoningLevel === 'basic') {
      framework += `- **Simple**: Easy to understand without jargon\n`;
      framework += `- **Clear**: Main points are obvious\n`;
      framework += `- **Useful**: You can act on the information\n`;
    } else if (reasoningLevel === 'advanced') {
      framework += `- **Rigor**: Methodologically sound with statistical significance\n`;
      framework += `- **Depth**: Multiple levels of analysis and abstraction\n`;
      framework += `- **Innovation**: Novel insights and non-obvious connections\n`;
      framework += `- **Reproducibility**: Clear methodology for validation\n`;
    } else {
      framework += `- **Comprehensiveness**: All relevant angles covered\n`;
      framework += `- **Accuracy**: Sources verified and cross-referenced\n`;
      framework += `- **Actionability**: Clear next steps identified\n`;
      framework += `- **Clarity**: Complex information made accessible\n`;
    }
    framework += `\n`;
    
    return framework;
  },

  getSuggestedNextSteps(input: string, reasoningLevel: ReasoningLevel = 'intermediate'): string[] {
    const analysis = analyzeInput(input);
    const steps: string[] = [];
    
    // Intent-based next steps
    switch (analysis.intent) {
      case 'analysis':
        steps.push("Define specific evaluation criteria and success metrics");
        steps.push("Identify and gather primary data sources");
        steps.push("Create comparison framework with weighted factors");
        break;
        
      case 'planning':
        steps.push("Map out key stakeholders and their requirements");
        steps.push("Research industry best practices and case studies");
        steps.push("Develop initial timeline with major milestones");
        break;
        
      case 'question':
        steps.push("Break down the question into specific sub-questions");
        steps.push("Identify authoritative sources and experts to consult");
        break;
        
      default:
        steps.push("Define the scope and boundaries of the research");
        steps.push("Create initial hypothesis to test and validate");
        steps.push("Outline information gathering strategy");
    }
    
    // Domain-specific steps
    if (analysis.domain === 'business') {
      steps.push("Analyze market context and competitive landscape");
    } else if (analysis.domain === 'technology') {
      steps.push("Review technical specifications and constraints");
    } else if (analysis.domain === 'data') {
      steps.push("Establish data quality and reliability standards");
    }
    
    return steps.slice(0, 4); // Return max 4 steps
  }
};

/**
 * Creative Agent Consulting Utility
 * Focus: Divergent ideas, prompts, metaphor, naming, branding angles
 */
const creativeConsulting: ConsultingUtility = {
  getClarifyingQuestions(input: string, reasoningLevel: ReasoningLevel = 'intermediate'): string[] {
    const analysis = analyzeInput(input);
    const questions: string[] = [];
    
    // Creative exploration questions adapted to reasoning level
    switch (analysis.intent) {
      case 'creation':
        if (reasoningLevel === 'basic') {
          questions.push("What feeling do you want people to have?");
          questions.push("Can you show me examples of what you like?");
        } else if (reasoningLevel === 'advanced') {
          questions.push("What's the semiotic framework and cultural context for this creation?");
          questions.push("How can we subvert genre expectations while maintaining accessibility?");
        } else {
          questions.push("What emotions or feelings should this evoke in your audience?");
          questions.push("Are there any style references, competitors, or inspirations you love or want to avoid?");
        }
        break;
        
      case 'question':
        questions.push("What's the wildest, most unconventional approach you'd be open to exploring?");
        questions.push("If this solution had to tell a story, what kind of story would it be?");
        break;
        
      default:
        questions.push("What would make this memorable, surprising, or delightfully different?");
        questions.push("Who is your ideal audience and what makes them tick?");
    }
    
    // Domain-specific creative questions
    if (analysis.domain === 'business' || analysis.domain === 'design') {
      questions.push("What's the personality or character you want this to have?");
    } else if (analysis.domain === 'technology') {
      questions.push("How can we make this feel human and approachable rather than technical?");
    } else {
      questions.push("What metaphor or analogy could help people instantly 'get' this concept?");
    }
    
    return questions.slice(0, 3);
  },

  getStructuredFramework(input: string, reasoningLevel: ReasoningLevel = 'intermediate'): string {
    const analysis = analyzeInput(input);
    
    let framework = `# Creative Framework: ${analysis.intent.charAt(0).toUpperCase() + analysis.intent.slice(1)} Exploration\n\n`;
    
    framework += `## 🎨 Creative Process\n\n`;
    framework += `**Creative Challenge**: ${input}\n\n`;
    
    // Creative methodology based on intent
    switch (analysis.intent) {
      case 'creation':
        framework += `### Ideation Structure\n`;
        framework += `1. **Divergent Thinking**\n   - Brainstorm without limits\n   - Explore unexpected angles\n   - Generate quantity over quality\n\n`;
        framework += `2. **Concept Development**\n   - Combine and remix ideas\n   - Develop core themes\n   - Create mood and direction\n\n`;
        framework += `3. **Refinement**\n   - Select strongest concepts\n   - Develop variations\n   - Test audience appeal\n\n`;
        framework += `4. **Execution Planning**\n   - Define deliverables\n   - Map production requirements\n\n`;
        break;
        
      default:
        framework += `### Creative Exploration\n`;
        framework += `1. **Inspiration Gathering**\n   - Collect references and influences\n   - Identify patterns and trends\n   - Note emotional responses\n\n`;
        framework += `2. **Concept Generation**\n   - Mind mapping and word association\n   - Metaphor and analogy development\n   - Story and narrative exploration\n\n`;
        framework += `3. **Creative Synthesis**\n   - Combine disparate elements\n   - Find unexpected connections\n   - Develop unique angles\n\n`;
        framework += `4. **Concept Validation**\n   - Test with target audience\n   - Refine based on feedback\n   - Prepare for implementation\n\n`;
    }
    
    framework += `## 🌟 Creative Principles\n\n`;
    framework += `- **Originality**: Push beyond the obvious first ideas\n`;
    framework += `- **Relevance**: Connect deeply with the intended audience\n`;
    framework += `- **Memorability**: Create something that sticks in people's minds\n`;
    framework += `- **Authenticity**: Ensure the concept feels genuine and true\n\n`;
    
    framework += `## 🎯 Success Metrics\n\n`;
    framework += `- Does it make people stop and pay attention?\n`;
    framework += `- Is it easy to remember and share?\n`;
    framework += `- Does it solve the problem in an elegant way?\n`;
    framework += `- Would you be proud to put your name on it?\n\n`;
    
    return framework;
  },

  getSuggestedNextSteps(input: string, reasoningLevel: ReasoningLevel = 'intermediate'): string[] {
    const analysis = analyzeInput(input);
    const steps: string[] = [];
    
    // Intent-based creative steps
    switch (analysis.intent) {
      case 'creation':
        steps.push("Create a mood board or inspiration collection");
        steps.push("Generate 20+ raw ideas without self-censoring");
        steps.push("Identify 3-5 core themes or directions to explore");
        break;
        
      case 'question':
        steps.push("Reframe the question from different perspectives");
        steps.push("Look for inspiration in unrelated industries or domains");
        break;
        
      default:
        steps.push("Define the emotional tone and personality desired");
        steps.push("Research what competitors are doing (to do something different)");
        steps.push("Test initial concepts with a small audience");
    }
    
    // Domain-specific creative steps
    if (analysis.domain === 'business') {
      steps.push("Develop brand personality and voice guidelines");
    } else if (analysis.domain === 'design') {
      steps.push("Create visual style exploration and color palettes");
    } else if (analysis.domain === 'technology') {
      steps.push("Find ways to humanize technical concepts through storytelling");
    } else {
      steps.push("Experiment with different metaphors and analogies");
    }
    
    return steps.slice(0, 4);
  }
};

/**
 * Automation Agent Consulting Utility
 * Focus: Process mapping, decision logic, optimization
 */
const automationConsulting: ConsultingUtility = {
  getClarifyingQuestions(input: string, reasoningLevel: ReasoningLevel = 'intermediate'): string[] {
    const analysis = analyzeInput(input);
    const questions: string[] = [];
    
    // Process-focused questions adapted to reasoning level
    switch (analysis.intent) {
      case 'optimization':
        if (reasoningLevel === 'basic') {
          questions.push("What takes too long or causes problems in your current process?");
          questions.push("What would make this easier for you?");
        } else if (reasoningLevel === 'advanced') {
          questions.push("What's the current process flow, including edge cases and exception handling?");
          questions.push("What are the quantifiable KPIs and how do they cascade through the system?");
        } else {
          questions.push("What's the current process, and where do you see the biggest bottlenecks or inefficiencies?");
          questions.push("What would success look like in terms of time saved, errors reduced, or quality improved?");
        }
        break;
        
      case 'creation':
        questions.push("What decisions or steps currently require human judgment, and which could be automated?");
        questions.push("What systems, tools, or data sources need to integrate with this solution?");
        break;
        
      default:
        questions.push("How often does this process run, and what triggers it to start?");
        questions.push("What happens when things go wrong, and how should errors be handled?");
    }
    
    // System integration questions
    if (analysis.domain === 'technology') {
      questions.push("What technical constraints or security requirements must be considered?");
    } else if (analysis.domain === 'business') {
      questions.push("Who are the stakeholders affected by this process, and what are their needs?");
    } else {
      questions.push("What's the acceptable risk level for automation vs. human oversight?");
    }
    
    return questions.slice(0, 3);
  },

  getStructuredFramework(input: string, reasoningLevel: ReasoningLevel = 'intermediate'): string {
    const analysis = analyzeInput(input);
    
    let framework = `# Automation Framework: ${analysis.intent.charAt(0).toUpperCase() + analysis.intent.slice(1)} Optimization\n\n`;
    
    framework += `## ⚙️ Process Engineering\n\n`;
    framework += `**Automation Target**: ${input}\n\n`;
    
    // Process-based methodology
    switch (analysis.intent) {
      case 'optimization':
        framework += `### Optimization Structure\n`;
        framework += `1. **Current State Mapping**\n   - Document existing process flow\n   - Identify pain points and bottlenecks\n   - Measure baseline performance metrics\n\n`;
        framework += `2. **Opportunity Analysis**\n   - Automation potential assessment\n   - ROI calculation and prioritization\n   - Risk and complexity evaluation\n\n`;
        framework += `3. **Solution Design**\n   - Process redesign and optimization\n   - Technology selection and integration\n   - Decision logic and rule definition\n\n`;
        framework += `4. **Implementation Planning**\n   - Phased rollout strategy\n   - Testing and validation approach\n   - Change management and training\n\n`;
        break;
        
      case 'creation':
        framework += `### Automation Design\n`;
        framework += `1. **Requirements Definition**\n   - Functional specifications\n   - Performance requirements\n   - Integration needs\n\n`;
        framework += `2. **Process Architecture**\n   - Workflow design and logic\n   - Data flow and transformation\n   - Error handling and exceptions\n\n`;
        framework += `3. **System Design**\n   - Technology stack selection\n   - Infrastructure requirements\n   - Security and compliance\n\n`;
        framework += `4. **Testing Strategy**\n   - Unit and integration testing\n   - Performance and load testing\n   - User acceptance criteria\n\n`;
        break;
        
      default:
        framework += `### Process Analysis\n`;
        framework += `1. **Process Discovery**\n   - Stakeholder interviews\n   - Current state documentation\n   - Data and system inventory\n\n`;
        framework += `2. **Efficiency Analysis**\n   - Time and motion study\n   - Resource utilization review\n   - Quality and error assessment\n\n`;
        framework += `3. **Improvement Opportunities**\n   - Automation potential scoring\n   - Quick wins identification\n   - Long-term optimization roadmap\n\n`;
        framework += `4. **Solution Roadmap**\n   - Priority matrix development\n   - Resource and timeline planning\n   - Success metrics definition\n\n`;
    }
    
    framework += `## 📈 Optimization Principles\n\n`;
    framework += `- **Efficiency**: Minimize time, effort, and resources required\n`;
    framework += `- **Reliability**: Ensure consistent, predictable outcomes\n`;
    framework += `- **Scalability**: Design for growth and changing demands\n`;
    framework += `- **Maintainability**: Keep solutions simple and manageable\n\n`;
    
    framework += `## 🎯 Success Metrics\n\n`;
    framework += `- **Time Savings**: Reduction in process completion time\n`;
    framework += `- **Error Reduction**: Decrease in mistakes and rework\n`;
    framework += `- **Cost Efficiency**: Lower operational costs per unit\n`;
    framework += `- **User Satisfaction**: Improved experience for stakeholders\n\n`;
    
    return framework;
  },

  getSuggestedNextSteps(input: string, reasoningLevel: ReasoningLevel = 'intermediate'): string[] {
    const analysis = analyzeInput(input);
    const steps: string[] = [];
    
    // Process-focused next steps
    switch (analysis.intent) {
      case 'optimization':
        steps.push("Map the current process flow from start to finish");
        steps.push("Identify and measure key performance bottlenecks");
        steps.push("Calculate potential ROI and time savings from automation");
        break;
        
      case 'creation':
        steps.push("Define functional requirements and success criteria");
        steps.push("Research existing tools and platforms that could be leveraged");
        steps.push("Create proof-of-concept or minimum viable automation");
        break;
        
      default:
        steps.push("Document all current manual steps and decision points");
        steps.push("Identify which tasks are repetitive and rule-based");
        steps.push("Assess integration requirements with existing systems");
    }
    
    // Domain-specific steps
    if (analysis.domain === 'technology') {
      steps.push("Evaluate API availability and system integration options");
    } else if (analysis.domain === 'business') {
      steps.push("Analyze change management needs and stakeholder impact");
    } else if (analysis.domain === 'process') {
      steps.push("Create process visualization and workflow diagrams");
    } else {
      steps.push("Establish monitoring and alerting for the automated process");
    }
    
    return steps.slice(0, 4);
  }
};

/**
 * Default consulting utility for unknown or unsupported agent types
 */
const defaultConsulting: ConsultingUtility = {
  getClarifyingQuestions(input: string, reasoningLevel: ReasoningLevel = 'intermediate'): string[] {
    const analysis = analyzeInput(input);
    
    return [
      "What specific outcome or result are you hoping to achieve?",
      analysis.complexity === 'low' 
        ? "Are there any constraints or requirements I should be aware of?"
        : "What's the most important aspect of this request for you?",
      "How does this fit into your broader goals or objectives?"
    ].slice(0, 2);
  },

  getStructuredFramework(input: string, reasoningLevel: ReasoningLevel = 'intermediate'): string {
    return `# General Framework\n\n**Request**: ${input}\n\n## Approach\n\n1. **Understanding**\n   - Clarify requirements and goals\n   - Identify constraints and resources\n\n2. **Analysis**\n   - Break down the problem\n   - Research relevant information\n\n3. **Solution Development**\n   - Generate potential approaches\n   - Evaluate options and trade-offs\n\n4. **Implementation**\n   - Create actionable plan\n   - Define success metrics\n\n## Success Criteria\n\n- Clear understanding of requirements\n- Practical and actionable recommendations\n- Alignment with stated goals\n`;
  },

  getSuggestedNextSteps(_input: string, reasoningLevel: ReasoningLevel = 'intermediate'): string[] {
    return [
      "Clarify the specific goals and requirements",
      "Gather relevant information and context",
      "Identify potential approaches or solutions",
      "Define success criteria and next actions"
    ];
  }
};

/**
 * Agent consulting utilities map
 */
const consultingUtilities: Record<string, ConsultingUtility> = {
  research: researchConsulting,
  creative: creativeConsulting,
  automation: automationConsulting,
  // Aliases for common variations
  researcher: researchConsulting,
  analyst: researchConsulting,
  creative_agent: creativeConsulting,
  design: creativeConsulting,
  automation_agent: automationConsulting,
  process: automationConsulting,
  workflow: automationConsulting
};

/**
 * Get consulting patterns for a specific agent
 * 
 * @param agentId - The agent identifier (e.g., 'research', 'creative', 'automation')
 * @returns ConsultingUtility object with agent-specific consulting functions
 */
export function getConsultingPatterns(agentId: string): ConsultingUtility {
  const normalizedId = agentId.toLowerCase().trim();
  return consultingUtilities[normalizedId] || defaultConsulting;
}

/**
 * Export individual consulting utilities for direct access
 */
export {
  researchConsulting,
  creativeConsulting,
  automationConsulting,
  defaultConsulting
};

/**
 * Export types for external use
 */
export type { InputAnalysis };