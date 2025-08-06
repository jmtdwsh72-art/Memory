import { openai } from './openai-gpt-client';
import { fetchMemoryContext } from './fetch-memory-context';
import { createClient } from '@supabase/supabase-js';
import { gptAgentMap } from './gpt-agent-map';
import { memoryWriter } from './memory-writer';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper function to derive agent type from assistant ID
function deriveAgentType(assistantId: string): string {
  // Reverse lookup in the gptAgentMap
  for (const [agentType, id] of Object.entries(gptAgentMap)) {
    if (id === assistantId) {
      return agentType;
    }
  }
  return 'unknown';
}

// Helper function to extract topic from user message
function extractTopic(message: string): string {
  // Simple topic extraction - take first few keywords
  const words = message.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  // Common topic indicators
  const topicKeywords = ['learn', 'code', 'programming', 'create', 'build', 'help', 'research', 'analyze', 'design'];
  const foundTopics = words.filter(word => topicKeywords.includes(word));
  
  if (foundTopics.length > 0) {
    return foundTopics.join('_');
  }
  
  // Return first meaningful word as topic
  return words[0] || 'general';
}

interface GPTAssistantOptions {
  assistantId: string;
  userMessage: string;
  userId?: string;
  topic?: string;
  metadata?: Record<string, any>;
  agentType?: string;
  threadId?: string; // For continuing existing conversations
}

interface GPTAssistantResponse {
  success: boolean;
  message: string;
  threadId?: string;
  metadata?: Record<string, any>;
}

export async function sendToGPTAssistant({
  assistantId,
  userMessage,
  userId = 'anonymous',
  topic = '',
  metadata = {},
  agentType,
  threadId
}: GPTAssistantOptions): Promise<GPTAssistantResponse> {
  try {
    // Fetch memory context from Supabase (only for new threads)
    const memoryContext = threadId ? '' : await fetchMemoryContext(userId, topic);
    
    // Use existing thread or create a new one
    let thread;
    if (threadId) {
      console.log('Continuing existing thread:', threadId);
      thread = { id: threadId };
    } else {
      console.log('Creating new thread');
      thread = await openai.beta.threads.create();
    }
    
    // Build the enhanced message with memory context
    let enhancedMessage = userMessage;
    if (memoryContext) {
      enhancedMessage = `${memoryContext}\n\n### Current Request\n${userMessage}`;
    }
    
    // Add the message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: enhancedMessage
    });
    
    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId
    });
    
    // Log the run object to debug
    console.log('Run object created:', { id: run.id, status: run.status, thread_id: thread.id });
    
    // Wait for completion using polling
    let runStatus = run;
    const runId = run.id;
    const startTime = Date.now();
    
    if (!runId) {
      throw new Error('Run ID is undefined after creation');
    }
    
    // Poll for completion
    while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        // Try to get the run status - workaround for SDK issue
        const runs = await openai.beta.threads.runs.list(thread.id);
        const currentRun = runs.data.find(r => r.id === runId);
        
        if (currentRun) {
          runStatus = currentRun;
          console.log('Run status:', runStatus.status);
        }
      } catch (pollError) {
        console.error('Error polling run status:', pollError);
        // Continue polling
      }
      
      // Timeout after 30 seconds
      if (Date.now() - startTime > 30000) {
        throw new Error('Assistant response timeout');
      }
    }
    
    if (runStatus.status === 'failed') {
      throw new Error(`Assistant run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
    }
    
    // Retrieve the assistant's response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
    
    if (!assistantMessage || !assistantMessage.content[0]) {
      throw new Error('No response from assistant');
    }
    
    const responseContent = assistantMessage.content[0].type === 'text' 
      ? assistantMessage.content[0].text.value 
      : '';
    
    // Log the interaction to Supabase
    await logToSupabase({
      userId,
      assistantId,
      agentType: agentType || metadata?.agentType || deriveAgentType(assistantId),
      userMessage,
      assistantResponse: responseContent,
      memoryContext: memoryContext || '',
      metadata: {
        ...metadata,
        topic: topic || extractTopic(userMessage),
        assistantId,
        threadId: thread.id,
        runId: runId
      }
    });

    // Analyze response and extract key facts for memory with comprehensive error handling
    let memoryWriteResult: { success: boolean; warning?: string } = { success: true };
    
    try {
      const extractionResults = await memoryWriter.analyzeAndStore(
        responseContent,
        userMessage,
        agentType || metadata?.agentType || deriveAgentType(assistantId),
        userId,
        metadata?.sessionId || userId, // sessionId
        thread.id, // threadId
        assistantId // assistantId
      );

      if (extractionResults.stored > 0) {
        console.log(`🧠 Memory Writer: Successfully extracted and stored ${extractionResults.stored} facts`);
      } else if (extractionResults.facts.length > 0) {
        console.log(`🧠 Memory Writer: Extracted ${extractionResults.facts.length} facts but ${extractionResults.facts.length - extractionResults.stored} failed to store`);
      }

      if (extractionResults.error) {
        memoryWriteResult = {
          success: false,
          warning: `Memory storage encountered issues: ${extractionResults.error}`
        };
      }

    } catch (memoryError) {
      const errorMsg = memoryError instanceof Error ? memoryError.message : 'Unknown error occurred';
      console.error('⚠️ Memory Writer pipeline failed (non-critical):', errorMsg);
      
      // In development mode, provide more details
      if (process.env.NODE_ENV === 'development') {
        console.error('Memory Writer Error Details:', memoryError);
      }
      
      memoryWriteResult = {
        success: false,
        warning: `Memory could not be saved: ${errorMsg}`
      };
    }
    
    // Prepare the response with optional memory warning in dev mode
    let finalMessage = responseContent;
    if (!memoryWriteResult.success && process.env.NODE_ENV === 'development' && memoryWriteResult.warning) {
      finalMessage += `\n\n⚠️ [Dev Note: ${memoryWriteResult.warning}]`;
    }

    return {
      success: true,
      message: finalMessage,
      threadId: thread.id,
      metadata: {
        assistantId,
        runId: runId,
        threadId: thread.id,
        memoryWriteSuccess: memoryWriteResult.success,
        ...(memoryWriteResult.warning && { memoryWarning: memoryWriteResult.warning })
      }
    };
    
  } catch (error) {
    console.error('GPT Assistant error:', error);
    return {
      success: false,
      message: `Error communicating with assistant: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

async function logToSupabase({
  userId,
  assistantId,
  agentType,
  userMessage,
  assistantResponse,
  memoryContext,
  metadata
}: {
  userId: string;
  assistantId: string;
  agentType: string;
  userMessage: string;
  assistantResponse: string;
  memoryContext: string;
  metadata: Record<string, any>;
}) {
  try {
    const { error } = await supabase.from('memory').insert({
      agent_id: agentType,
      user_id: userId,
      type: 'log',
      input: userMessage,
      output: assistantResponse,
      summary: `GPT Assistant (${agentType}): ${userMessage.substring(0, 100)}...`,
      relevance: 1.0,
      metadata: {
        ...metadata,
        routedBy: metadata.routedBy || 'router',
        memoryContext: memoryContext ? memoryContext.substring(0, 500) : null,
        timestamp: new Date().toISOString()
      }
    });
    
    if (error) {
      console.error('Error logging to Supabase:', error);
    } else {
      console.log(`✅ Logged GPT interaction for assistant ${assistantId}`);
    }
  } catch (error) {
    console.error('Error in logToSupabase:', error);
  }
}