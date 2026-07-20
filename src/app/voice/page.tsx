'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { VoiceOrb } from '@/components/voice/VoiceOrb';
import { TopBar } from '@/components/layout/TopBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { SettingsModal } from '@/components/ui/SettingsModal';
import { useAppStore } from '@/hooks/useAppStore';
import { Message } from '@/types';
import { useTTSPlayer } from '@/hooks/useTTSPlayer';
import { createSTTManager, checkMicSupport, STTManager } from '@/lib/stt';
import { loadConversations, saveConversations, createConversation } from '@/lib/storage';
import { useRef } from 'react';

export default function VoicePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);
  const sttRef = useRef<STTManager | null>(null);

  const {
    phase, setPhase, settings, conversations, currentConversationId,
    addConversation, setCurrentConversation, incrementMsg, incrementErr,
    setMicActive, isMicActive,
  } = useAppStore();

  const { speak, interrupt } = useTTSPlayer();

  useEffect(() => {
    const saved = loadConversations();
    if (saved.length > 0) {
      useAppStore.setState({ conversations: saved });
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setTranscript((prev) => [...prev, { role: 'user', text: text.trim() }]);
    incrementMsg();
    setPhase('thinking');
    interrupt();

    try {
      const apiMessages = [
        ...transcript.map((t) => ({ role: t.role === 'user' ? 'user' : 'assistant', content: t.text })),
        { role: 'user', content: text.trim() },
      ];

      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          reasoning: settings.reasoning,
          customPrompt: settings.customPrompt || undefined,
          persona: settings.persona,
        }),
      });

      if (!resp.ok) throw new Error(`Chat error: ${resp.status}`);

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let aiText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) aiText += delta;
          } catch {}
        }
      }

      setTranscript((prev) => [...prev, { role: 'assistant', text: aiText }]);

      if (aiText.trim()) {
        setPhase('speaking');
        speak(
          aiText,
          settings.ttsModel,
          settings.voiceId,
          settings.latency,
          settings.speed,
          settings.fishApiKey || undefined
        );
      } else {
        setPhase('idle');
      }
    } catch (e: any) {
      incrementErr();
      console.error('Chat error:', e);
      setPhase('error');
      setTimeout(() => setPhase('idle'), 2000);
    }
  }, [transcript, settings, incrementMsg, incrementErr, setPhase, speak, interrupt]);

  const toggleMic = () => {
    if (phase === 'listening') {
      sttRef.current?.stop();
      setMicActive(false);
      setPhase('idle');
    } else {
      const support = checkMicSupport();
      if (!support.ok) {
        alert(support.msg);
        return;
      }

      sttRef.current = createSTTManager(
        settings.language,
        (result) => {
          if (result.isFinal && result.text.trim()) {
            sendMessage(result.text);
          }
        },
        () => {
          setMicActive(false);
          setPhase('idle');
        },
        (error) => {
          console.error('STT error:', error);
          setMicActive(false);
        }
      );

      sttRef.current.start();
      setMicActive(true);
      setPhase('listening');
    }
  };

  useEffect(() => {
    return () => {
      sttRef.current?.stop();
    };
  }, []);

  return (
    <div className="flex flex-col h-dvh relative">
      <TopBar
        onMenuClick={() => setSidebarOpen(true)}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      <VoiceOrb size={320} />

      <div className="absolute bottom-[120px] left-1/2 -translate-x-1/2 w-[92%] max-w-[560px] text-center z-10">
        <div className="inline-block text-sm leading-relaxed max-h-[200px] overflow-y-auto p-4 rounded-2xl bg-black/45 backdrop-blur-[10px] text-white/88">
          {transcript.length === 0 ? (
            <div className="text-[var(--color-muted)]">Tap the mic to start talking...</div>
          ) : (
            transcript.slice(-6).map((t, i) => (
              <div key={i} className={`mb-2 ${t.role === 'user' ? 'text-blue-300' : 'text-purple-300'}`}>
                <span className="font-medium">{t.role === 'user' ? 'You' : 'AI'}: </span>
                <span>{t.text}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 p-5 safe-bottom">
        <div className="flex items-center justify-center gap-4 max-w-[400px] mx-auto">
          <button
            onClick={toggleMic}
            className={`w-[70px] h-[70px] rounded-full border-none flex items-center justify-center cursor-pointer transition-all duration-300 shadow-lg ${
              phase === 'listening'
                ? 'bg-red-600 scale-110 shadow-red-500/30'
                : 'bg-white text-black hover:scale-105'
            }`}
          >
            <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </button>

          <button
            onClick={() => {
              interrupt();
              sttRef.current?.stop();
              setMicActive(false);
              setPhase('idle');
              setTranscript([]);
            }}
            className="w-[50px] h-[50px] rounded-full border-none bg-white/10 text-white flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
