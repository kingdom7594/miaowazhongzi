import { NextRequest } from 'next/server';
import { collectChat, getLLMConfig, getJudgeConfig } from '@/lib/ai/client';
import { getTopic } from '@/lib/db/topics';
import { insertDraft } from '@/lib/db/drafts';
import { produceDraftsForTopicEvaluated } from '@/lib/production/pipeline';
import type { JudgeCompleter } from '@/lib/compliance/judge';
import type { ContentTopic } from '@/lib/radar/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      topicId?: string;
      platforms?: string[];
      wordCount?: number;
      aiDensity?: number;
      skipEval?: boolean;
    };
    const topicId = body.topicId;
    if (!topicId) {
      return Response.json({ error: 'topicId is required' }, { status: 400 });
    }
    const topicRecord = getTopic(topicId);
    if (!topicRecord) {
      return Response.json({ error: `Topic not found: ${topicId}` }, { status: 404 });
    }
    const platforms =
      Array.isArray(body.platforms) && body.platforms.length > 0 ? body.platforms : ['xiaohongshu'];

    const config = getLLMConfig();
    const topic: ContentTopic = topicRecord;

    let evaluator;
    if (!body.skipEval) {
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
      evaluator = { judgeCompleter, judgeModel: judgeConfig.model };
    }

    const results = await produceDraftsForTopicEvaluated(topic, platforms, {
      wordCount: body.wordCount,
      aiDensity: body.aiDensity,
      skipEval: body.skipEval,
      evaluator,
      completer: ({ system, user, temperature }) =>
        collectChat(
          [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          { temperature },
          config,
        ),
    });

    const drafts = results
      .filter((r) => r.draft)
      .map((r) => ({ id: insertDraft(r.draft!, 'draft'), ...r.draft! }));
    const errors = results.filter((r) => r.error);

    return Response.json({ drafts, errors });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Draft generation failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
