'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { Message } from '@/types';
import { createConversation, saveConversations, loadConversations } from '@/lib/storage';
import { useTTSPlayer } from '@/hooks/useTTSPlayer';
import { createSTTManager, checkMicSupport, STTManager } from '@/lib/stt';

interface ChatInputProps {
  onNewMessage: (msg: Message) => void;
  onHistoryUpdate: (msgs: Message[]) => void;
}

export function ChatInput({ onNewMessage, onHistoryUpdate }: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const sttManagerRef = useRef<STTManager | null>(null);

  const {
    phase, setPhase, settings, conversations, currentConversationId,
    addConversation, updateConversation, setCurrentConversation,
    incrementMsg, incrementErr, setMicActive,
  } = useAppStore();

  const { speak, interrupt } = useTTSPlayer();

  const getCurrentMessages = (): Message[] => {
    if (!currentConversationId) return [];
    const conv = conversations.find(c => c.id === currentConversationId);
    return conv?.messages || [];
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    onNewMessage(userMsg);
    incrementMsg();
    setInputValue('');
    setPhase('thinking');

    interrupt();

    try {
      const currentMsgs = [...getCurrentMessages(), userMsg];
      const apiMessages = currentMsgs.map(m => ({ role: m.role, content: m.content }));

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
            if (delta) {
              aiText += delta;
              setPhase('thinking');
            }
          } catch {}
        }
      }

      const aiMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: aiText,
        timestamp: Date.now(),
      };

      onNewMessage(aiMsg);

      const allMsgs = [...currentMsgs, aiMsg];
      onHistoryUpdate(allMsgs);

      if (!currentConversationId) {
        const conv = createConversation(userMsg, settings.ttsModel, settings.persona);
        const updated = { ...conv, messages: allMsgs };
        addConversation(updated);
        setCurrentConversation(updated.id);
        saveConversations([...conversations, updated]);
      } else {
        const conv = conversations.find(c => c.id === currentConversationId);
        if (conv) {
          const updated = { ...conv, messages: allMsgs, updatedAt: Date.now() };
          const newConvs = conversations.map(c => c.id === currentConversationId ? updated : c);
          saveConversations(newConvs);
        }
      }

      if (aiText.trim()) {
        setPhase('speaking');
        speak(aiText, settings.ttsModel, settings.voiceId, settings.latency, settings.speed, settings.fishApiKey || undefined);
      } else {
        setPhase('idle');
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      incrementErr();
      console.error('Chat error:', e);
      setPhase('error');
      setTimeout(() => setPhase('idle'), 2000);
    }
  };

  const toggleMic = () => {
    if (phase === 'listening') {
      sttManagerRef.current?.stop();
      setMicActive(false);
      setPhase('idle');
    } else {
      const support = checkMicSupport();
      if (!support.ok) {
        alert(support.msg);
        return;
      }

      sttManagerRef.current = createSTTManager(
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
          setPhase('error');
          setTimeout(() => setPhase('idle'), 2000);
        }
      );

      sttManagerRef.current.start();
      setMicActive(true);
      setPhase('listening');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) sendMessage(inputValue);
    }
  };

  const handleReset = () => {
    sttManagerRef.current?.stop();
    interrupt();
    setMicActive(false);
    setCurrentConversation(null);
    setPhase('idle');
    setInputValue('');
  };

  useEffect(() => {
    return () => {
      sttManagerRef.current?.stop();
    };
  }, []);

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 p-[14px_16px] safe-bottom">
      <div className="flex items-center gap-3 max-w-[580px] mx-auto">
        <div className="flex-1 flex items-center gap-1 bg-[var(--color-surface)] rounded-full px-4 py-1 border border-white/[0.06] focus-within:border-white/20 transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Angelical AI..."
            autoComplete="off"
            enterKeyHint="send"
            className="flex-1 bg-transparent border-none outline-none text-[var(--color-text)] text-[15px] py-2.5 px-1 placeholder:text-[var(--color-muted)]"
          />
        </div>

        <button
          onClick={toggleMic}
          className={`w-[50px] h-[50px] rounded-full border-none flex items-center justify-center cursor-pointer transition-all duration-200 flex-shrink-0 ${
            phase === 'listening'
              ? 'bg-red-600 animate-[micGlow_1.4s_infinite]'
              : 'bg-[var(--color-surface)] hover:bg-white/16 text-[var(--color-text)]'
          }`}
          aria-label="Microphone"
        >
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </button>

        <button
          onClick={handleReset}
          className="w-[50px] h-[50px] rounded-full border-none bg-white text-black flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 flex-shrink-0"
          aria-label="Reset"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
