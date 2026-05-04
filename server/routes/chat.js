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
    res.status(500).json({ 
      error: 'AI Error',
      message: `Jester AI error: ${detail}`
    });
  }
});

module.exports = router;
