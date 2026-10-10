import type { ContentTopic } from '@/lib/radar/types';
import type { Draft } from '@/lib/types';
import { getPlatformSpec } from '@/lib/platform-config';

export const EVAL_JUDGE_SYSTEM = `你是严格的小红书内容质量评审(怀疑的内容分析师)。对每一条稿件按 5 个维度打 1–5 整数分。

维度定义：
- hook        钩子强度：前 2 行/标题是否抓人,能否让人停下 → 1 平淡,5 极强
- audienceFit 受众契合：是否精准命中目标人群的痛点与语言 → 1 错配,5 高度契合
- evidence    依据支撑：论点是否有真实依据/来源,数字是否可追溯 → 1 空泛或编造,5 扎实可追溯
- platformFit 平台规范：是否符合平台字数/风格/结构/话题规范 → 1 明显不符,5 完全符合
- originality 原创性：是否有独特视角与表达,而非套话/洗稿 → 1 高度同质,5 明显原创

判分要基于稿件与选题依据,不得假设"应该没问题"。只输出 JSON,不要解释、不要 markdown：
{"items":[{"index":0,"hook":n,"audienceFit":n,"evidence":n,"platformFit":n,"originality":n}, ...]}`;

export interface EvalJudgeItem {
  draft: Draft;
  topic: ContentTopic;
}

/** 构造批量质量评审的用户 prompt。 */
export function buildEvalJudgeUserPrompt(items: EvalJudgeItem[]): string {
  const lines = items.map((item, i) => {
    const spec = getPlatformSpec(item.draft.platform);
    const evidence = (item.topic.evidence ?? [])
      .map((e) => `${e.claim}(${e.url || '无 URL'})`)
      .join('; ');
    const brief = {
      platform: `${spec.name}(${spec.id})`,
      topicHeadline: item.topic.headline,
      audience: item.topic.audience ?? '',
      titles: item.draft.titles ?? [],
      body: item.draft.body,
      tags: item.draft.tags ?? [],
      evidence: evidence || '(无直接信号)',
    };
    return `[${i}] ${JSON.stringify(brief)}`;
  });
  return `请对以下 ${
    items.length
  } 条稿件逐条打分（每条都要给出 index 与 5 个维度分）：\n\n${lines.join('\n')}`;
}
