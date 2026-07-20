# Angelical AI

**Free. Unlimited. Open Source.**

A complete ChatGPT alternative — 100% free, 100% unlimited, 100% open source. No subscriptions, no rate limits, no corporate control.

## Features

- **Text Chat** — Full streaming chat with multiple AI models
- **Voice Mode** — Talk to AI with animated orb, STT + TTS
- **10 Personas** — Professor, Friend, Professional, Translator, Programmer, Scientist, Writer, Philosopher, Doctor
- **Web Search** — Real-time search integration
- **Voice Cloning** — Clone voices via Fish Studio
- **Dark/Light Theme** — Beautiful responsive design
- **Mobile-First** — PWA-ready, works on all devices
- **Export** — Download conversations as TXT/MD
- **Keyboard Shortcuts** — Space (mic), Esc (stop), Ctrl+E (export)

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AI_BASE_URL` | AI API base URL | Yes |
| `AI_API_KEY` | AI API key | Yes |
| `AI_MODEL` | AI model name | Yes |
| `FISH_API_KEY` | Fish Studio TTS key | Yes |

## Tech Stack

- **Framework**: Next.js 15 + React 19
- **Language**: TypeScript (100%)
- **Styling**: Tailwind CSS 4
- **State**: Zustand
- **AI**: OpenCode Zen (MiMo V2.5)
- **TTS**: Fish Studio
- **STT**: Web Speech API
- **Deployment**: Vercel

## Architecture

```
src/
├── app/              # Next.js App Router
│   ├── page.tsx      # Main chat page
│   ├── voice/        # Voice mode
│   └── api/          # API routes
├── components/       # React components
├── hooks/            # Custom hooks + Zustand store
├── lib/              # Utilities (AI, TTS, STT, Search)
├── types/            # TypeScript types
└── styles/           # Global styles
```

## API Routes

- `POST /api/chat` — Streaming chat completions
- `POST /api/tts` — Text-to-speech
- `GET /api/voices` — List available voices
- `POST /api/search` — Web search
- `GET /api/personas` — List personas
- `POST /api/voice-clone` — Clone a voice
- `GET /api/health` — Health check

## MCP Servers

Pre-configured MCP servers for enhanced capabilities:

- **GitHub** — Repository access
- **Filesystem** — File operations
- **SQLite** — Local database
- **Puppeteer** — Browser automation
- **Fetch** — HTTP requests
- **Memory** — Persistent memory
- **Sequential Thinking** — Advanced reasoning
- **Git** — Git operations
- **Time** — Time operations
- **Exec** — Command execution

## Daytona Agent

Full agent capabilities via Daytona sandbox:

- Terminal access
- File system operations
- Browser automation
- Code execution
- Full dev environment

## License

MIT — Free forever. No limits. No corporate control.

## Credits

- AI: [OpenCode Zen](https://opencode.ai) — MiMo V2.5
- TTS: [Fish Studio](https://fish.audio)
- UI: Inspired by ChatGPT Live Voice
