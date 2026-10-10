import { getRadarBaseUrl, fetchContentList } from '@/lib/radar/client';
import { getDb } from '@/lib/db/client';
import { DEFAULT_LLM_BASE_URL, DEFAULT_LLM_MODEL } from '@/lib/ai/client';

export const runtime = 'nodejs';

export async function GET() {
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  checks.llm = {
    ok: Boolean(process.env.LLM_API_KEY),
    detail: process.env.LLM_API_KEY
      ? `${process.env.LLM_BASE_URL ?? DEFAULT_LLM_BASE_URL} · ${process.env.LLM_MODEL ?? DEFAULT_LLM_MODEL}`
      : 'LLM_API_KEY not set',
  };

  try {
    getDb();
    checks.db = { ok: true, detail: 'sqlite ready' };
  } catch (err) {
    checks.db = { ok: false, detail: err instanceof Error ? err.message : 'db error' };
  }

  try {
    const list = await fetchContentList();
    checks.radar = { ok: true, detail: `${getRadarBaseUrl()} · ${list.length} brief(s)` };
  } catch (err) {
    checks.radar = { ok: false, detail: err instanceof Error ? err.message : 'radar unreachable' };
  }

  const ok = Object.values(checks).every((c) => c.ok);
  return Response.json({ ok, checks }, { status: ok ? 200 : 503 });
}
