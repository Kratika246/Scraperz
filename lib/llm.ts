import OpenAI from 'openai';

// Groq is OpenAI-compatible and has a free developer tier:
// https://console.groq.com/keys
export const llm = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || 'missing-groq-key',
  baseURL: process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1',
});

// Changed from 'llama-3.3-70b-versatile' to an active Groq model
export const LLM_MODEL =
  process.env.LLM_MODEL || 'openai/gpt-oss-120b';

export function pollinationsImageUrl(prompt: string) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&width=1024&height=1024`;
}

export async function chatJson<T>(system: string, user: string, fallback?: T): Promise<T> {
  try {
    const response = await llm.chat.completions.create({
      model: LLM_MODEL,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    const raw = response.choices[0]?.message?.content || '{}';
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error('Groq JSON chat failed:', err);
    
    // Only return fallback if explicitly provided, otherwise re-throw to mark pipeline job as failed
    if (fallback !== undefined) {
      return fallback;
    }
    throw err;
  }
}

export async function chatText(prompt: string, fallback?: string): Promise<string> {
  try {
    const response = await llm.chat.completions.create({
      model: LLM_MODEL,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });
    const content = response.choices[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty text response from Groq');
    return content;
  } catch (err) {
    console.error('Groq text chat failed:', err);
    
    if (fallback !== undefined) {
      return fallback;
    }
    throw err;
  }
}