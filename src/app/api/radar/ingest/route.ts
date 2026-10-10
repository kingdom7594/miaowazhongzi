import { NextRequest } from 'next/server';
import { ingestBrief, ingestLatest } from '@/lib/radar/ingest';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { date?: string };
    const outcome = body?.date ? await ingestBrief(body.date) : await ingestLatest();
    return Response.json({ ok: true, ...outcome });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Radar ingest failed';
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
