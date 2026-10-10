import { NextRequest } from 'next/server';
import { getLLMConfig, streamChat, toSSEResponse } from '@/lib/ai/client';

export const runtime = 'nodejs';

function buildTitleBoostSystemPrompt(): string {
  return `你是一位资深的小红书爆款标题专家。

## 任务
根据用户提供的笔记正文、关键词、目标人群，生成10个爆款标题，按5种类型分类：
1. 痛点型 2. 数字型 3. 悬念型 4. 对比型 5. 干货型

## 要求
- 每个标题20字以内
- 适当使用emoji
- 避免违禁词
- 输出纯JSON：{ "titles": [{ "type": "痛点型", "title": "标题" }] }`;
}

export async function POST(request: NextRequest) {
  try {
    const { body, keyword, targetAudience } = await request.json();
    const config = getLLMConfig();

    const messages = [
      { role: 'system' as const, content: buildTitleBoostSystemPrompt() },
      { role: 'user' as const, content: `笔记正文：${body}\n关键词：${keyword}\n目标人群：${targetAudience}\n\n请生成10个爆款标题。` },
    ];

    return toSSEResponse(async (emit) => {
      for await (const chunk of streamChat(messages, { temperature: 0.9 }, config)) {
        emit({ content: chunk.content });
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
