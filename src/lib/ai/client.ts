export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export const DEFAULT_LLM_BASE_URL = 'https://api.deepseek.com/v1';
export const DEFAULT_LLM_MODEL = 'deepseek-chat';
export const DEFAULT_JUDGE_MODEL = 'deepseek-reasoner';

/**
 * Read provider config from env. No silent fallback: a missing API key is a hard
 * error so callers never mistake a stub for a real model response.
 */
export function getLLMConfig(overrides: Partial<LLMConfig> = {}): LLMConfig {
  const apiKey = overrides.apiKey ?? process.env.LLM_API_KEY ?? '';
  if (!apiKey) {
    throw new Error(
      'LLM_API_KEY is not set. Configure an OpenAI-compatible endpoint via LLM_API_KEY / LLM_BASE_URL / LLM_MODEL.',
    );
  }
  return {
    apiKey,
    baseUrl: (overrides.baseUrl ?? process.env.LLM_BASE_URL ?? DEFAULT_LLM_BASE_URL).replace(/\/+$/, ''),
    model: overrides.model ?? process.env.LLM_MODEL ?? DEFAULT_LLM_MODEL,
  };
}

/**
 * Read the independent judge provider config. Reuses LLM_* for key/base when
 * JUDGE_* is unset, but **enforces a different model** than the generator so a
 * draft is never self-evaluated by the model that produced it.
 */
export function getJudgeConfig(overrides: Partial<LLMConfig> = {}): LLMConfig {
  const generatorModel = process.env.LLM_MODEL ?? DEFAULT_LLM_MODEL;
  const model = overrides.model ?? process.env.JUDGE_MODEL ?? DEFAULT_JUDGE_MODEL;
  const apiKey = overrides.apiKey ?? process.env.JUDGE_API_KEY ?? process.env.LLM_API_KEY ?? '';
  if (!apiKey) {
    throw new Error(
      'No judge API key: set JUDGE_API_KEY or LLM_API_KEY (JUDGE_* falls back to LLM_*).',
    );
  }
  if (model === generatorModel) {
    throw new Error(
      `Judge model must differ from the generator model (both "${model}"). ` +
        'Set JUDGE_MODEL to an independent model — no self-evaluation.',
    );
  }
  return {
    apiKey,
    baseUrl: (overrides.baseUrl ?? process.env.JUDGE_BASE_URL ?? process.env.LLM_BASE_URL ?? DEFAULT_LLM_BASE_URL).replace(/\/+$/, ''),
    model,
  };
}

async function request(
  config: LLMConfig,
  messages: ChatMessage[],
  options: ChatOptions,
  stream: boolean,
): Promise<Response> {
  const body: Record<string, unknown> = {
    model: options.model ?? config.model,
    messages,
    temperature: options.temperature ?? 0.7,
    stream,
  };
  if (options.maxTokens) body.max_tokens = options.maxTokens;

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`LLM request failed (${res.status} ${res.statusText}): ${detail.slice(0, 500)}`);
  }
  return res;
}

/** Stream an OpenAI-compatible chat completion, yielding incremental text. */
export async function* streamChat(
  messages: ChatMessage[],
  options: ChatOptions = {},
  config: LLMConfig = getLLMConfig(),
): AsyncGenerator<{ content: string }> {
  const res = await request(config, messages, options, true);
  if (!res.body) throw new Error('LLM stream returned an empty body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || !line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const json = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
        const content = json.choices?.[0]?.delta?.content;
        if (content) yield { content };
      } catch {
        // Ignore keep-alive / non-JSON frames.
      }
    }
  }
}

/** Collect a full (non-streamed) completion into a single string. */
export async function collectChat(
  messages: ChatMessage[],
  options: ChatOptions = {},
  config: LLMConfig = getLLMConfig(),
): Promise<string> {
  const res = await request(config, messages, options, false);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? '';
}

/** Build a server-side SSE Response from a chat stream. */
export function toSSEResponse(
  factory: (emit: (data: unknown) => void) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const emit = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      try {
        await factory(emit);
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stream error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
