import type { ContentBrief, ContentListEntry } from './types';

export const DEFAULT_RADAR_BASE_URL = 'http://127.0.0.1:5080';

export function getRadarBaseUrl(): string {
  return (process.env.RADAR_BASE_URL ?? DEFAULT_RADAR_BASE_URL).replace(/\/+$/, '');
}

async function getJson<T>(path: string, timeoutMs = 10000): Promise<T> {
  const base = getRadarBaseUrl();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Radar request failed for ${path}: ${reason}`);
  }
  if (!res.ok) {
    throw new Error(`Radar returned ${res.status} ${res.statusText} for ${path}`);
  }
  return (await res.json()) as T;
}

/** List available content briefs. GET /api/content */
export async function fetchContentList(): Promise<ContentListEntry[]> {
  const data = await getJson<ContentListEntry[]>('/api/content');
  return Array.isArray(data) ? data : [];
}

/** Fetch a full content brief. GET /api/content/<date> */
export async function fetchContentBrief(date: string): Promise<ContentBrief> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid brief date: ${date}`);
  }
  return getJson<ContentBrief>(`/api/content/${date}`);
}
