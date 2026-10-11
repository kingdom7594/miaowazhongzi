import { fetchContentBrief, fetchContentList } from './client';
import { upsertBriefTopics, type IngestResult } from '@/lib/db/topics';

export interface IngestOutcome {
  date: string;
  result: IngestResult;
}

const BRIEF_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * F-09:校验 `date` 是否为 `YYYY-MM-DD` 且为真实存在的日历日期。
 * 非法入参应在 API 层返回 400,而非与上游(雷达)故障混同为 502。
 */
export function isValidBriefDate(date: unknown): date is string {
  if (typeof date !== 'string' || !BRIEF_DATE_RE.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export type ParsedIngestBody =
  | { ok: true; date?: string }
  | { ok: false; message: string };

/**
 * F-09:解析 ingest 请求体。空体 = 拉取最新;`{date}` 必须合法;
 * 非 JSON 对象或非法日期 → `{ok:false}`,由路由返回 400。
 */
export function parseIngestBody(raw: string): ParsedIngestBody {
  if (!raw.trim()) return { ok: true };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, message: '请求体必须是合法 JSON' };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, message: '请求体必须是 JSON 对象' };
  }
  const date = (parsed as { date?: unknown }).date;
  if (date === undefined || date === null) return { ok: true };
  if (!isValidBriefDate(date)) {
    return { ok: false, message: 'date 必须是 YYYY-MM-DD 格式的合法日期' };
  }
  return { ok: true, date };
}

/** Fetch a specific day's content brief from the radar and persist its topics. */
export async function ingestBrief(date: string): Promise<IngestOutcome> {
  const brief = await fetchContentBrief(date);
  if (!brief || !Array.isArray(brief.topics) || brief.topics.length === 0) {
    throw new Error(`Radar brief for ${date} contains no topics`);
  }
  const result = upsertBriefTopics(brief);
  return { date: brief.date ?? date, result };
}

/** Resolve the newest available brief date and ingest it. */
export async function ingestLatest(): Promise<IngestOutcome> {
  const list = await fetchContentList();
  if (list.length === 0) {
    throw new Error('Radar has no content briefs available');
  }
  const latest = [...list].sort((a, b) => b.date.localeCompare(a.date))[0];
  return ingestBrief(latest.date);
}
