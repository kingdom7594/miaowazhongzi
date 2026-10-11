import { NextRequest } from 'next/server';
import { ingestBrief, ingestLatest, parseIngestBody } from '@/lib/radar/ingest';

export const runtime = 'nodejs';

/**
 * F-09:入参校验先行 —— 非法请求体/日期返回 400;仅当上游(雷达)拉取失败才 502。
 */
export async function POST(request: NextRequest) {
  const raw = await request.text().catch(() => '');
  const parsed = parseIngestBody(raw);
  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.message }, { status: 400 });
  }

  try {
    const outcome = parsed.date ? await ingestBrief(parsed.date) : await ingestLatest();
    return Response.json({ ok: true, ...outcome });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Radar ingest failed';
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
