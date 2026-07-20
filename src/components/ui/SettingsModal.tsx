'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { PERSONAS } from '@/lib/personas';
import { Persona } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useAppStore();
  const filteredVoices = useAppStore((s) => s.filteredVoices);
  const allVoices = useAppStore((s) => s.allVoices);
  const setFilteredVoices = useAppStore((s) => s.setFilteredVoices);
  const [activeTab, setActiveTab] = useState<'general' | 'voice' | 'ai' | 'about'>('general');
  const [voiceSearchQuery, setVoiceSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleVoiceSearch = (q: string) => {
    setVoiceSearchQuery(q);
    if (!q.trim()) {
      setFilteredVoices(allVoices);
      return;
    }
    const lower = q.toLowerCase();
    setFilteredVoices(
      allVoices.filter(
        (v) =>
          (v.title || '').toLowerCase().includes(lower) ||
          (v._id || '').toLowerCase().includes(lower)
      )
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-[6px] grid place-items-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#18181b] rounded-[22px] p-7 w-[92%] max-w-[440px] max-h-[88dvh] overflow-y-auto border border-white/[0.08]">
        <h2 className="text-lg font-semibold mb-5">Settings</h2>

        <div className="flex gap-1.5 mb-4">
          {(['general', 'voice', 'ai', 'about'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-2 border-none rounded-lg text-xs font-medium cursor-pointer transition-all ${
                activeTab === tab
                  ? 'bg-purple-500/15 text-purple-400'
                  : 'bg-white/[0.06] text-[var(--color-muted)]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'general' && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Persona</label>
              <div className="grid grid-cols-2 gap-1.5">
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => updateSettings({ persona: p.id })}
                    className={`py-2 px-2 border rounded-lg text-xs cursor-pointer transition-all text-center ${
                      settings.persona === p.id
                        ? 'border-purple-500/40 text-purple-400 bg-purple-500/8'
                        : 'border-white/[0.08] text-[var(--color-muted)] bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                  >
                    {p.emoji} {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Reasoning</label>
              <select
                value={settings.reasoning}
                onChange={(e) => updateSettings({ reasoning: e.target.value as any })}
                className="w-full p-2.5 rounded-[10px] border border-white/10 bg-white/[0.05] text-white text-sm outline-none appearance-none"
              >
                <option value="instant">Instant (Fast)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="high">High (Detailed)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Language (STT)</label>
              <select
                value={settings.language}
                onChange={(e) => updateSettings({ language: e.target.value })}
                className="w-full p-2.5 rounded-[10px] border border-white/10 bg-white/[0.05] text-white text-sm outline-none appearance-none"
              >
                <option value="pt-BR">Portugues (BR)</option>
                <option value="en-US">English</option>
                <option value="es-ES">Espanol</option>
                <option value="fr-FR">Francais</option>
                <option value="de-DE">Deutsch</option>
                <option value="ja-JP">Japanese</option>
                <option value="zh-CN">Chinese</option>
                <option value="ko-KR">Korean</option>
                <option value="it-IT">Italiano</option>
                <option value="ru-RU">Russian</option>
                <option value="ar-SA">Arabic</option>
                <option value="hi-IN">Hindi</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Speed</label>
              <select
                value={settings.speed}
                onChange={(e) => updateSettings({ speed: parseFloat(e.target.value) })}
                className="w-full p-2.5 rounded-[10px] border border-white/10 bg-white/[0.05] text-white text-sm outline-none appearance-none"
              >
                <option value="0.8">Slow</option>
                <option value="1.0">Normal</option>
                <option value="1.2">Fast</option>
                <option value="1.5">Very Fast</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">TTS Model</label>
              <select
                value={settings.ttsModel}
                onChange={(e) => updateSettings({ ttsModel: e.target.value })}
                className="w-full p-2.5 rounded-[10px] border border-white/10 bg-white/[0.05] text-white text-sm outline-none appearance-none"
              >
                <option value="s2.1-pro-free">s2.1-pro-free (Free)</option>
                <option value="s2.1-pro">s2.1-pro (Recommended)</option>
                <option value="s2-pro">s2-pro</option>
                <option value="s1">s1</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'voice' && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Search Voice</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={voiceSearchQuery}
                  onChange={(e) => handleVoiceSearch(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full pl-9 p-2.5 rounded-[10px] border border-white/10 bg-white/[0.05] text-white text-sm outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Voice (Fish Studio)</label>
              <select
                value={settings.voiceId}
                onChange={(e) => updateSettings({ voiceId: e.target.value })}
                className="w-full p-2.5 rounded-[10px] border border-white/10 bg-white/[0.05] text-white text-sm outline-none appearance-none"
              >
                <option value="">Default System Voice</option>
                {filteredVoices.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.title || v._id}{v.accent ? ` (${v.accent})` : ''}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-[var(--color-muted)] mt-1">
                {filteredVoices.length} voices available
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Custom System Prompt</label>
              <textarea
                value={settings.customPrompt}
                onChange={(e) => updateSettings({ customPrompt: e.target.value })}
                placeholder="Leave empty for default..."
                className="w-full p-2.5 rounded-[10px] border border-white/10 bg-white/[0.05] text-white text-sm outline-none min-h-[80px] resize-vertical"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Your Fish Studio API Key</label>
              <input
                type="text"
                value={settings.fishApiKey}
                onChange={(e) => updateSettings({ fishApiKey: e.target.value })}
                placeholder="Optional — uses server default"
                className="w-full p-2.5 rounded-[10px] border border-white/10 bg-white/[0.05] text-white text-sm outline-none"
              />
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="text-[13px] text-[var(--color-muted)] leading-relaxed space-y-3">
            <p><strong className="text-[var(--color-text)]">Angelical AI</strong></p>
            <p>Free, unlimited, open source ChatGPT alternative with voice.</p>
            <div>
              <p className="font-medium text-white/60 mb-1">Keyboard Shortcuts:</p>
              <p>Space — Toggle microphone</p>
              <p>Esc — Stop speech</p>
              <p>Ctrl+E — Export conversation</p>
              <p>Ctrl+L — Clear conversation</p>
            </div>
            <div>
              <p className="font-medium text-white/60 mb-1">Voice Commands:</p>
              <p>&quot;Stop&quot;, &quot;Pare&quot; — Stop everything</p>
              <p>&quot;Repeat&quot;, &quot;Repita&quot; — Repeat last response</p>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-3 py-3 border-none rounded-xl bg-white/10 text-white text-[15px] font-medium cursor-pointer hover:bg-white/18 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
