import { fetchContentBrief, fetchContentList } from './client';
import { upsertBriefTopics, type IngestResult } from '@/lib/db/topics';

export interface IngestOutcome {
  date: string;
  result: IngestResult;
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
