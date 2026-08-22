import OpenAI from 'openai';

// Groq is OpenAI-compatible and has a free developer tier:
// https://console.groq.com/keys
export const llm = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || 'missing-groq-key',
  baseURL: process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1',
});

export const LLM_MODEL =
  process.env.LLM_MODEL || 'llama-3.3-70b-versatile';

export function pollinationsImageUrl(prompt: string) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&width=1024&height=1024`;
}

export async function chatJson<T>(system: string, user: string, fallback: T): Promise<T> {
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
    console.error('Groq JSON chat failed, using fallback:', err);
    return fallback;
  }
}

export async function chatText(prompt: string, fallback: string): Promise<string> {
  try {
    const response = await llm.chat.completions.create({
      model: LLM_MODEL,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.choices[0]?.message?.content?.trim() || fallback;
  } catch (err) {
    console.error('Groq text chat failed, using fallback:', err);
    return fallback;
  }
}
