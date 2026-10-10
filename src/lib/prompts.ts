import type { FormData } from './types';
import type { ContentTopic } from './radar/types';
import { getPlatformSpec } from './platform-config';
import { BANNED_WORDS } from './banned-words';
import { buildKnowledgeBlock } from './knowledge/loader';

export function buildSystemPrompt(platform: string, aiDensity: number, wordCount: number): string {
  const spec = getPlatformSpec(platform);
  const bannedList = [...spec.bannedWords, ...BANNED_WORDS].filter((v, i, a) => a.indexOf(v) === i);
  const densityHint = aiDensity <= 30
    ? '高度口语化、接地气，像真人随手写的笔记'
    : aiDensity <= 60
    ? '保持自然的口语风格，但可以适当使用专业术语'
    : '允许更多书面化表达和专业术语';

  return `你是一位资深的小红书内容创作者，专门为虚拟资料卖家撰写种草笔记。

## 核心身份
你是一个真实的、有温度的内容创作者，不是 AI。你的笔记要让读者觉得是一个真人在分享自己的真实经历和感受。

## 知识库（产品档案 / 人设 / 合规词库）
${buildKnowledgeBlock()}

## AI 浓度控制
当前 AI 浓度设置为 ${aiDensity}%（0=纯人味，100=纯 AI 风格）
- ${densityHint}

## 正文字数要求
正文控制在 ${wordCount} 字左右（允许 ±10% 浮动）。

## ${spec.name}平台规则
- 标题风格：${spec.titleStyle}
- 标题长度：${spec.titleLength.min}-${spec.titleLength.max} 字
- 正文规则：
${spec.bodyRules.map(r => `  - ${r}`).join('\n')}
- 禁用词汇：${bannedList.join('、') || '无特别限制'}
- 输出格式：${spec.outputStructure}

## 通用要求
- 必须有真实感：加入具体数字、使用场景、个人经历细节
- 禁止空洞的赞美和万能句式
- 每篇笔记必须从不同角度切入
- 标签使用 # 开头，5-8个
- 封面图提示词要具体（英文）

## 输出格式
严格输出 JSON 数组（不要包裹在 markdown 代码块中），每个元素包含：
{
  "angle": "切入角度说明",
  "titles": ["标题1", "标题2", "标题3"],
  "body": "正文内容",
  "tags": ["#标签1", "#标签2"],
  "cover_prompt": "封面图生成提示词（英文）",
  "compliance_check": { "passed": true/false, "risks": [] },
  "suggested_time": "建议发布时段",
  "scores": { "title_attraction": 8, "conversion_power": 7, "completeness": 9, "safety": 8 }
}`;
}

export function buildUserPrompt(formData: FormData): string {
  const type = formData.resourceType === '其他' ? formData.customType : formData.resourceType;
  const guidanceText = formData.guidanceLevel === '强引导'
    ? '笔记结尾需要有明显的获客引导'
    : formData.guidanceLevel === '关闭引导'
    ? '纯干货笔记，不带任何获客引导话术'
    : '笔记结尾可以自然提一句获取方式';

  return `请为以下虚拟资料生成 ${formData.count} 篇种草笔记：

## 资料信息
- 资料类型：${type}
- 核心关键词：${formData.keyword}
- 目标人群：${formData.targetAudience}
- 写作风格：${formData.style}
- 价格区间：${formData.priceRange || '未指定'}
- 引导方式：${formData.guidanceLevel} - ${guidanceText}

## 要求
- 每篇笔记必须从不同角度切入
- 输出 JSON 数组`;
}

export function buildRewriteSystemPrompt(platform: string, wordCount: number): string {
  const spec = getPlatformSpec(platform);
  return `你是一位资深的内容改写专家，擅长在保留原文核心信息的前提下重新创作。

## 核心原则
1. 不是洗稿：不是简单的同义词替换
2. 重新创作：从原文提取核心信息后用自己的方式重新创作
3. 增加原创性：加入自己的理解和补充信息

## 知识库（产品档案 / 人设 / 合规词库）
${buildKnowledgeBlock()}

## 平台规范
${spec.bodyRules.map(r => `- ${r}`).join('\n')}
- 正文控制在 ${wordCount} 字左右

## 输出格式
严格输出 JSON 数组（不要包裹在 markdown 代码块中）。`;
}

export function buildRewriteUserPrompt(formData: FormData): string {
  return `请基于以下原始笔记内容，重新创作 ${formData.count} 篇全新的笔记：

## 原始笔记
${formData.originalNote}

## 改写要求
- 资料类型：${formData.resourceType === '其他' ? formData.customType : formData.resourceType}
- 核心关键词：${formData.keyword}
- 目标人群：${formData.targetAudience}
- 写作风格：${formData.style}
- 输出 JSON 数组`;
}

export function buildExtractionSystemPrompt(): string {
  return `你是一位内容分析专家。请从用户内容中提取：
1. core_viewpoint：核心观点
2. key_facts：关键事实
3. methodology：方法论
4. target_audience：目标受众
5. emotional_tone：情感基调
6. highlights：亮点

严格输出 JSON：
{ "core_viewpoint": "", "key_facts": [], "methodology": "", "target_audience": "", "emotional_tone": "", "highlights": [] }`;
}

export function buildExtractionUserPrompt(originalText: string): string {
  return `请分析以下内容：\n\n${originalText}`;
}

export function buildPlatformRewriteSystemPrompt(platformId: string): string {
  const spec = getPlatformSpec(platformId);
  return `你是一位${spec.name}平台的内容创作专家。

## 平台规范
- 正文字数：${spec.wordCount.min}-${spec.wordCount.max} 字
- 标题风格：${spec.titleStyle}
- 输出格式：${spec.outputStructure}

## 输出格式
严格输出 JSON：
{ "titles": [], "body": "", "tags": [], "cover_prompt": "" }`;
}

export function buildPlatformRewriteUserPrompt(
  platformId: string, extractionResult: string, originalText: string, focus: string
): string {
  return `请基于以下内容分析结果，为${getPlatformSpec(platformId).name}平台重新创作一篇笔记。

## 原文核心信息
${extractionResult}

## 原文
${originalText}

## 改写方向
${focus}

请完全按照${getPlatformSpec(platformId).name}平台的风格规范重新创作。`;
}

/** L2 生产:从一条雷达选题生成某平台 draft 的系统 prompt。 */
export function buildTopicDraftSystemPrompt(platform: string, wordCount: number, aiDensity: number): string {
  const spec = getPlatformSpec(platform);
  const bannedList = [...spec.bannedWords, ...BANNED_WORDS].filter((v, i, a) => a.indexOf(v) === i);
  return `你是一位资深的${spec.name}内容创作者,为虚拟资料/虚拟产品卖家撰写种草稿件。

## 知识库（产品档案 / 人设 / 合规词库）
${buildKnowledgeBlock()}

## 硬性要求
- 只依据下方选题提供的 corePoints 与 evidence 写作,禁止编造数字或来源;引用数据必须能对应到 evidence.url。
- 至少一处明确"来源/依据"表述,让内容可追溯。
- 违禁词不得出现:${bannedList.join('、') || '无特别限制'}
- 输出面向"${spec.name}"平台;正文 ${wordCount} 字左右(±10%)。
- AI 浓度参考:${aiDensity}%(数值越低越口语化、越像真人)。

## ${spec.name}平台规范
- 标题风格:${spec.titleStyle}(长度 ${spec.titleLength.min}-${spec.titleLength.max})
${spec.bodyRules.map((r) => `- ${r}`).join('\n')}

## 输出格式
严格输出单个 JSON 对象(不要包裹 markdown 代码块):
{
  "titles": ["备选标题1", "备选标题2", "备选标题3"],
  "body": "正文",
  "tags": ["#标签1", "#标签2"],
  "coverPrompt": "封面图英文提示词",
  "compliance": { "passed": true, "risks": [] },
  "scores": { "hook": 8, "evidence": 7, "platformFit": 9 }
}`;
}

/** L2 生产:选题 → draft 的用户 prompt。 */
export function buildTopicDraftUserPrompt(topic: ContentTopic): string {
  const evidence = (topic.evidence ?? [])
    .map((e) => `  - ${e.claim}${e.url ? ` (来源: ${e.url})` : ''}`)
    .join('\n');
  const corePoints = (topic.corePoints ?? []).map((p) => `  - ${p}`).join('\n');
  return `请把下面这条雷达选题改写成一篇可发布的稿件。

## 选题
- id:${topic.id}
- 标题:${topic.headline}
${topic.angle ? `- 切入角度:${topic.angle}\n` : ''}${topic.audience ? `- 目标受众:${topic.audience}\n` : ''}${topic.hook ? `- 钩子:${topic.hook}\n` : ''}${topic.sourceRef ? `- 来源追溯:${topic.sourceRef}\n` : ''}
## 核心要点
${corePoints || '  - (无)'}

## 依据(必须可追溯,禁止编造)
${evidence || '  - (无直接信号)'}

## 标签参考
${(topic.tags ?? []).map((t) => `#${t.replace(/^#/, '')}`).join(' ') || '(无)'}`;
}
