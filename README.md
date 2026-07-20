# 🐟 Fish Studio Voice Chat Live

Um clone open source do **ChatGPT Live Voice** — chat de voz em tempo real com IA, usando Fish Studio para síntese de voz e MiMo V2.5 para respostas inteligentes.

## Por que este projeto existe?

O ChatGPT Live Voice impressionou o mundo com sua interface de voz fluida e orbe animado, mas ficou restrito aos assinantes do Plus. Este projeto nasceu da ideia de **democratizar essa experiência** — criar uma alternativa 100% open source que qualquer pessoa pode self-hospedar, personalizar e usar sem limite de mensagens.

A missão é simples: **voz + IA acessível a todos**.

## Funcionalidades

| Recurso | Descrição |
|---------|-----------|
| 🎤 **Microfone contínuo** | Fale naturalmente — a IA ouve e responde em tempo real |
| 🔮 **Orbe animado** | Visualização reativa ao áudio com Canvas (igual ao ChatGPT Live) |
| 🗣️ **100+ vozes** | Todas as vozes do Fish Studio, com busca e filtro |
| 🌍 **STT multilíngue** | PT-BR, EN, ES, FR, DE, JA, ZH, KO, IT, RU, AR, HI |
| ⚡ **TTS streaming** | Respostas de voz de alta qualidade com latência mínima |
| 🎭 **6 personas** | Geral, Professor, Amigo, Profissional, Tradutor, Programador |
| 🔍 **Busca na web** | A IA pesquisa informações atualizadas quando necessário |
| 🧬 **Clonagem de voz** | Clone vozes enviando um áudio de referência |
| 🎨 **Dark/Light mode** | Temas claro e escuro |
| 📋 **Histórico de conversas** | Salva automaticamente no navegador |
| ⌨️ **Atalhos de teclado** | Espaço=mic, Esc=parar, Ctrl+E=exportar, Ctrl+L=limpar |
| 🗑️ **Comandos de voz** | "Pare", "Stop", "Repita", "Repeat" |
| 📱 **Responsivo** | Funciona em desktop e mobile |
| 🔒 **Segurança** | Rate limiting, headers de segurança, sem dados expostos |

## Quick Start

### 1. Clone e instale

```bash
git clone https://github.com/SEU_USUARIO/fish-studio-voice-chat.git
cd fish-studio-voice-chat
npm install
```

### 2. Configure as API Keys

Crie o arquivo `.env`:

```bash
# Fish Studio (obtenha em https://fish.audio/app/api-keys)
FISH_API_KEY=sua_chave_fish_aqui

# OpenCode Zen / MiMo V2.5 (obtenha em https://opencode.ai)
AI_API_KEY=sua_chave_opencode_aqui
AI_BASE_URL=https://opencode.ai/zen/v1
AI_MODEL=mimo-v2.5-free
```

### 3. Inicie o servidor

```bash
npm start
```

Acesse `http://localhost:3000`

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER                          │
│  ┌─────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Web Speech   │  │ Canvas   │  │ Web Audio API │  │
│  │ API (STT)    │  │ Orb      │  │ (Playback)    │  │
│  └──────┬──────┘  └──────────┘  └───────────────┘  │
│         │                                           │
│  ┌──────▼──────────────────────────────────────────┐│
│  │          Frontend (HTML/CSS/JS)                 ││
│  └──────────────────┬──────────────────────────────┘│
└─────────────────────┼───────────────────────────────┘
                      │ HTTP
┌─────────────────────▼───────────────────────────────┐
│                  SERVER (Node.js)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ /api/     │  │ /api/    │  │ /api/             │  │
│  │ voices    │  │ chat     │  │ tts               │  │
│  │ (Fish)    │  │ (Zen)    │  │ (Fish)            │  │
│  └─────┬────┘  └────┬─────┘  └─────┬────────────┘  │
└────────┼────────────┼───────────────┼───────────────┘
         │            │               │
    ┌────▼────┐  ┌────▼────┐    ┌────▼────┐
    │ Fish    │  │ OpenCode│    │ Fish    │
    │ Audio   │  │ Zen     │    │ Audio   │
    │ Voices  │  │ MiMo    │    │ TTS     │
    └─────────┘  └─────────┘    └─────────┘
```

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/voices` | Lista todas as vozes (paginação automática) |
| `GET` | `/api/voices/search?q=nome` | Busca vozes por nome |
| `POST` | `/api/voice-clone` | Clona uma voz com áudio |
| `POST` | `/api/chat` | Chat streaming SSE com IA |
| `POST` | `/api/tts` | Síntese de voz (streaming MP3) |
| `POST` | `/api/search` | Busca na web (Wikipedia + DuckDuckGo) |
| `GET` | `/api/personas` | Lista personas disponíveis |
| `GET` | `/api/health` | Status do servidor |
| `GET` | `/api/metrics` | Métricas de uso |

## Atalhos de Teclado

| Tecla | Ação |
|-------|------|
| `Espaço` | Ativar/desativar microfone |
| `Esc` | Parar fala da IA |
| `Enter` | Enviar mensagem de texto |
| `Ctrl+E` | Exportar conversa |
| `Ctrl+L` | Limpar conversa |

## Comandos de Voz

Quando o microfone estiver ativo, você pode dizer:

- **"Pare"** ou **"Stop"** — Para a fala da IA
- **"Repita"** ou **"Repeat"** — Repete a última resposta

## Personas

Escolha uma persona para personalizar o estilo de resposta:

| Persona | Estilo |
|---------|--------|
| 🧑 **Geral** | Assistente padrão, amigável |
| 📚 **Professor** | Didático, explica com exemplos |
| 😄 **Amigo** | Casual, humor, informal |
| 💼 **Profissional** | Formal, preciso, business |
| 🌐 **Tradutor** | Foco em tradução e idiomas |
| 💻 **Programador** | Expert em código e técnica |

## Configuração Avançada

### Variáveis de Ambiente

```bash
# Server
PORT=3000                          # Porta do servidor

# Fish Studio
FISH_API_KEY=...                   # Chave da API Fish Audio

# AI (OpenCode Zen)
AI_API_KEY=...                     # Chave da API
AI_BASE_URL=https://opencode.ai/zen/v1  # URL base
AI_MODEL=mimo-v2.5-free            # Modelo de IA

# Alternativas de IA (compatível com OpenAI API)
# AI_BASE_URL=https://api.openai.com/v1
# AI_MODEL=gpt-4o-mini
```

### Auto-hospedagem com Docker

```bash
docker-compose up -d
```

### Deploy no Vercel

```bash
vercel --prod
```

## Tecnologias

- **Frontend:** HTML5, CSS3, Canvas 2D, Web Audio API, Web Speech API
- **Backend:** Node.js, Express, Multer (upload)
- **APIs:** Fish Audio (TTS), OpenCode Zen (AI), Wikipedia, DuckDuckGo
- **Storage:** LocalStorage (histórico de conversas)

## Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adicionar nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Licença

MIT — use, modifique, distribua livremente.

---

**Feito com ❤️ para a comunidade open source**
