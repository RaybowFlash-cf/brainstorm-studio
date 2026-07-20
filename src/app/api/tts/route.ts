import { NextRequest, NextResponse } from 'next/server';

function getFishKey(userKey?: string): string {
  return userKey || process.env.FISH_API_KEY || '';
}

export async function POST(req: NextRequest) {
  try {
    const { text, model, reference_id, latency, speed, fishKey } = await req.json();
    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const ttsModel = model || 's2.1-pro-free';
    const key = getFishKey(fishKey);

    const resp = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        model: ttsModel,
      },
      body: JSON.stringify({
        text: text.trim(),
        reference_id: reference_id || undefined,
        latency: latency || 'balanced',
        format: 'mp3',
        sample_rate: 44100,
        prosody: {
          speed: speed || 1.0,
          volume: 0,
          normalize_loudness: true,
        },
        chunk_length: 200,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      return NextResponse.json({ error: `TTS error: ${resp.status}: ${errBody}` }, { status: resp.status });
    }

    return new Response(resp.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
