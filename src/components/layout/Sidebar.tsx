'use client';

import React from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { Conversation } from '@/types';
import { loadConversations } from '@/lib/storage';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const conversations = useAppStore((s) => s.conversations);
  const currentConversationId = useAppStore((s) => s.currentConversationId);
  const setCurrentConversation = useAppStore((s) => s.setCurrentConversation);
  const deleteConversation = useAppStore((s) => s.deleteConversation);

  const handleSelect = (id: string) => {
    setCurrentConversation(id);
    onClose();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      deleteConversation(id);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-[199] transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 left-0 w-[280px] h-full bg-[#111] z-[200] transform transition-transform duration-300 ease-in-out p-5 overflow-y-auto border-r border-white/[0.08] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <h3 className="text-sm font-semibold mb-3 text-white/70">Conversations</h3>

        <div className="space-y-1.5">
          {conversations.length === 0 ? (
            <div className="text-[13px] text-[var(--color-muted)] p-2.5">No conversations yet</div>
          ) : (
            [...conversations].reverse().map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelect(conv.id)}
                className={`p-2.5 rounded-[10px] cursor-pointer transition-all border ${
                  currentConversationId === conv.id
                    ? 'bg-white/[0.08] border-white/[0.06]'
                    : 'bg-white/[0.04] border-transparent hover:bg-white/[0.08] hover:border-white/[0.06]'
                }`}
              >
                <div className="font-medium text-[13px] mb-0.5 truncate">
                  {conv.title || 'Conversation'}
                </div>
                <div className="text-[11px] text-[var(--color-muted)] truncate">
                  {conv.messages?.[0]?.content || 'Empty'}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="text-[10px] text-[var(--color-muted)]">
                    {new Date(conv.createdAt).toLocaleDateString()}
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    className="text-[10px] text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity bg-transparent border-none cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 py-3 border-none rounded-xl bg-white/10 text-white text-[15px] font-medium cursor-pointer hover:bg-white/18 transition-colors"
        >
          Close
        </button>
      </div>
    </>
  );
}
