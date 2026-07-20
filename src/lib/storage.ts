import { Conversation, Message } from '@/types';

const STORAGE_KEY = 'angelical_conversations';
const SETTINGS_KEY = 'angelical_settings';
const MAX_CONVERSATIONS = 50;

export function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  if (typeof window === 'undefined') return;
  const trimmed = conversations.slice(-MAX_CONVERSATIONS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function createConversation(
  firstMessage: Message,
  model?: string,
  persona?: string
): Conversation {
  return {
    id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: firstMessage.content.slice(0, 50),
    messages: [firstMessage],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model,
    persona,
  };
}

export function updateConversation(
  conversation: Conversation,
  newMessages: Message[]
): Conversation {
  return {
    ...conversation,
    messages: newMessages,
    updatedAt: Date.now(),
    title: newMessages[0]?.content?.slice(0, 50) || conversation.title,
  };
}

export function exportConversationAsText(conversation: Conversation): string {
  return conversation.messages
    .map(m => `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`)
    .join('\n\n');
}

export function exportConversationAsMarkdown(conversation: Conversation): string {
  let md = `# ${conversation.title}\n\n`;
  md += `*Created: ${new Date(conversation.createdAt).toLocaleString()}*\n\n---\n\n`;

  for (const msg of conversation.messages) {
    const icon = msg.role === 'user' ? '👤' : '🤖';
    md += `### ${icon} ${msg.role === 'user' ? 'You' : 'Angelical AI'}\n\n`;
    md += `${msg.content}\n\n---\n\n`;
  }

  return md;
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function loadSettings<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function saveSettings(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}
