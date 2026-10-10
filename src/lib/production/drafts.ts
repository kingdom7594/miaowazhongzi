import type { ContentTopic } from '@/lib/radar/types';
import type { Draft } from '@/lib/types';
import { buildTopicDraftSystemPrompt, buildTopicDraftUserPrompt } from '@/lib/prompts';
import { parseDraftJson } from '@/lib/parse-llm-json';
import { validateDraft } from '@/lib/contracts/validate';
import { getPlatformSpec } from '@/lib/platform-config';

export interface CompleterInput {
  system: string;
  user: string;
  temperature: number;
}

export type Completer = (input: CompleterInput) => Promise<string>;

export interface ProduceResult {
  platform: string;
  draft?: Draft;
  error?: string;
}

export interface ProduceOptions {
  completer: Completer;
  wordCount?: number;
  aiDensity?: number;
}

/** Produce a single platform draft for a topic. Never fabricates: failures surface as errors. */
export async function produceDraftForPlatform(
  topic: ContentTopic,
  platform: string,
  options: ProduceOptions,
): Promise<ProduceResult> {
  const spec = getPlatformSpec(platform);
  const wordCount = options.wordCount ?? Math.round((spec.wordCount.min + spec.wordCount.max) / 2);
  const aiDensity = options.aiDensity ?? 50;

  try {
    const text = await options.completer({
      system: buildTopicDraftSystemPrompt(platform, wordCount, aiDensity),
      user: buildTopicDraftUserPrompt(topic),
      temperature: spec.temperature,
    });
    const draft = parseDraftJson(text, topic.id, platform);
    if (!draft) {
      return { platform, error: 'Model output could not be parsed into a draft' };
    }
    const validation = validateDraft(draft);
    if (!validation.valid) {
      return { platform, error: `Draft violates contract: ${validation.errors.join('; ')}` };
    }
    return { platform, draft };
  } catch (err) {
    return { platform, error: err instanceof Error ? err.message : 'generation failed' };
  }
}

export async function produceDraftsForTopic(
  topic: ContentTopic,
  platforms: string[],
  options: ProduceOptions,
): Promise<ProduceResult[]> {
  const results: ProduceResult[] = [];
  for (const platform of platforms) {
    results.push(await produceDraftForPlatform(topic, platform, options));
  }
  return results;
}
