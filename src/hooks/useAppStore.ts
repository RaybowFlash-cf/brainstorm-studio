'use client';

import { create } from 'zustand';
import { Message, Conversation, Persona, ReasoningLevel, VoicePhase, Voice, AppSettings } from '@/types';

interface AppStore {
  phase: VoicePhase;
  setPhase: (p: VoicePhase) => void;

  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;

  conversations: Conversation[];
  currentConversationId: string | null;
  addConversation: (c: Conversation) => void;
  updateConversation: (id: string, msgs: Message[]) => void;
  setCurrentConversation: (id: string | null) => void;
  deleteConversation: (id: string) => void;

  allVoices: Voice[];
  setAllVoices: (v: Voice[]) => void;
  filteredVoices: Voice[];
  setFilteredVoices: (v: Voice[]) => void;

  msgCount: number;
  errCount: number;
  incrementMsg: () => void;
  incrementErr: () => void;

  sessionStart: number;
  isMicActive: boolean;
  setMicActive: (v: boolean) => void;

  resetConversation: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  phase: 'idle',
  setPhase: (p) => set({ phase: p }),

  settings: {
    persona: 'geral',
    reasoning: 'instant',
    language: 'pt-BR',
    speed: 1.0,
    ttsModel: 's2.1-pro-free',
    latency: 'balanced',
    voiceId: '',
    theme: 'dark',
    customPrompt: '',
    fishApiKey: '',
    autoDeleteDays: 30,
  },
  updateSettings: (s) => set((state) => ({
    settings: { ...state.settings, ...s },
  })),

  conversations: [],
  currentConversationId: null,
  addConversation: (c) => set((state) => ({
    conversations: [...state.conversations, c].slice(-50),
  })),
  updateConversation: (id, msgs) => set((state) => ({
    conversations: state.conversations.map(c =>
      c.id === id ? { ...c, messages: msgs, updatedAt: Date.now() } : c
    ),
  })),
  setCurrentConversation: (id) => set({ currentConversationId: id }),
  deleteConversation: (id) => set((state) => ({
    conversations: state.conversations.filter(c => c.id !== id),
    currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
  })),

  allVoices: [],
  setAllVoices: (v) => set({ allVoices: v, filteredVoices: v }),
  filteredVoices: [],
  setFilteredVoices: (v) => set({ filteredVoices: v }),

  msgCount: 0,
  errCount: 0,
  incrementMsg: () => set((s) => ({ msgCount: s.msgCount + 1 })),
  incrementErr: () => set((s) => ({ errCount: s.errCount + 1 })),

  sessionStart: Date.now(),
  isMicActive: false,
  setMicActive: (v) => set({ isMicActive: v }),

  resetConversation: () => set({
    currentConversationId: null,
    phase: 'idle',
  }),
}));
