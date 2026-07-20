import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    platform: 'angelical-ai',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
}
