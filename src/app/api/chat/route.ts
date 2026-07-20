import { NextRequest, NextResponse } from 'next/server';
import { buildSystemPrompt } from '@/lib/ai';
import { getPersonaSystemPrompt } from '@/lib/personas';

export async function POST(req: NextRequest) {
  try {
    const { messages, reasoning, customPrompt, persona, model } = await req.json();

    const baseUrl = process.env.AI_BASE_URL || 'https://opencode.ai/zen/v1';
    const apiKey = process.env.AI_API_KEY || '';
    const aiModel = model || process.env.AI_MODEL || 'mimo-v2.5-free';

    const personaPrompt = persona ? getPersonaSystemPrompt(persona) : '';
    const systemContent = buildSystemPrompt(customPrompt, personaPrompt, reasoning);

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [{ role: 'system', content: systemContent }, ...messages],
        stream: true,
        max_tokens: 2000,
      }),
    });

    if (!resp.ok) {
      return NextResponse.json({ error: `AI error: ${resp.status}` }, { status: resp.status });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = resp.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              controller.enqueue(encoder.encode(line + '\n'));
            }
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
