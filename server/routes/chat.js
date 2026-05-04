const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');

router.post('/', async (req, res) => {
  // Check for API key first
  if (!process.env.GEMINI_API_KEY) {
    return res.status(400).json({ 
      error: 'API Key missing',
      message: 'GEMINI_API_KEY is not set in the server/.env file. Please get a free key from Google AI Studio.' 
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const systemInstruction = `You are Jester, an expert CI/CD AI assistant for InfraFlow. 
InfraFlow is a premium glassmorphism dark-mode CI/CD platform. 
Help the user debug their pipelines, write YAML configuration, and understand build errors.
Keep responses concise, helpful, and use markdown formatting. Do not hallucinate.`;

    // Convert messages to genai format
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    res.json({ reply: response.text });
  } catch (error) {
    const detail = error?.message || String(error);
    console.error('Jester AI Error:', detail);

    // Parse quota/rate-limit errors for a clean user-facing message
    let userMessage = `Jester AI error: ${detail}`;
    try {
      const parsed = typeof error?.message === 'string' ? JSON.parse(error.message) : null;
      const code = parsed?.error?.code;
      const reason = parsed?.error?.details?.[0]?.reason;
      
      if (code === 429) {
        const retryDelay = parsed?.error?.details?.find(d => d['@type']?.includes('RetryInfo'))?.retryDelay || '60s';
        userMessage = `⏳ Gemini API quota exceeded. Please try again in ${retryDelay}. If this keeps happening, create a new API key at aistudio.google.com.`;
      } else if (code === 400 && (reason === 'API_KEY_INVALID' || parsed?.error?.message?.includes('expired'))) {
        userMessage = `🔑 The Gemini API key has expired. Please create a new one at aistudio.google.com and update your environment variables.`;
      }
    } catch (_) {
      // detail wasn't JSON — keep the generic message
      if (detail.includes('429') || detail.includes('quota') || detail.includes('RESOURCE_EXHAUSTED')) {
        userMessage = '⏳ Gemini API quota exceeded. Please try again in a minute, or create a new API key at aistudio.google.com.';
      } else if (detail.includes('expired') || detail.includes('API_KEY_INVALID')) {
        userMessage = `🔑 The Gemini API key has expired. Please create a new one at aistudio.google.com and update your environment variables.`;
      }
    }

    res.status(500).json({ error: 'AI Error', message: userMessage });
  }
});

module.exports = router;
