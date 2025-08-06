import { openai } from './openai-gpt-client';

type GPTOptions = {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  max_tokens?: number;
  model?: string;
};

export async function sendMessageToGPT({
  messages,
  temperature = 0.7,
  max_tokens = 1200,
  model = 'gpt-4',
}: GPTOptions): Promise<string> {
  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens,
  });

  const reply = completion.choices[0]?.message?.content ?? '';
  return reply;
}