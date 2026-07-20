'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { VoiceOrb } from '@/components/voice/VoiceOrb';
import { Transcript } from '@/components/chat/Transcript';
import { ChatInput } from '@/components/chat/ChatInput';
import { TopBar } from '@/components/layout/TopBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { SettingsModal } from '@/components/ui/SettingsModal';
import { useAppStore } from '@/hooks/useAppStore';
import { Message } from '@/types';
import { loadConversations, saveConversations } from '@/lib/storage';

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const conversations = useAppStore((s) => s.conversations);
  const currentConversationId = useAppStore((s) => s.currentConversationId);

  useEffect(() => {
    const saved = loadConversations();
    if (saved.length > 0) {
      useAppStore.setState({ conversations: saved });
    }
  }, []);

  useEffect(() => {
    if (currentConversationId) {
      const conv = conversations.find((c) => c.id === currentConversationId);
      if (conv) {
        setMessages(conv.messages);
      }
    } else {
      setMessages([]);
    }
  }, [currentConversationId, conversations]);

  const handleNewMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleHistoryUpdate = useCallback((msgs: Message[]) => {
    setMessages(msgs);
    saveConversations(
      conversations.map((c) =>
        c.id === currentConversationId
          ? { ...c, messages: msgs, updatedAt: Date.now() }
          : c
      )
    );
  }, [conversations, currentConversationId]);

  const handleExport = useCallback(() => {
    if (!messages.length) return;
    const text = messages
      .map((m) => `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`)
      .join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `angelical_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        handleExport();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExport]);

  return (
    <div className="flex flex-col h-dvh relative">
      <TopBar
        onMenuClick={() => setSidebarOpen(true)}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      <VoiceOrb />

      <Transcript messages={messages} />

      <ChatInput
        onNewMessage={handleNewMessage}
        onHistoryUpdate={handleHistoryUpdate}
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
