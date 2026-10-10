import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchContentList, fetchContentBrief } from './client';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('radar client error path (explicit failure, no fallback)', () => {
  it('throws when the network request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(fetchContentList()).rejects.toThrow(/Radar request failed/);
  });

  it('throws when the radar returns a non-2xx status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('boom', { status: 500, statusText: 'Internal Server Error' }),
    );
    await expect(fetchContentBrief('2026-10-10')).rejects.toThrow(/Radar returned 500/);
  });

  it('rejects an invalid date without calling fetch', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    await expect(fetchContentBrief('2026/10/10')).rejects.toThrow(/Invalid brief date/);
    expect(spy).not.toHaveBeenCalled();
  });
});
