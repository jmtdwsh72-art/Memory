# Domain Knowledge System

## Overview

The Domain Knowledge System enhances agent responses with structured, domain-specific expertise. When users ask questions about specific topics like Python programming or stock trading, agents automatically detect the domain and inject relevant educational content.

## Architecture

### Core Components

1. **KnowledgeModule Interface**: Standardized structure for domain expertise
2. **Knowledge Loader**: Intelligent domain detection and module loading
3. **Domain Modules**: Individual knowledge files (python.ts, stock-trading.ts, etc.)
4. **Agent Integration**: Automatic knowledge injection in agent responses

### File Structure

```
src/knowledge/
├── README.md                 # This documentation
├── python.ts                 # Python programming knowledge
├── stock-trading.ts          # Stock market and trading knowledge
└── test-knowledge.ts         # Testing utilities

src/utils/
└── knowledge-loader.ts       # Core loader and detection logic
```

## KnowledgeModule Structure

```typescript
interface KnowledgeModule {
  domain: string;                    // Display name (e.g., "Python Programming")
  summary: string;                   // Brief overview paragraph
  keyConcepts: string[];            // Important concepts to understand
  commonMistakes: string[];         // Pitfalls to avoid
  useCases: string[];               // Practical applications
  recommendedResources: {           // Learning resources
    name: string;
    url: string;
  }[];
}
```

## Domain Detection

The system uses fuzzy matching with keywords and regex patterns:

### Keywords
- **Python**: python, py, django, flask, pandas, numpy, etc.
- **Stock Trading**: stock, trading, investment, portfolio, etc.

### Patterns
- **Python**: `/\bpython\b/i`, `/\.py\b/i`, `/\bdjango\b/i`
- **Stock Trading**: `/\bstock\s+market\b/i`, `/\bday\s+trading\b/i`

### Confidence Levels
- **High** (3+ matches): Comprehensive knowledge injection
- **Medium** (1-2 matches): Selective knowledge integration  
- **Low** (0 matches): No knowledge injection

## Agent Integration

### Automatic Enhancement
All agents (Research, Creative, Automation) automatically:

1. **Detect domains** from user input
2. **Load relevant knowledge** modules
3. **Format and inject** knowledge sections
4. **Maintain clean fallback** behavior

### Response Structure
When domain knowledge is detected, agents append:

```markdown
## 🧠 Domain Knowledge: {domain}

**Summary**: {domain overview}

**Key Concepts**: {important concepts}

**Common Mistakes to Avoid**:
• {mistake 1}
• {mistake 2}

**Typical Use Cases**:
• {use case 1}
• {use case 2}

**Recommended Resources**:
• [Resource Name](url)
• [Another Resource](url)
```

## Adding New Domains

### 1. Create Knowledge Module

```typescript
// src/knowledge/your-domain.ts
import { KnowledgeModule } from '../utils/knowledge-loader';

export const yourDomainKnowledge: KnowledgeModule = {
  domain: "Your Domain Name",
  summary: "Comprehensive overview...",
  keyConcepts: ["Concept 1", "Concept 2"],
  commonMistakes: ["Mistake 1", "Mistake 2"],
  useCases: ["Use case 1", "Use case 2"],
  recommendedResources: [
    { name: "Resource", url: "https://example.com" }
  ]
};
```

### 2. Register Domain Mapping

```typescript
// In knowledge-loader.ts domainMappings
'your-domain': {
  keywords: ['keyword1', 'keyword2'],
  patterns: [/\bpattern\b/i],
  module: () => import('../knowledge/your-domain').then(m => m.yourDomainKnowledge)
}
```

## API Reference

### Functions

#### `detectDomains(input: string): string[]`
Analyzes input and returns detected domain names.

#### `getKnowledgeForInput(input: string): Promise<KnowledgeModule[]>`
Returns knowledge modules for detected domains in input.

#### `formatKnowledgeSection(modules: KnowledgeModule[]): string`
Formats knowledge modules into markdown sections.

#### `getDomainAnalytics(input: string): DomainAnalytics`
Returns detailed analytics about domain detection.

## Testing

Run the test suite:
```bash
npx tsx src/knowledge/test-knowledge.ts
```

## Best Practices

### Knowledge Module Design
- **Beginner-focused**: Assume minimal prior knowledge
- **Practical**: Focus on actionable information
- **Comprehensive**: Cover common use cases and pitfalls
- **Current**: Keep resources and information up-to-date

### Domain Detection
- **Specific keywords**: Include domain-specific terminology
- **Pattern matching**: Use regex for compound phrases
- **False positive prevention**: Ensure high precision

### Agent Integration
- **Graceful degradation**: Always provide fallback behavior
- **Contextual relevance**: Only inject when truly relevant
- **Clean formatting**: Maintain markdown consistency

## Future Enhancements

- **Dynamic loading**: Load knowledge from external APIs
- **User customization**: Allow users to prefer certain domains
- **Analytics**: Track knowledge usage and effectiveness
- **Multi-language**: Support for non-English domains
- **Personalization**: Adapt knowledge to user skill level