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

// ── Proxy: Chat Completions (OpenAI-compatible streaming SSE) ─────────
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.AI_MODEL || 'gpt-4o-mini';

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are a natural, friendly voice assistant called FishVoice.
Keep responses concise and conversational (1-3 sentences max unless asked for detail).
Speak naturally — avoid bullet points, markdown, or lists when speaking.
When expressing emotions, use natural spoken language.
Always respond in the same language the user speaks.
Never say "as an AI" or similar phrases.`,
          },
          ...messages,
        ],
        stream: true,
        max_tokens: 300,
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
// This is more reliable than WebSocket for small text chunks
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

    // Stream the MP3 response
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

// ── WebSocket: Fish Audio TTS streaming proxy (backup) ─────
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  if (request.url === '/api/tts-stream') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (clientWs) => {
  let fishWs = null;

  clientWs.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'start') {
      const cfg = msg.config || {};
      const ttsModel = cfg.model || 's2.1-pro-free';

      fishWs = new WebSocket('wss://api.fish.audio/v1/tts/live', {
        headers: {
          Authorization: `Bearer ${process.env.FISH_API_KEY}`,
          model: ttsModel,
        },
      });

      fishWs.on('open', () => {
        const startEvt = {
          event: 'start',
          request: {
            text: '',
            format: cfg.format || 'mp3',
            sample_rate: cfg.sample_rate || 44100,
            reference_id: cfg.reference_id || undefined,
            latency: cfg.latency || 'balanced',
            chunk_length: cfg.chunk_length || 300,
            temperature: cfg.temperature || 0.8,
            top_p: cfg.top_p || 0.7,
            prosody: {
              speed: cfg.speed || 1.0,
              volume: 0,
              normalize_loudness: true,
            },
          },
        };
        fishWs.send(JSON.stringify(startEvt));
        safeSend(clientWs, { type: 'ready' });
      });

      fishWs.on('message', (chunk) => {
        if (Buffer.isBuffer(chunk)) {
          safeSend(clientWs, { type: 'audio', data: chunk.toString('base64') });
        } else {
          const str = chunk.toString();
          try {
            const evt = JSON.parse(str);
            if (evt.event === 'done') safeSend(clientWs, { type: 'done' });
            else if (evt.event === 'error') safeSend(clientWs, { type: 'error', message: evt.message || 'TTS error' });
          } catch {
            safeSend(clientWs, { type: 'audio', data: Buffer.from(str, 'binary').toString('base64') });
          }
        }
      });

      fishWs.on('error', (err) => {
        console.error('Fish WS error:', err.message);
        safeSend(clientWs, { type: 'error', message: err.message });
      });

      fishWs.on('close', () => safeSend(clientWs, { type: 'stream_closed' }));

    } else if (msg.type === 'text' && fishWs?.readyState === WebSocket.OPEN) {
      fishWs.send(JSON.stringify({ event: 'text', text: msg.text }));
    } else if (msg.type === 'flush' && fishWs?.readyState === WebSocket.OPEN) {
      fishWs.send(JSON.stringify({ event: 'flush' }));
    } else if (msg.type === 'stop') {
      closeFishWs();
    }
  });

  clientWs.on('close', () => closeFishWs());
  clientWs.on('error', () => closeFishWs());

  function closeFishWs() {
    if (fishWs?.readyState === WebSocket.OPEN) {
      fishWs.send(JSON.stringify({ event: 'close' }));
      fishWs.close();
    }
    fishWs = null;
  }
});

function safeSend(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

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
