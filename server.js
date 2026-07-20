require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fetch = require('node-fetch');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ── SYSTEM PROMPT ──
const DEFAULT_PROMPT = `You are FishVoice, a highly capable AI voice assistant similar to ChatGPT's Live Voice mode.

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

CONVERSATION STYLE:
- Be warm and personable
- Use natural transitions like "So...", "Well...", "Actually..."
- Acknowledge the user's tone and emotion
- If the user seems confused, simplify your explanation
- If they seem excited, match their energy`;

// ── PERSONAS ──
const PERSONAS = {
  geral: '',
  professor: '\n\nYou are a patient, knowledgeable professor. Explain concepts clearly with examples. Use a didactic tone.',
  amigo: '\n\nYou are a close friend. Be casual, use humor, speak informally. Use expressions like "man", " cara", "tipo assim".',
  profissional: '\n\nYou are a professional assistant. Be formal, precise, and business-like. Give structured, actionable advice.',
  tradutor: '\n\nYou are a professional translator. When the user speaks in one language, you can translate to another. Also help with language learning.',
  programador: '\n\nYou are an expert programmer. Help with code, explain technical concepts, debug errors. Show code briefly when needed but explain it verbally.',
};

// ── METRICS ──
const metrics = { requests: 0, errors: 0, chatCalls: 0, ttsCalls: 0, searchCalls: 0 };

// ── SECURITY & MIDDLEWARE ──
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'microphone=*, camera=()');
  metrics.requests++;
  next();
});

// ── RATE LIMITING ──
const rateLimitMap = new Map();
function rateLimit(ip, limit = 30, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, reset: now + windowMs };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs; }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count <= limit;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.reset) rateLimitMap.delete(ip);
  }
}, 60000);

// ── HELPERS ──
function getFishKey(userKey) { return userKey || process.env.FISH_API_KEY; }
function getClientIp(req) { return req.headers['x-forwarded-for'] || req.connection.remoteAddress || '0.0.0.0'; }

// ── API: VOICES (paginated) ──
app.get('/api/voices', async (req, res) => {
  try {
    const fishKey = getFishKey(req.query.key);
    let allVoices = [], cursor = null, pages = 0;
    do {
      const url = new URL('https://api.fish.audio/model');
      url.searchParams.set('page_size', '100');
      if (cursor) url.searchParams.set('cursor', cursor);
      const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${fishKey}` } });
      if (!resp.ok) break;
      const data = await resp.json();
      allVoices = allVoices.concat(data.items || data.data || []);
      cursor = data.cursor || null;
      pages++;
    } while (cursor && pages < 20);
    res.json({ items: allVoices, total: allVoices.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── API: VOICE SEARCH ──
app.get('/api/voices/search', async (req, res) => {
  try {
    const fishKey = getFishKey(req.query.key);
    const q = req.query.q || '';
    const url = new URL('https://api.fish.audio/model');
    url.searchParams.set('page_size', '100');
    if (q) url.searchParams.set('title', q);
    const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${fishKey}` } });
    const data = await resp.json();
    res.json({ items: data.items || data.data || [], total: (data.items || []).length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── API: VOICE CLONE ──
app.post('/api/voice-clone', upload.single('audio'), async (req, res) => {
  try {
    const fishKey = getFishKey(req.body.key);
    const { title, description, text } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No audio file uploaded' });
    const formData = new (require('form-data'))();
    formData.append('audio', req.file.buffer, { filename: req.file.originalname || 'clone.mp3', contentType: req.file.mimetype || 'audio/mpeg' });
    if (title) formData.append('title', title);
    if (description) formData.append('description', description);
    if (text) formData.append('text', text);
    const resp = await fetch('https://api.fish.audio/v1/voice/create', {
      method: 'POST', headers: { Authorization: `Bearer ${fishKey}`, ...formData.getHeaders() }, body: formData,
    });
    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json(data);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── API: WEB SEARCH ──
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'No query' });
    metrics.searchCalls++;
    const results = [];
    try {
      const wikiResp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
      if (wikiResp.ok) { const wiki = await wikiResp.json(); if (wiki.extract) results.push({ title: wiki.title || query, url: wiki.content_urls?.desktop?.page || '', snippet: wiki.extract }); }
    } catch {}
    try {
      const searchResp = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=4`);
      if (searchResp.ok) { const sd = await searchResp.json(); for (const r of (sd.query?.search || [])) { if (r.title && r.snippet) results.push({ title: r.title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title)}`, snippet: r.snippet.replace(/<[^>]*>/g, '') }); } }
    } catch {}
    try {
      const ddgResp = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
      const ddg = await ddgResp.json();
      if (ddg.AbstractText) results.unshift({ title: ddg.Heading || query, url: ddg.AbstractURL || '', snippet: ddg.AbstractText });
      if (ddg.Answer) results.unshift({ title: 'Resposta', url: '', snippet: ddg.Answer });
    } catch {}
    const seen = new Set();
    const unique = results.filter(r => { if (seen.has(r.title)) return false; seen.add(r.title); return true; });
    res.json({ results: unique.slice(0, 6), query });
  } catch (err) { res.json({ results: [], query: req.body?.query || '', error: err.message }); }
});

// ── API: CHAT (streaming SSE) ──
app.post('/api/chat', async (req, res) => {
  try {
    const ip = getClientIp(req);
    if (!rateLimit(ip, 30)) return res.status(429).json({ error: 'Rate limit exceeded. Wait a moment.' });

    const { messages, reasoning, customPrompt, persona } = req.body;
    const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.AI_MODEL || 'gpt-4o-mini';
    metrics.chatCalls++;

    let systemContent = customPrompt || DEFAULT_PROMPT;
    if (persona && PERSONAS[persona]) systemContent += PERSONAS[persona];
    if (reasoning === 'high') systemContent += '\n\nTake your time to think through complex questions carefully. Provide thorough, well-reasoned answers.';
    else if (reasoning === 'medium') systemContent += '\n\nThink carefully about questions before answering.';
    else systemContent += '\n\nRespond quickly and directly. Keep it concise.';

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.AI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: systemContent }, ...messages], stream: true, max_tokens: 800 }),
    });
    if (!resp.ok) { const errBody = await resp.text(); console.error('AI error:', resp.status, errBody); return res.status(resp.status).json({ error: `AI error: ${resp.status}` }); }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    let destroyed = false;
    resp.body.on('data', c => { if (!destroyed) try { res.write(c); } catch {} });
    resp.body.on('end', () => { if (!destroyed) try { res.end(); } catch {} });
    resp.body.on('error', () => { if (!destroyed) try { res.end(); } catch {} });
    req.on('close', () => { destroyed = true; resp.body.destroy(); try { res.end(); } catch {} });
  } catch (err) { console.error('Chat error:', err.message); if (!res.headersSent) res.status(500).json({ error: err.message }); }
});

// ── API: TTS (streaming MP3) ──
app.post('/api/tts', async (req, res) => {
  try {
    const ip = getClientIp(req);
    if (!rateLimit(ip, 60)) return res.status(429).json({ error: 'Rate limit exceeded.' });

    const { text, model, reference_id, latency, speed, fishKey } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'No text' });
    metrics.ttsCalls++;

    const ttsModel = model || 's2.1-pro-free';
    const resp = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getFishKey(fishKey)}`, 'Content-Type': 'application/json', model: ttsModel },
      body: JSON.stringify({ text, reference_id: reference_id || undefined, latency: latency || 'balanced', format: 'mp3', sample_rate: 44100, prosody: { speed: speed || 1.0, volume: 0, normalize_loudness: true }, chunk_length: 200 }),
    });
    if (!resp.ok) { const errBody = await resp.text(); console.error('TTS error:', resp.status, errBody); return res.status(resp.status).json({ error: `TTS error: ${resp.status}` }); }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    resp.body.pipe(res);
    resp.body.on('error', () => res.end());
    req.on('close', () => resp.body.destroy());
  } catch (err) { console.error('TTS error:', err.message); if (!res.headersSent) res.status(500).json({ error: err.message }); }
});

// ── API: PERSONAS ──
app.get('/api/personas', (req, res) => {
  res.json({ personas: Object.keys(PERSONAS).map(k => ({ id: k, name: k.charAt(0).toUpperCase() + k.slice(1) })) });
});

// ── API: HEALTH ──
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime(), ...metrics }));

// ── API: METRICS ──
app.get('/api/metrics', (req, res) => res.json({ ...metrics, uptime: process.uptime(), memory: process.memoryUsage() }));

// ── GLOBAL ERRORS ──
process.on('uncaughtException', err => console.error('Uncaught:', err.message));
process.on('unhandledRejection', err => console.error('Unhandled:', err?.message || err));

// ── GRACEFUL SHUTDOWN ──
process.on('SIGTERM', () => { console.log('SIGTERM received, shutting down...'); server.close(() => process.exit(0)); });
process.on('SIGINT', () => { console.log('SIGINT received, shutting down...'); server.close(() => process.exit(0)); });

// ── START ──
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Voice Chat server → http://localhost:${PORT}`);
  console.log(`AI: ${process.env.AI_MODEL} @ ${process.env.AI_BASE_URL}`);
  console.log(`Fish Audio: ${process.env.FISH_API_KEY ? 'OK' : 'NO KEY'}`);
  console.log(`Features: rate-limit, security-headers, personas, metrics, voice-clone`);
});
