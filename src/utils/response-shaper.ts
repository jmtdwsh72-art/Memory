export type AgentType = 'research' | 'creative' | 'automation';
export type ResponseDepth = 'basic' | 'intermediate' | 'advanced';
export type ResponseTone = 'analytical' | 'inspirational' | 'directive';

export interface ResponseSection {
  title: string;
  description: string;
  bulletPoints?: string[];
}

export interface StructuredResponsePlan {
  sections: ResponseSection[];
}

export interface ResponsePlanParams {
  topic: string;
  agentType: AgentType;
  depth: ResponseDepth;
  tone: ResponseTone;
}

// Dynamic section generators based on topic context
function generateResearchSections(topic: string, depth: ResponseDepth): ResponseSection[] {
  const topicLower = topic.toLowerCase();
  
  // Learning to code specific sections
  if (topicLower.includes('learn') && topicLower.includes('code')) {
    if (depth === 'basic') {
      return [
        { title: 'Where to Start', description: 'The most practical first steps' },
        { title: 'Essential Tools', description: 'What you actually need (skip the rest)' }
      ];
    }
    return [
      { title: 'Your Learning Path', description: 'A personalized roadmap based on your goals' },
      { title: 'Common Pitfalls', description: 'What trips up beginners (and how to avoid them)' },
      { title: 'Resources That Work', description: 'Curated tools and tutorials for your level' }
    ];
  }
  
  // Research/investigation topics
  if (topicLower.includes('research') || topicLower.includes('investigate')) {
    if (depth === 'basic') {
      return [
        { title: 'Core Findings', description: 'The essential discoveries' },
        { title: 'What This Means', description: 'Practical implications' }
      ];
    }
    return [
      { title: 'Research Landscape', description: 'Current state of knowledge' },
      { title: 'Key Developments', description: 'Recent breakthroughs and trends' },
      { title: 'Practical Applications', description: 'How to leverage these insights' },
      { title: 'Next Frontiers', description: 'Where the field is heading' }
    ];
  }
  
  // Default research sections
  if (depth === 'basic') {
    return [
      { title: 'Quick Answer', description: 'Direct response to your question' },
      { title: 'Key Details', description: 'Important points to remember' }
    ];
  }
  
  return [
    { title: 'Understanding Your Question', description: 'Breaking down what you need' },
    { title: 'Core Insights', description: 'What the evidence shows' },
    { title: 'Practical Steps', description: 'How to apply this knowledge' }
  ];
}

function generateCreativeSections(topic: string, depth: ResponseDepth): ResponseSection[] {
  const topicLower = topic.toLowerCase();
  
  // Fashion/brand specific
  if (topicLower.includes('fashion') || topicLower.includes('brand')) {
    if (depth === 'basic') {
      return [
        { title: 'Brand Concepts', description: 'Fresh angles for your vision' },
        { title: 'Visual Direction', description: 'Style and aesthetic ideas' }
      ];
    }
    return [
      { title: 'Brand Identity Ideas', description: 'Unique positioning concepts' },
      { title: 'Target Audience Vibes', description: 'Who resonates with this brand' },
      { title: 'Naming Directions', description: 'Creative approaches to brand naming' },
      { title: 'Launch Strategy', description: 'How to make a memorable entrance' }
    ];
  }
  
  // Story/content creation
  if (topicLower.includes('story') || topicLower.includes('content')) {
    return [
      { title: 'Narrative Angles', description: 'Fresh ways to tell your story' },
      { title: 'Audience Hooks', description: 'What will grab attention' },
      { title: 'Content Formats', description: 'Different ways to package your ideas' }
    ];
  }
  
  // Design projects
  if (topicLower.includes('design') || topicLower.includes('visual')) {
    return [
      { title: 'Visual Concepts', description: 'Design directions to explore' },
      { title: 'Style Inspiration', description: 'Aesthetic references and mood' },
      { title: 'Execution Ideas', description: 'How to bring the vision to life' }
    ];
  }
  
  // Default creative sections
  if (depth === 'basic') {
    return [
      { title: 'Initial Ideas', description: 'Starting points for your project' },
      { title: 'Quick Wins', description: 'What you can try right now' }
    ];
  }
  
  return [
    { title: 'Creative Directions', description: 'Different angles to explore' },
    { title: 'Inspiration Sources', description: 'Where to find fresh ideas' },
    { title: 'Making It Happen', description: 'Practical steps to execute' }
  ];
}

function generateAutomationSections(topic: string, depth: ResponseDepth): ResponseSection[] {
  const topicLower = topic.toLowerCase();
  
  // Appointment/booking automation
  if (topicLower.includes('appointment') || topicLower.includes('booking') || topicLower.includes('schedule')) {
    if (depth === 'basic') {
      return [
        { title: 'Your Current Flow', description: 'Quick audit of what needs fixing' },
        { title: 'Instant Improvements', description: 'What you can automate today' }
      ];
    }
    return [
      { title: 'Workflow Breakdown', description: 'Mapping your booking process' },
      { title: 'Tool Recommendations', description: 'Best platforms for your needs' },
      { title: 'Integration Points', description: 'Connecting calendar, payments, and reminders' },
      { title: 'Client Experience', description: 'Making it seamless for them too' }
    ];
  }
  
  // Client/customer onboarding
  if (topicLower.includes('client') || topicLower.includes('onboarding')) {
    return [
      { title: 'Onboarding Flow', description: 'Your step-by-step process' },
      { title: 'Automation Opportunities', description: 'What to automate vs. personalize' },
      { title: 'Tool Stack', description: 'Systems that work well together' },
      { title: 'First Week Plan', description: 'Getting this live quickly' }
    ];
  }
  
  // Workflow/process automation
  if (topicLower.includes('workflow') || topicLower.includes('process')) {
    if (depth === 'basic') {
      return [
        { title: 'Process Map', description: 'Your workflow visualized' },
        { title: 'Quick Automations', description: 'Low-hanging fruit to tackle first' }
      ];
    }
    return [
      { title: 'Current State Analysis', description: 'Where time gets lost' },
      { title: 'Automation Blueprint', description: 'Your optimized workflow' },
      { title: 'Tool Selection', description: 'Right tools for each step' },
      { title: 'Implementation Timeline', description: 'Realistic rollout plan' }
    ];
  }
  
  // Default automation sections
  if (depth === 'basic') {
    return [
      { title: 'Quick Solution', description: 'Immediate fix for your problem' },
      { title: 'Next Steps', description: 'How to implement this' }
    ];
  }
  
  return [
    { title: 'Process Analysis', description: 'Understanding your workflow' },
    { title: 'Automation Strategy', description: 'What to automate and how' },
    { title: 'Recommended Tools', description: 'Best solutions for your needs' }
  ];
}

function getAgentSections(agentType: AgentType, depth: ResponseDepth, topic: string): ResponseSection[] {
  switch (agentType) {
    case 'research':
      return generateResearchSections(topic, depth);
    case 'creative':
      return generateCreativeSections(topic, depth);
    case 'automation':
      return generateAutomationSections(topic, depth);
    default:
      return generateResearchSections(topic, depth);
  }
}

function adjustSectionsForTone(sections: ResponseSection[], tone: ResponseTone): ResponseSection[] {
  return sections.map(section => {
    switch (tone) {
      case 'analytical':
        return section;
      case 'inspirational':
        return {
          ...section,
          description: section.description.replace(
            /analysis|investigate|examine/gi,
            match => match.charAt(0) === match.charAt(0).toUpperCase() ? 'Explore' : 'explore'
          )
        };
      case 'directive':
        return {
          ...section,
          description: section.description.replace(
            /understanding|exploring|considering/gi,
            match => match.charAt(0) === match.charAt(0).toUpperCase() ? 'Execute' : 'execute'
          )
        };
      default:
        return section;
    }
  });
}


export function generateStructuredResponsePlan(params: ResponsePlanParams): StructuredResponsePlan {
  const { topic, agentType, depth, tone } = params;
  
  // Get dynamic sections based on topic
  let sections = getAgentSections(agentType, depth, topic);
  
  // Adjust language for tone if needed
  sections = adjustSectionsForTone(sections, tone);
  
  // For basic depth, ensure we have 2-3 sections
  if (depth === 'basic' && sections.length > 3) {
    sections = sections.slice(0, 3);
  }
  
  // For intermediate, ensure 3-4 sections  
  if (depth === 'intermediate' && sections.length > 4) {
    sections = sections.slice(0, 4);
  }
  
  return {
    sections
  };
}