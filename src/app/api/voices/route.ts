import { NextRequest, NextResponse } from 'next/server';

function getFishKey(userKey?: string): string {
  return userKey || process.env.FISH_API_KEY || '';
}

export async function GET(req: NextRequest) {
  try {
    const fishKey = getFishKey(req.nextUrl.searchParams.get('key') || undefined);
    let allVoices: any[] = [];
    let cursor: string | null = null;
    let pages = 0;

    do {
      const url = new URL('https://api.fish.audio/model');
      url.searchParams.set('page_size', '100');
      if (cursor) url.searchParams.set('cursor', cursor);

      const resp = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${fishKey}` },
      });

      if (!resp.ok) break;
      const data = await resp.json();
      allVoices = allVoices.concat(data.items || data.data || []);
      cursor = data.cursor || null;
      pages++;
    } while (cursor && pages < 20);

    return NextResponse.json({ items: allVoices, total: allVoices.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
