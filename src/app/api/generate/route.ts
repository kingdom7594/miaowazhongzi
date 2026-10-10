import { NextRequest } from 'next/server';
import { collectChat, getLLMConfig, streamChat, toSSEResponse } from '@/lib/ai/client';
import {
  buildSystemPrompt, buildUserPrompt, buildRewriteSystemPrompt, buildRewriteUserPrompt,
  buildExtractionSystemPrompt, buildExtractionUserPrompt,
  buildPlatformRewriteSystemPrompt, buildPlatformRewriteUserPrompt,
} from '@/lib/prompts';
import { getPlatformSpec } from '@/lib/platform-config';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { formData } = await request.json();
    const config = getLLMConfig();
    const mode = formData.mode || 'original';
    const platform = formData.platform || 'xiaohongshu';

    if (mode === 'multi-platform') {
      return handleMultiPlatformRewrite(config, formData);
    }

    const isRewrite = mode === 'rewrite';
    const aiDensity = formData.aiDensity ?? 50;
    const wordCount = formData.wordCount ?? 500;
    const messages = [
      { role: 'system' as const, content: isRewrite ? buildRewriteSystemPrompt(platform, wordCount) : buildSystemPrompt(platform, aiDensity, wordCount) },
      { role: 'user' as const, content: isRewrite ? buildRewriteUserPrompt(formData) : buildUserPrompt(formData) },
    ];

    return toSSEResponse(async (emit) => {
      for await (const chunk of streamChat(messages, {
        temperature: isRewrite ? 0.75 : 0.85,
      }, config)) {
        emit({ content: chunk.content });
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}

async function handleMultiPlatformRewrite(
  config: ReturnType<typeof getLLMConfig>,
  formData: { rewriteOriginal: string; rewritePlatforms: string[]; rewriteFocus: string },
) {
  const platforms = formData.rewritePlatforms || ['xiaohongshu', 'douyin', 'wechat', 'bilibili'];
  const focus = formData.rewriteFocus || '保持原意';
  const originalText = formData.rewriteOriginal || '';

  return toSSEResponse(async (emit) => {
    emit({ type: 'status', status: 'extracting' });
    const extractionMessages = [
      { role: 'system' as const, content: buildExtractionSystemPrompt() },
      { role: 'user' as const, content: buildExtractionUserPrompt(originalText) },
    ];
    const extractionResult = await collectChat(extractionMessages, { temperature: 0.3 }, config);
    emit({ type: 'extraction', content: extractionResult });

    for (const platformId of platforms) {
      const spec = getPlatformSpec(platformId);
      emit({ type: 'platform_start', platform: platformId, platformName: spec.name });
      const rewriteMessages = [
        { role: 'system' as const, content: buildPlatformRewriteSystemPrompt(platformId) },
        { role: 'user' as const, content: buildPlatformRewriteUserPrompt(platformId, extractionResult, originalText, focus) },
      ];
      for await (const chunk of streamChat(rewriteMessages, { temperature: spec.temperature }, config)) {
        emit({ type: 'platform_content', platform: platformId, content: chunk.content });
      }
      emit({ type: 'platform_done', platform: platformId });
    }
  });
}
