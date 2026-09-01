import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

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
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages = [
      { role: 'system' as const, content: buildTitleBoostSystemPrompt() },
      { role: 'user' as const, content: `笔记正文：${body}\n关键词：${keyword}\n目标人群：${targetAudience}\n\n请生成10个爆款标题。` },
    ];

    const stream = client.stream(messages, { model: 'doubao-seed-2-0-lite-260215', temperature: 0.9 });
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk.content.toString() })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Stream error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
