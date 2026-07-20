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

    // Try DuckDuckGo Lite
    try {
      const searchUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
      const resp = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      const html = await resp.text();

      // Parse the table-based layout of DuckDuckGo Lite
      const linkRegex = /<a[^>]*rel="nofollow"[^>]*href="([^"]*)"[^>]*class="result-link"[^>]*>([^<]*)<\/a>/gi;
      const snippetRegex = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;

      let match;
      const links = [], titles = [], snippets = [];

      while ((match = linkRegex.exec(html)) !== null) {
        links.push(match[1]);
        titles.push(match[2].trim());
      }
      while ((match = snippetRegex.exec(html)) !== null) {
        snippets.push(match[1].replace(/<[^>]*>/g, '').trim());
      }

      for (let i = 0; i < Math.min(titles.length, 5); i++) {
        if (titles[i]) {
          results.push({ title: titles[i], url: links[i] || '', snippet: snippets[i] || '' });
        }
      }
    } catch (e) {
      console.error('DDG Lite error:', e.message);
    }

    // Fallback: Wikipedia API
    if (results.length === 0) {
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
    }

    // Fallback: DuckDuckGo Instant Answer
    if (results.length === 0) {
      try {
        const ddgResp = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
        const ddg = await ddgResp.json();
        if (ddg.AbstractText) {
          results.push({
            title: ddg.Heading || query,
            url: ddg.AbstractURL || '',
            snippet: ddg.AbstractText,
          });
        }
        if (ddg.Answer) {
          results.push({
            title: 'Resposta',
            url: '',
            snippet: ddg.Answer,
          });
        }
      } catch (e) {
        console.error('DDG API error:', e.message);
      }
    }

    res.json({ results, query });
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

    // Define tools for web search
    const tools = [
      {
        type: 'function',
        function: {
          name: 'web_search',
          description: 'Search the web for current information, news, facts, or real-time data like weather, stocks, sports scores. Use this whenever the user asks about something that requires up-to-date information.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query to find information about',
              },
            },
            required: ['query'],
          },
        },
      },
    ];

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
        tools,
        tool_choice: 'auto',
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
    let toolCalls = [];
    let toolCallIds = [];
    let bufferMessages = [...messages];
    let firstChunk = true;

    const reader = resp.body;

    reader.on('data', (chunk) => {
      if (destroyed) return;

      const text = chunk.toString();
      const lines = text.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const d = line.slice(6).trim();
        if (d === '[DONE]') {
          // Check if there were tool calls that need processing
          if (toolCalls.length > 0) {
            handleToolCalls(toolCalls, toolCallIds, bufferMessages, res, baseUrl, model, destroyed);
            return;
          }
          try { res.write(`data: [DONE]\n\n`); } catch {}
          return;
        }

        try {
          const j = JSON.parse(d);
          const choice = j.choices?.[0];

          if (choice?.delta?.tool_calls) {
            for (const tc of choice.delta.tool_calls) {
              if (tc.index !== undefined) {
                if (!toolCalls[tc.index]) {
                  toolCalls[tc.index] = { id: '', function: { name: '', arguments: '' } };
                  toolCallIds[tc.index] = '';
                }
                if (tc.id) {
                  toolCalls[tc.index].id = tc.id;
                  toolCallIds[tc.index] = tc.id;
                }
                if (tc.function?.name) {
                  toolCalls[tc.index].function.name += tc.function.name;
                }
                if (tc.function?.arguments) {
                  toolCalls[tc.index].function.arguments += tc.function.arguments;
                }
              }
            }
          }

          // Forward content delta to client
          if (choice?.delta?.content) {
            try { res.write(chunk); } catch {}
          }
        } catch {}
      }

      // Forward raw chunk if it's valid SSE data
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

    // Handle tool calls by executing search and continuing conversation
    async function handleToolCalls(calls, ids, history, res, baseUrl, model, destroyed) {
      if (destroyed) return;

      // Add assistant message with tool calls to history
      history.push({
        role: 'assistant',
        content: null,
        tool_calls: calls.map((tc, i) => ({
          id: ids[i],
          type: 'function',
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
      });

      // Execute each tool call
      for (let i = 0; i < calls.length; i++) {
        const tc = calls[i];
        if (tc.function.name === 'web_search') {
          try {
            const args = JSON.parse(tc.function.arguments);
            const searchResp = await fetch(`http://localhost:${process.env.PORT || 3000}/api/search`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: args.query }),
            });
            const searchResults = await searchResp.json();

            history.push({
              role: 'tool',
              tool_call_id: ids[i],
              content: JSON.stringify(searchResults),
            });
          } catch (err) {
            history.push({
              role: 'tool',
              tool_call_id: ids[i],
              content: JSON.stringify({ error: err.message }),
            });
          }
        }
      }

      // Now re-call the AI with tool results
      try {
        const resp2 = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.AI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemContent },
              ...history,
            ],
            stream: true,
            max_tokens: 500,
          }),
        });

        if (!resp2.ok) {
          try { res.write(`data: [DONE]\n\n`); } catch {}
          return;
        }

        const reader2 = resp2.body;
        reader2.on('data', (chunk2) => {
          if (!destroyed) {
            try { res.write(chunk2); } catch {}
          }
        });
        reader2.on('end', () => {
          if (!destroyed) {
            try { res.write(`data: [DONE]\n\n`); } catch {}
            try { res.end(); } catch {}
          }
        });
        reader2.on('error', () => {
          if (!destroyed) {
            try { res.write(`data: [DONE]\n\n`); } catch {}
            try { res.end(); } catch {}
          }
        });
      } catch (err) {
        console.error('Tool follow-up error:', err.message);
        if (!destroyed) {
          try { res.write(`data: [DONE]\n\n`); } catch {}
          try { res.end(); } catch {}
        }
      }
    }
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
