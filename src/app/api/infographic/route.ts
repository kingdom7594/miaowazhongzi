import { NextRequest } from 'next/server';
import { getLLMConfig, streamChat, toSSEResponse } from '@/lib/ai/client';

export const runtime = 'nodejs';

function buildInfographicPrompt(): string {
  return `你是一位专业的信息图设计师。根据用户提供的内容，生成手绘风格信息图的 HTML/CSS 代码。

## 设计要求
- 暖色调（米黄、浅橙、淡粉）
- 手绘风格边框和装饰
- 清晰的层次结构
- 直接输出完整 HTML 代码（含内联 CSS）`;
}

export async function POST(request: NextRequest) {
  try {
    const { content, title } = await request.json();
    const config = getLLMConfig();

    const messages = [
      { role: 'system' as const, content: buildInfographicPrompt() },
      { role: 'user' as const, content: `标题：${title}\n内容：${content}\n\n请生成信息图 HTML 代码。` },
    ];

    return toSSEResponse(async (emit) => {
      for await (const chunk of streamChat(messages, { temperature: 0.7 }, config)) {
        emit({ content: chunk.content });
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
