import { collectChat, getLLMConfig, type ChatMessage, type LLMConfig } from '@/lib/ai/client';

/** 图解(diagram)系统提示:要求输出单文件、自包含的 SVG —— 与 baoyu-diagram 技能的输入契约对齐。 */
export function buildDiagramMessages(content: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content: `你是一位资深信息图 / 图解设计师。请把用户内容整理成一张结构清晰的中文图解。

## 要求
- 只输出**一个**独立、自包含的 SVG(含内联样式),不要 markdown 代码围栏,不要任何解释文字。
- 根元素必须是 \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 810" ...>\`。
- 采用深色主题:底色 #0f172a,主色 #22d3ee / #34d399 / #a78bfa,文字 #e2e8f0。
- 结构:标题 + 3~6 个要点/步骤,用圆角矩形、连接线或分区呈现;避免空白与重叠。
- 中文字体 family 使用 "Noto Sans SC", sans-serif。`,
    },
    {
      role: 'user',
      content: `请根据下面内容生成一张图解 SVG:\n\n${content}`,
    },
  ];
}

/** 从 LLM 输出中提取首个 `<svg>…</svg>`;找不到返回 null(不做 mock 兜底)。 */
export function extractSvg(text: string): string | null {
  if (typeof text !== 'string') return null;
  const start = text.indexOf('<svg');
  const end = text.lastIndexOf('</svg>');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + '</svg>'.length).trim();
}

/**
 * 调 LLM 生成图解 SVG 字符串,交由 skill-runner `baoyu-diagram`(svg 透传)落盘。
 * LLM 未返回有效 SVG / 未配置时显式抛错。
 */
export async function generateDiagramSvg(
  content: string,
  config: LLMConfig = getLLMConfig(),
): Promise<string> {
  const text = await collectChat(buildDiagramMessages(content), { temperature: 0.3 }, config);
  const svg = extractSvg(text);
  if (!svg) throw new Error('图解生成失败:LLM 未返回有效 SVG(os 无法渲染,不做兜底)');
  return svg;
}
