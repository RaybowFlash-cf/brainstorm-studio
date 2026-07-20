import { NextRequest, NextResponse } from 'next/server';

function getFishKey(userKey?: string): string {
  return userKey || process.env.FISH_API_KEY || '';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const text = formData.get('text') as string;
    const fishKey = formData.get('key') as string;

    if (!audio) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const key = getFishKey(fishKey || undefined);

    const fwd = new FormData();
    fwd.append('audio', audio, audio.name || 'clone.mp3');
    if (title) fwd.append('title', title);
    if (description) fwd.append('description', description);
    if (text) fwd.append('text', text);

    const resp = await fetch('https://api.fish.audio/v1/voice/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: fwd,
    });

    const data = await resp.json();
    if (!resp.ok) {
      return NextResponse.json(data, { status: resp.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
