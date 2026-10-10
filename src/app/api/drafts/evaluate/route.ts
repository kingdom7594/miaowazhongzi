import { NextRequest } from 'next/server';
import { collectChat, getJudgeConfig } from '@/lib/ai/client';
import { getDraft, updateDraftEvaluation } from '@/lib/db/drafts';
import { getTopic } from '@/lib/db/topics';
import { evaluateDraft } from '@/lib/production/pipeline';
import type { JudgeCompleter } from '@/lib/compliance/judge';
import type { ContentTopic } from '@/lib/radar/types';

export const runtime = 'nodejs';

/** 对存量 draft 补跑「规则 + judge」双闸门并回填 compliance / scores。 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { draftId?: number };
    if (typeof body.draftId !== 'number') {
      return Response.json({ error: 'draftId (number) is required' }, { status: 400 });
    }
    const record = getDraft(body.draftId);
    if (!record) {
      return Response.json({ error: `Draft not found: ${body.draftId}` }, { status: 404 });
    }
    const topicRecord = getTopic(record.topicId);
    if (!topicRecord) {
      return Response.json({ error: `Topic not found: ${record.topicId}` }, { status: 404 });
    }

    const judgeConfig = getJudgeConfig();
    const judgeCompleter: JudgeCompleter = ({ system, user, temperature }) =>
      collectChat(
        [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        { temperature },
        judgeConfig,
      );

    const evaluated = await evaluateDraft(record, topicRecord as ContentTopic, {
      judgeCompleter,
      judgeModel: judgeConfig.model,
    });
    updateDraftEvaluation(record.id, {
      compliance: evaluated.compliance,
      scores: evaluated.scores,
    });

    return Response.json({ draft: { ...record, ...evaluated } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Draft evaluation failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
