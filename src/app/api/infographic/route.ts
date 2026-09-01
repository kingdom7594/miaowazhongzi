import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

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
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages = [
      { role: 'system' as const, content: buildInfographicPrompt() },
      { role: 'user' as const, content: `标题：${title}\n内容：${content}\n\n请生成信息图 HTML 代码。` },
    ];

    const stream = client.stream(messages, { model: 'doubao-seed-2-0-lite-260215', temperature: 0.7 });
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
