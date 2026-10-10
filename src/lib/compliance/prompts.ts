import type { ContentTopic } from '@/lib/radar/types';
import type { Draft } from '@/lib/types';
import { getPlatformSpec } from '@/lib/platform-config';

export const COMPLIANCE_JUDGE_SYSTEM = `你是小红书/多平台内容发布的**合规审核员**,只做合规判断,不评价内容好坏。
你独立于内容生成模型,不得假设生成内容"应该没问题";任何可疑点都要指出。

审核维度:
- 违规词 / 敏感词:平台违禁词、行业敏感词。
- 绝对化用语:最、第一、100%、绝对、保证、永久、包过、稳赚、暴富等。
- 数据来源:正文引用的数字/事实是否可追溯到选题依据(url);有无编造数字。
- 站外导流:微信/二维码/外链/联系方式等导流表达。
- 收益承诺:承诺收益、结果、录取、考试通过等不可保证事项。
- 医疗/心理/宠物免责:涉及健康、心理、宠物健康内容是否缺免责声明。
- 版权红线:出版物/课程/机构水印/未经授权内容;AI 生成内容是否需标识。

只输出 JSON,不要解释、不要 markdown：
{"passed": true, "risks": ["风险1"], "notes": "修改建议"}`;

/** 构造合规 judge 的用户 prompt。 */
export function buildComplianceJudgeUserPrompt(draft: Draft, topic: ContentTopic): string {
  const spec = getPlatformSpec(draft.platform);
  const evidence = (topic.evidence ?? [])
    .map((e) => `  - ${e.claim} (来源: ${e.url || '(无 URL)'})`)
    .join('\n');
  return `平台:${spec.name} (${spec.id})

## 待审稿件
- 标题候选:${(draft.titles ?? []).join(' | ') || '(无)'}
- 正文:
${draft.body}
- 标签:${(draft.tags ?? []).join(' ') || '(无)'}
- 封面提示词:${draft.coverPrompt ?? '(无)'}

## 选题依据(用于核对数据来源,禁止编造)
${evidence || '  - (无直接信号)'}

请按维度审核,输出 {"passed": boolean, "risks": string[], "notes": string}。`;
}
