# Memory Feedback Loop System

## 🧠 Overview

The Memory Feedback Loop System enables agents to detect, learn from, and adapt to user reactions in real-time. This creates a dynamic learning environment where agents improve their communication style and reasoning depth based on user preferences.

## 🔧 Core Components

### 1. Feedback Analyzer (`src/utils/feedback-analyzer.ts`)

**Main Function**: `analyzeUserFeedback(input, lastAgentMessage, previousMemory)`

**Detects**:
- **Positive**: "That's perfect", "Thanks, very helpful" → builds confidence
- **Confused**: "I don't get it", "That's confusing" → simplifies responses  
- **Retry**: "Try again", "Can you rephrase?" → uses different approach
- **Expansion**: "Can you go deeper?" → increases technical depth
- **Continuation**: "Okay now what?", "Next step?" → continues workflow

**Returns**:
```typescript
interface FeedbackResult {
  type: 'positive' | 'confused' | 'negative' | 'retry' | 'neutral';
  reasoningAdjustment?: 'simplify' | 'expand' | 'retry' | null;
  followUpDetected?: boolean;
  feedbackMemory?: MemoryEntry;
  confidence?: number;
}
```

### 2. Session Tracker (`src/utils/session-tracker.ts`)

Maintains conversational context by tracking:
- Last agent response for each user session
- Agent ID and reasoning level used
- Continuation context for multi-step processes
- Automatic session cleanup after 30 minutes

### 3. Reasoning Level Adjustment

Integrates with existing `reasoning-depth.ts` to:
- **Simplify**: Confused feedback → `reasoningLevel = 'basic'`
- **Expand**: Depth requests → `reasoningLevel = 'advanced'`  
- **Retry**: Failed attempts → Try different reasoning level

## 🔄 Feedback Loop Workflow

### Step 1: Agent Response
```typescript
// Agent processes input and stores session data
sessionTracker.setLastResponse(userId, agentId, response, reasoningLevel, context);
```

### Step 2: User Follow-up
```typescript
// Next user message triggers feedback analysis
const lastSession = sessionTracker.getLastResponse(userId);
const feedback = analyzeUserFeedback(input, lastSession.lastAgentResponse, memoryContext);
```

### Step 3: Dynamic Adjustment
```typescript
// Adjust reasoning level based on feedback
if (feedback.reasoningAdjustment) {
  const newLevel = adjustReasoningLevelFromFeedback(currentLevel, feedback);
  const acknowledgment = generateFeedbackAcknowledgment(feedback);
}
```

### Step 4: Memory Storage
```typescript
// Store significant feedback for long-term learning
if (feedback.feedbackMemory) {
  await memory.saveMemory(feedback.feedbackMemory, 'pattern', ['feedback', 'user_preference']);
}
```

## 🎯 Visual Feedback Markers

Agents now display real-time feedback acknowledgments:

- `🧠 Feedback detected: Simplifying explanation`
- `🔬 Feedback detected: Adding technical depth`  
- `🔄 Feedback detected: Trying a different approach`
- `✅ Feedback detected: Communication style confirmed`

## 🤖 Agent Integration

All agents (Research, Creative, Automation) now:

1. **Analyze feedback** on each user interaction
2. **Adjust reasoning levels** dynamically
3. **Store learning preferences** in memory
4. **Continue conversations** seamlessly when requested
5. **Skip introductions** for continuation requests

### Example Flow:

```
User: "Explain APIs to me"
Research Agent: [Intermediate explanation about APIs...]

User: "This is too technical, simplify it"
🧠 Feedback detected: Simplifying explanation
Research Agent: [Basic explanation in simple terms...]

User: "Perfect! Now what's the next step?"
Research Agent: [Continues with next topic without re-introduction...]
```

## 📊 Learning Patterns

The system learns user preferences over time:

- **Reasoning Level Preferences**: Tracks simplify vs expand requests
- **Communication Style**: Adapts based on positive/negative feedback
- **Topic Continuity**: Detects when users want to continue vs start fresh
- **Context Awareness**: Maintains conversation state across agent switches

## 🧪 Testing

Run `node test-feedback.js` to see the feedback system in action with various scenarios:

- Positive feedback recognition
- Confusion detection and simplification
- Technical depth requests
- Retry pattern handling
- Continuation detection

## 🔗 Integration Points

The feedback system integrates seamlessly with:

- **Reasoning Depth System**: Adjusts complexity levels
- **Memory Management**: Stores user preferences
- **Consulting Patterns**: Adapts questions and frameworks
- **Knowledge Formatting**: Changes explanation depth
- **Agent Routing**: Maintains context across agents

## 🚀 Future Enhancements

- **Sentiment Analysis**: More nuanced emotion detection
- **Learning Analytics**: Dashboard for user preference patterns
- **Proactive Suggestions**: Anticipate user needs based on patterns
- **Multi-modal Feedback**: Support for voice tone analysis
- **Confidence Scoring**: Dynamic confidence adjustment based on feedback history