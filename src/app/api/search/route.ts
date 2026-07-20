import { NextRequest, NextResponse } from 'next/server';
import { webSearch } from '@/lib/search';

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query) {
      return NextResponse.json({ error: 'No query provided' }, { status: 400 });
    }

    const results = await webSearch(query);
    return NextResponse.json({ results, query });
  } catch (error: any) {
    return NextResponse.json({ results: [], error: error.message }, { status: 500 });
  }
}
