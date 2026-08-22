import OpenAI from 'openai';

// Assumes OPENAI_API_KEY is set in your .env.local
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});
