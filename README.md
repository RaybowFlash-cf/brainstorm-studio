# 🐟 Fish Studio Voice Chat Live

Live Voice Chat com IA, usando **Fish Studio** para síntese de voz de alta qualidade com latência mínima.

## Funcionalidades

- **Chat de voz em tempo real** — fale com a IA e ouça respostas naturais
- **Orbe animado** — visualização reativa ao áudio (igual ao ChatGPT Live)
- **Vozes do Fish Studio** — seletor com todas as vozes disponíveis na API
- **STT multilíngue** — reconhecimento de voz em PT-BR, EN, ES, FR, DE, JA, ZH
- **TTS streaming** — WebSocket para latência mínima (s2.1-pro-free disponível grátis)
- **Controles de velocidade** — ajuste a velocidade da fala
- **Modo de latência** — balanced (rápido) ou normal (qualidade máxima)
- **UI responsiva** — funciona em desktop e mobile

## Como Usar

1. **Configure as API Keys** no arquivo `.env`:

```bash
FISH_API_KEY=sua_chave_aqui        # https://fish.audio/app/api-keys
OPENAI_API_KEY=sua_chave_aqui      # https://platform.openai.com/api-keys
```

2. **Instale e inicie**:

```bash
npm install
npm start
```

3. **Acesse** `http://localhost:3000`

## Atalhos

- **Enter** — Enviar mensagem de texto
- **Botão de Microfone** — Ativar/desativar reconhecimento de voz
- **Botão X** — Limpar conversa

## Arquitetura

```
Browser (Frontend)
  ├── Web Speech API (STT) → texto
  ├── OpenAI API (Chat) → resposta IA (streaming SSE)
  ├── Fish Audio WebSocket (TTS) → áudio PCM/MP3
  └── Web Audio API → playback com reatividade no orbe

Server (Node.js/Express)
  ├── GET /api/voices → proxy Fish Audio voices
  ├── POST /api/chat → proxy OpenAI streaming
  └── WS /api/tts-stream → proxy Fish Audio WebSocket
```

## Tecnologias

- **Frontend:** HTML5 Canvas, Web Audio API, Web Speech API, CSS3
- **Backend:** Node.js, Express, WebSocket (ws)
- **APIs:** Fish Audio TTS, OpenAI Chat Completions
