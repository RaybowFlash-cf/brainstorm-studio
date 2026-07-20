'use client';

import React, { useRef, useEffect } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { Message } from '@/types';
import { marked } from 'marked';

interface TranscriptProps {
  messages: Message[];
}

export function Transcript({ messages }: TranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const phase = useAppStore((s) => s.phase);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, phase]);

  if (!messages.length) return null;

  return (
    <div className="absolute bottom-[110px] left-1/2 -translate-x-1/2 w-[92%] max-w-[560px] text-center pointer-events-none z-10">
      <div
        ref={containerRef}
        className="inline-block text-[15px] leading-[1.55] max-h-[160px] overflow-y-auto p-[10px_18px] rounded-[14px] bg-black/45 backdrop-blur-[10px] text-white/88 transition-opacity"
      >
        {messages.slice(-5).map((msg) => (
          <div key={msg.id} className={`mb-2 ${msg.role === 'user' ? 'text-blue-300' : 'text-purple-300'}`}>
            <span className="font-medium">{msg.role === 'user' ? 'You' : 'AI'}: </span>
            <span
              dangerouslySetInnerHTML={{
                __html: marked.parse(msg.content) as string,
              }}
              className="prose prose-invert prose-sm max-w-none"
            />
          </div>
        ))}
        {phase === 'thinking' && (
          <div className="text-purple-300 animate-pulse">Thinking...</div>
        )}
        {phase === 'searching' && (
          <div className="text-blue-300 italic text-sm">Searching the web...</div>
        )}
        {phase === 'listening' && (
          <div className="text-green-400 text-sm opacity-70">Listening...</div>
        )}
      </div>
    </div>
  );
}
