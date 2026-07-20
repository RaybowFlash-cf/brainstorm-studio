export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  tokens?: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model?: string;
  persona?: string;
}

export type Persona = 'geral' | 'professor' | 'amigo' | 'profissional' | 'tradutor' | 'programador' | 'cientista' | 'escritor' | 'filosofo' | 'medico';

export interface PersonaConfig {
  id: Persona;
  name: string;
  emoji: string;
  systemPrompt: string;
}

export type ReasoningLevel = 'instant' | 'medium' | 'high';

export type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'searching' | 'error';

export interface Voice {
  _id: string;
  title: string;
  name?: string;
  accent?: string;
  description?: string;
  preview_url?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface AppSettings {
  persona: Persona;
  reasoning: ReasoningLevel;
  language: string;
  speed: number;
  ttsModel: string;
  latency: string;
  voiceId: string;
  theme: 'dark' | 'light';
  customPrompt: string;
  fishApiKey: string;
  autoDeleteDays: number;
}

export interface AppState {
  phase: VoicePhase;
  settings: AppSettings;
  conversations: Conversation[];
  currentConversationId: string | null;
  allVoices: Voice[];
  filteredVoices: Voice[];
  msgCount: number;
  errCount: number;
  sessionStart: number;
  isMicActive: boolean;
}

export interface ChatRequest {
  messages: { role: string; content: string }[];
  reasoning: ReasoningLevel;
  customPrompt?: string;
  persona?: Persona;
  model?: string;
}

export interface TTSRequest {
  text: string;
  model?: string;
  reference_id?: string;
  latency?: string;
  speed?: number;
  fishKey?: string;
}

export interface APIResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
