import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './env.js';

let genAI = null;

if (config.geminiApiKey) {
  try {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
    console.log('[AI Engine] Google Gemini SDK initialized successfully.');
  } catch (err) {
    console.warn('[AI Engine] Failed to initialize Google Generative AI:', err.message);
  }
} else {
  console.warn('[AI Engine] GEMINI_API_KEY is not set. Fallback intelligent mock fashion heuristics will be used.');
}

export const AVAILABLE_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
];

export const getGeminiModel = (modelName = 'gemini-flash-lite-latest') => {
  if (!genAI) return null;
  return genAI.getGenerativeModel({ model: modelName });
};

/**
 * Execute an AI operation with automatic retry on 503 high-demand spikes
 */
export const runWithAiResilience = async (operation) => {
  if (!genAI) {
    throw new Error('AI Engine is not initialized. Please ensure GEMINI_API_KEY is configured in your .env file.');
  }

  let lastError = null;
  for (const modelName of AVAILABLE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      return await operation(model);
    } catch (err) {
      lastError = err;
      const msg = (err.message || '').toLowerCase();
      // If error is temporary provider issue (503, 500, 429, 404, high demand, overloaded)
      if (
        msg.includes('503') ||
        msg.includes('500') ||
        msg.includes('404') ||
        msg.includes('429') ||
        msg.includes('high demand') ||
        msg.includes('unavailable') ||
        msg.includes('overloaded')
      ) {
        console.warn(`[AI Engine] ${modelName} temporarily busy. Switching to backup model...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};

export { genAI };

