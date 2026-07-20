require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── System prompt ────────────────────────────────────────────
const SYSTEM_PROMPT = `You are FishVoice, a highly capable AI voice assistant similar to ChatGPT's Live Voice mode.

CORE BEHAVIOR:
- Keep responses concise and conversational (1-3 sentences for simple questions, more when detail is requested)
- Speak naturally like a human — no bullet points, markdown, or numbered lists when speaking
- Always respond in the same language the user speaks
- Never say "as an AI" or similar disclaimers
- You can express emotions naturally through your voice responses
- Use casual, friendly language

CAPABILITIES:
- You can search the web for current information when needed
- You can answer questions about any topic
- You can help with math, coding, writing, translation
- You can have casual conversations, tell jokes, play word games
- You can do real-time translation between languages
- When you need current information, use the web_search function

TOOL USE:
- When the user asks about current events, news, weather, stocks, sports scores, or any real-time information, use the web_search tool
- When you need to verify facts or get up-to-date info, use web_search
- You can call web_search with a search query and I will return results

VISUAL RESPONSES:
- For weather: mention the actual weather conditions
- For calculations: show the result clearly
- For code: describe what the code does naturally
- For recipes: list ingredients conversationally

CONVERSATION STYLE:
- Be warm and personable
- Use natural transitions like "So...", "Well...", "Actually..."
- Acknowledge the user's tone and emotion
- If the user seems confused, simplify your explanation
- If they seem excited, match their energy`;

// ── Proxy: List Fish Audio voices ──────────────────────────
app.get('/api/voices', async (req, res) => {
  try {
    const resp = await fetch('https://api.fish.audio/model?page_size=100', {
      headers: { Authorization: `Bearer ${process.env.FISH_API_KEY}` },
    });
    res.json(await resp.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Web Search API (for AI tool calling) ─────────────────────
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'No query' });

    const results = [];

    // 1. Try Wikipedia API (reliable, no captcha)
    try {
      const wikiResp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
      if (wikiResp.ok) {
        const wiki = await wikiResp.json();
        if (wiki.extract) {
          results.push({
            title: wiki.title || query,
            url: wiki.content_urls?.desktop?.page || '',
            snippet: wiki.extract,
          });
        }
      }
    } catch (e) {
      console.error('Wiki error:', e.message);
    }

    // 2. Try Wikipedia search API for more results
    try {
      const searchResp = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=4`);
      if (searchResp.ok) {
        const searchData = await searchResp.json();
        const searchResults = searchData.query?.search || [];
        for (const r of searchResults) {
          if (r.title && r.snippet) {
            results.push({
              title: r.title,
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title)}`,
              snippet: r.snippet.replace(/<[^>]*>/g, ''),
            });
          }
        }
      }
    } catch (e) {
      console.error('Wiki search error:', e.message);
    }

    // 3. Try DuckDuckGo Instant Answer (for direct answers)
    try {
      const ddgResp = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
      const ddg = await ddgResp.json();
      if (ddg.AbstractText) {
        results.unshift({
          title: ddg.Heading || query,
          url: ddg.AbstractURL || '',
          snippet: ddg.AbstractText,
        });
      }
      if (ddg.Answer) {
        results.unshift({
          title: 'Resposta',
          url: '',
          snippet: ddg.Answer,
        });
      }
    } catch (e) {
      console.error('DDG API error:', e.message);
    }

    // Deduplicate by title
    const seen = new Set();
    const unique = [];
    for (const r of results) {
      if (!seen.has(r.title)) {
        seen.add(r.title);
        unique.push(r);
      }
    }

    res.json({ results: unique.slice(0, 6), query });
  } catch (err) {
    console.error('Search error:', err.message);
    res.json({ results: [], query: req.body?.query || '', error: err.message });
  }
});

// ── Proxy: Chat Completions (OpenAI-compatible streaming SSE) ─────────
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, reasoning } = req.body;
    const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.AI_MODEL || 'gpt-4o-mini';

    // Adjust system prompt based on reasoning level
    let systemContent = SYSTEM_PROMPT;
    if (reasoning === 'high') {
      systemContent += '\n\nTake your time to think through complex questions carefully. Provide thorough, well-reasoned answers.';
    } else if (reasoning === 'medium') {
      systemContent += '\n\nThink carefully about questions before answering. Provide balanced, thoughtful responses.';
    } else {
      systemContent += '\n\nRespond quickly and directly. Keep it concise.';
    }

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemContent },
          ...messages,
        ],
        stream: true,
        max_tokens: 500,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error('AI API error:', resp.status, errBody);
      return res.status(resp.status).json({ error: `AI API error: ${resp.status}` });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let destroyed = false;

    const reader = resp.body;

    // Simple proxy: forward all chunks directly from AI API to client
    reader.on('data', (chunk) => {
      if (!destroyed) {
        try { res.write(chunk); } catch {}
      }
    });

    reader.on('end', () => {
      if (!destroyed) {
        try { res.end(); } catch {}
      }
    });

    reader.on('error', (err) => {
      console.error('AI stream error:', err.message);
      if (!destroyed) {
        try { res.end(); } catch {}
      }
    });

    req.on('close', () => {
      destroyed = true;
      reader.destroy();
      try { res.end(); } catch {}
    });
  } catch (err) {
    console.error('Chat endpoint error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// ── HTTP TTS endpoint (streaming MP3) ──────────────────────
app.post('/api/tts', async (req, res) => {
  try {
    const { text, model, reference_id, latency, speed } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'No text' });

    const ttsModel = model || 's2.1-pro-free';
    const resp = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FISH_API_KEY}`,
        'Content-Type': 'application/json',
        model: ttsModel,
      },
      body: JSON.stringify({
        text,
        reference_id: reference_id || undefined,
        latency: latency || 'balanced',
        format: 'mp3',
        sample_rate: 44100,
        prosody: {
          speed: speed || 1.0,
          volume: 0,
          normalize_loudness: true,
        },
        chunk_length: 200,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error('Fish TTS error:', resp.status, errBody);
      return res.status(resp.status).json({ error: `TTS error: ${resp.status}` });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    resp.body.pipe(res);
    resp.body.on('error', () => res.end());
    req.on('close', () => resp.body.destroy());
  } catch (err) {
    console.error('TTS endpoint error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// ── Global error handling ──
process.on('uncaughtException', (err) => console.error('Uncaught:', err.message));
process.on('unhandledRejection', (err) => console.error('Unhandled:', err?.message || err));

// ── Start ──
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Voice Chat server → http://localhost:${PORT}`);
  console.log(`AI: ${process.env.AI_MODEL} @ ${process.env.AI_BASE_URL}`);
  console.log(`Fish Audio: ${process.env.FISH_API_KEY ? 'OK' : 'NO KEY'}`);
});
