import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import {
  buildSystemPrompt, buildUserPrompt, buildRewriteSystemPrompt, buildRewriteUserPrompt,
  buildExtractionSystemPrompt, buildExtractionUserPrompt,
  buildPlatformRewriteSystemPrompt, buildPlatformRewriteUserPrompt,
} from '@/lib/prompts';
import { getPlatformSpec } from '@/lib/platform-config';

export async function POST(request: NextRequest) {
  try {
    const { formData } = await request.json();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);
    const mode = formData.mode || 'original';
    const platform = formData.platform || 'xiaohongshu';

    if (mode === 'multi-platform') {
      return handleMultiPlatformRewrite(client, formData, customHeaders);
    }

    const isRewrite = mode === 'rewrite';
    const aiDensity = formData.aiDensity ?? 50;
    const wordCount = formData.wordCount ?? 500;
    const messages = [
      { role: 'system' as const, content: isRewrite ? buildRewriteSystemPrompt(platform, wordCount) : buildSystemPrompt(platform, aiDensity, wordCount) },
      { role: 'user' as const, content: isRewrite ? buildRewriteUserPrompt(formData) : buildUserPrompt(formData) },
    ];

    const stream = client.stream(messages, { model: 'doubao-seed-2-0-lite-260215', temperature: isRewrite ? 0.75 : 0.85 });
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

async function collectStream(client: LLMClient, messages: { role: 'system' | 'user'; content: string }[], temperature: number): Promise<string> {
  const stream = client.stream(messages, { model: 'doubao-seed-2-0-lite-260215', temperature });
  let content = '';
  for await (const chunk of stream) { if (chunk.content) content += chunk.content.toString(); }
  return content;
}

async function handleMultiPlatformRewrite(
  client: LLMClient,
  formData: { rewriteOriginal: string; rewritePlatforms: string[]; rewriteFocus: string },
  _headers: Record<string, string>
) {
  const encoder = new TextEncoder();
  const platforms = formData.rewritePlatforms || ['xiaohongshu', 'douyin', 'wechat', 'bilibili'];
  const focus = formData.rewriteFocus || '保持原意';
  const originalText = formData.rewriteOriginal || '';

  const readable = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', status: 'extracting' })}\n\n`));
        const extractionMessages = [
          { role: 'system' as const, content: buildExtractionSystemPrompt() },
          { role: 'user' as const, content: buildExtractionUserPrompt(originalText) },
        ];
        const extractionResult = await collectStream(client, extractionMessages, 0.3);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'extraction', content: extractionResult })}\n\n`));

        for (const platformId of platforms) {
          const spec = getPlatformSpec(platformId);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'platform_start', platform: platformId, platformName: spec.name })}\n\n`));
          const rewriteMessages = [
            { role: 'system' as const, content: buildPlatformRewriteSystemPrompt(platformId) },
            { role: 'user' as const, content: buildPlatformRewriteUserPrompt(platformId, extractionResult, originalText, focus) },
          ];
          const stream = client.stream(rewriteMessages, { model: 'doubao-seed-2-0-lite-260215', temperature: spec.temperature });
          for await (const chunk of stream) {
            if (chunk.content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'platform_content', platform: platformId, content: chunk.content.toString() })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'platform_done', platform: platformId })}\n\n`));
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
}
