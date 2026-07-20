'use client';

import React from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { VoicePhase } from '@/types';

const PHASE_LABELS: Record<VoicePhase, string> = {
  idle: 'Live',
  listening: 'Listening...',
  thinking: 'Thinking...',
  speaking: 'Speaking...',
  searching: 'Searching...',
  error: 'Error',
};

const PHASE_DOT_CLASS: Record<VoicePhase, string> = {
  idle: 'bg-gray-500',
  listening: 'bg-yellow-500 animate-pulse',
  thinking: 'bg-purple-400 animate-pulse',
  speaking: 'bg-green-400 animate-pulse',
  searching: 'bg-blue-400 animate-pulse',
  error: 'bg-red-500',
};

interface TopBarProps {
  onMenuClick: () => void;
  onSettingsClick: () => void;
}

export function TopBar({ onMenuClick, onSettingsClick }: TopBarProps) {
  const phase = useAppStore((s) => s.phase);
  const msgCount = useAppStore((s) => s.msgCount);
  const errCount = useAppStore((s) => s.errCount);
  const sessionStart = useAppStore((s) => s.sessionStart);

  const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;

  return (
    <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3.5 px-4">
      <div className="flex items-center gap-2.5">
        <button
          onClick={onMenuClick}
          className="w-[42px] h-[42px] rounded-full border-none bg-[var(--color-surface)] text-[var(--color-text)] grid place-items-center cursor-pointer hover:bg-white/16 transition-colors backdrop-blur-xl"
          aria-label="Menu"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="inline-flex items-center gap-[7px] px-4 py-[7px] rounded-full bg-[var(--color-surface)] backdrop-blur-xl text-sm font-medium tracking-wide">
          <div className={`w-2 h-2 rounded-full ${PHASE_DOT_CLASS[phase]}`} />
          <span>{PHASE_LABELS[phase]}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex gap-3 text-[11px] text-[var(--color-muted)] pointer-events-none">
          <span className="flex items-center gap-1">⚡{msgCount} msgs</span>
          <span className="flex items-center gap-1">⏱{m}:{String(s).padStart(2, '0')}</span>
          {errCount > 0 && (
            <span className="text-red-500 flex items-center gap-1">⚠{errCount}</span>
          )}
        </div>

        <button
          onClick={onSettingsClick}
          className="w-[42px] h-[42px] rounded-full border-none bg-[var(--color-surface)] text-[var(--color-text)] grid place-items-center cursor-pointer hover:bg-white/16 transition-colors backdrop-blur-xl"
          aria-label="Settings"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06A1.65 1.65 0 0015 19.4a1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
