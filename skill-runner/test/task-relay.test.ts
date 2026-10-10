import { describe, expect, it, vi } from 'vitest';
import { TaskRelayProvider } from '../src/providers/task-relay.js';
import { ProviderError } from '../src/providers/errors.js';
import { makeConfig, PNG_1X1, jsonResponse } from './helpers.js';

describe('TaskRelayProvider', () => {
  it('runs submit → poll → content → download and persists the image', async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.endsWith('/images/tasks')) return jsonResponse({ task_id: 'task_1', status: 'queued' }, 200);
      if (url.endsWith('/images/tasks/task_1/content')) {
        return jsonResponse({ data: [{ url: 'https://cdn.example.test/x.png' }] });
      }
      if (url.endsWith('/images/tasks/task_1')) {
        const seq = calls.filter((c) => c.endsWith('/images/tasks/task_1')).length;
        return jsonResponse({ task_id: 'task_1', status: seq < 2 ? 'processing' : 'succeeded', billing: { usd: 0.0068 } });
      }
      if (url === 'https://cdn.example.test/x.png') {
        return new Response(PNG_1X1, { status: 200, headers: { 'content-type': 'image/png' } });
      }
      throw new Error(`unexpected url ${url}`);
    });

    const provider = new TaskRelayProvider(makeConfig(), { fetchImpl: fetchImpl as unknown as typeof fetch, sleep: async () => {} });
    const image = await provider.generate({ prompt: 'a cat', aspectRatio: '3:4' }, makeConfig().outputRoot);

    expect(image.localPath).toMatch(/\.png$/);
    expect(image.width).toBe(1);
    expect(image.height).toBe(1);
    expect(image.provider).toBe('task-relay');
    expect(image.billing).toEqual({ usd: 0.0068 });
    expect(calls[0]).toBe('POST https://relay.example.test/v1/images/tasks');
    expect(calls.some((c) => c.endsWith('/images/tasks/task_1/content'))).toBe(true);
  });

  it('throws task_failed on failed status (no mock fallback)', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/images/tasks')) return jsonResponse({ task_id: 'task_x', status: 'queued' });
      return jsonResponse({ task_id: 'task_x', status: 'failed', error: 'upstream boom' });
    });
    const provider = new TaskRelayProvider(makeConfig(), { fetchImpl: fetchImpl as unknown as typeof fetch, sleep: async () => {} });
    await expect(provider.generate({ prompt: 'x' }, makeConfig().outputRoot)).rejects.toMatchObject({
      code: 'task_failed',
    });
  });

  it('throws poll_timeout when the task never completes', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).endsWith('/images/tasks')) return jsonResponse({ task_id: 't', status: 'queued' });
      return jsonResponse({ task_id: 't', status: 'processing' });
    });
    let t = 0;
    const provider = new TaskRelayProvider(makeConfig({ image: { pollTimeoutMs: 1500 } }), {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep: async () => {},
      now: () => (t += 1000),
    });
    await expect(provider.generate({ prompt: 'x' }, makeConfig().outputRoot)).rejects.toMatchObject({
      code: 'poll_timeout',
    });
  });

  it('throws content_empty when no url is returned', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).endsWith('/images/tasks')) return jsonResponse({ task_id: 't', status: 'queued' });
      if (String(url).endsWith('/content')) return jsonResponse({ data: [] });
      return jsonResponse({ task_id: 't', status: 'succeeded' });
    });
    const provider = new TaskRelayProvider(makeConfig(), { fetchImpl: fetchImpl as unknown as typeof fetch, sleep: async () => {} });
    await expect(provider.generate({ prompt: 'x' }, makeConfig().outputRoot)).rejects.toBeInstanceOf(ProviderError);
  });

  it('refuses to run when IMAGE_API_KEY is missing', async () => {
    const provider = new TaskRelayProvider(makeConfig({ image: { configured: false, apiKey: '' } }), {
      fetchImpl: (async () => jsonResponse({})) as unknown as typeof fetch,
      sleep: async () => {},
    });
    await expect(provider.generate({ prompt: 'x' }, makeConfig().outputRoot)).rejects.toThrow(/not configured/i);
  });
});
