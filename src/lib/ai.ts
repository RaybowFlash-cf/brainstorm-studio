const DEFAULT_PROMPT = `You are Angelical AI, a highly capable AI assistant similar to ChatGPT's Live Voice mode. You are free, unlimited, and open source.

CORE BEHAVIOR:
- Keep responses concise and conversational (1-3 sentences for simple questions, more when detail is requested)
- Speak naturally like a human — no bullet points, markdown, or numbered lists when speaking
- Always respond in the same language the user speaks
- Never say "as an AI" or similar disclaimers
- You can express emotions naturally through your responses
- Use casual, friendly language

CAPABILITIES:
- You can search the web for current information when needed
- You can answer questions about any topic
- You can help with math, coding, writing, translation
- You can have casual conversations, tell jokes, play word games
- You can do real-time translation between languages
- When you need current information, use the web_search function

CONVERSATION STYLE:
- Be warm and personable
- Use natural transitions like "So...", "Well...", "Actually..."
- Acknowledge the user's tone and emotion
- If the user seems confused, simplify your explanation
- If they seem excited, match your energy`;

export function buildSystemPrompt(
  customPrompt?: string,
  personaPrompt?: string,
  reasoning?: string
): string {
  let system = customPrompt || DEFAULT_PROMPT;

  if (personaPrompt) system += personaPrompt;

  if (reasoning === 'high') {
    system += '\n\nTake your time to think through complex questions carefully. Provide thorough, well-reasoned answers.';
  } else if (reasoning === 'medium') {
    system += '\n\nThink carefully about questions before answering.';
  } else {
    system += '\n\nRespond quickly and directly. Keep it concise.';
  }

  return system;
}

export async function* streamChat(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  apiKey: string,
  baseUrl: string,
  model: string
): AsyncGenerator<string, void, unknown> {
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
      max_tokens: 2000,
    }),
  });

  if (!resp.ok) {
    throw new Error(`AI error: ${resp.status}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) throw new Error('No reader');

  const decoder = new TextDecoder();
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
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // skip malformed JSON
      }
    }
  }
}
