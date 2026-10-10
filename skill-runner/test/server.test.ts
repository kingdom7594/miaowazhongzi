import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { buildServer } from '../src/server.js';
import type { AgentRuntime } from '../src/agent/types.js';
import type { CommandRunner } from '../src/command/runner.js';
import type { ImageProvider, GeneratedImage } from '../src/providers/types.js';
import { makeConfig, PNG_1X1 } from './helpers.js';

function fakeProvider(): ImageProvider {
  return {
    name: 'fake',
    async generate(input, outputDir): Promise<GeneratedImage> {
      await mkdir(outputDir, { recursive: true });
      const localPath = join(outputDir, `${input.filenameHint ?? 'img'}.png`);
      await writeFile(localPath, PNG_1X1);
      return { localPath, width: 1, height: 1, provider: 'fake', model: input.model ?? 'gpt-image-2' };
    },
  };
}

/** 假 agent 运行时：把一张 PNG 写进 workDir（模拟 skill 端到端产出）。 */
function fakeAgent(overrides: Partial<AgentRuntime> = {}): AgentRuntime {
  return {
    name: 'fake-agent',
    async run(input) {
      const dir = join(input.workDir, `${input.skill}`, 'slug');
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, '01-cover.png'), PNG_1X1);
      return { code: 0, stdout: 'ok', stderr: '', command: 'fake-agent' };
    },
    ...overrides,
  };
}

const fakeRunner: CommandRunner = {
  async run() {
    return { code: 0, stdout: '====\nMondo prompt\n====\n', stderr: '' };
  },
};

function server() {
  const config = makeConfig();
  return { config, app: buildServer(config, { provider: fakeProvider(), runner: fakeRunner, agent: fakeAgent() }) };
}

describe('skill-runner HTTP', () => {
  it('GET /health lists skills and config readiness', async () => {
    const { app } = server();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.skills).toContain('baoyu-xhs-images');
    expect(body.skills).toContain('mondo');
    expect(body.image.configured).toBe(true);
    expect(body.agent.runtime).toBe('opencode');
  });

  it('POST /render baoyu-image-gen renders one image per prompt', async () => {
    const { app } = server();
    const res = await app.inject({
      method: 'POST',
      url: '/render',
      payload: { skill: 'baoyu-image-gen', inputs: { prompts: ['a', 'b'] }, aspect: '3:4' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.files).toHaveLength(2);
    expect(body.files[0].path).toMatch(/\.png$/);
  });

  it('POST /render baoyu-diagram writes the svg', async () => {
    const { app } = server();
    const svg = '<svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg"></svg>';
    const res = await app.inject({ method: 'POST', url: '/render', payload: { skill: 'baoyu-diagram', inputs: { svg } } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.files[0].path).toMatch(/\.svg$/);
    expect(body.files[0].width).toBe(100);
    expect(body.files[0].height).toBe(50);
  });

  it('POST /render rejects prompts over MAX_IMAGES_PER_RENDER', async () => {
    const config = makeConfig({ maxImagesPerRender: 1 });
    const app = buildServer(config, { provider: fakeProvider(), runner: fakeRunner, agent: fakeAgent() });
    const res = await app.inject({
      method: 'POST',
      url: '/render',
      payload: { skill: 'baoyu-image-gen', inputs: { prompts: ['a', 'b'] } },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /render composite skill drives the agent runtime (ADR-0006 方案 A)', async () => {
    const run = vi.fn(fakeAgent().run);
    const config = makeConfig();
    const app = buildServer(config, {
      provider: fakeProvider(),
      runner: fakeRunner,
      agent: { name: 'fake-agent', run } as unknown as AgentRuntime,
    });
    const res = await app.inject({
      method: 'POST',
      url: '/render',
      payload: { skill: 'baoyu-cover-image', inputs: { content: 'AI 效率工具合集' }, aspect: '3:4' },
    });
    expect(res.statusCode).toBe(200);
    expect(run).toHaveBeenCalledOnce();
    const arg = run.mock.calls[0]![0];
    expect(arg.skill).toBe('baoyu-cover-image');
    expect(arg.prompt).toMatch(/baoyu-cover-image/);
    expect(arg.env.OPENAI_BASE_URL).toBe(config.shimBaseUrl);
    const body = res.json();
    expect(body.files).toHaveLength(1);
    expect(body.meta.runtime).toBe('fake-agent');
  });

  it('POST /render composite skill 502s when the agent fails', async () => {
    const app = buildServer(makeConfig(), {
      provider: fakeProvider(),
      runner: fakeRunner,
      agent: fakeAgent({ run: async () => ({ code: 1, stdout: '', stderr: 'boom', command: 'x' }) }),
    });
    const res = await app.inject({
      method: 'POST',
      url: '/render',
      payload: { skill: 'baoyu-xhs-images', inputs: { content: 'x' } },
    });
    expect(res.statusCode).toBe(502);
    expect(res.json().code).toBe('agent_failed');
  });

  it('POST /render rejects output_dir outside OUTPUT_ROOT', async () => {
    const { app } = server();
    const res = await app.inject({
      method: 'POST',
      url: '/render',
      payload: { skill: 'baoyu-diagram', inputs: { svg: '<svg/>' }, output_dir: '/etc' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/escapes OUTPUT_ROOT/);
  });

  it('POST /render 400s on unknown skill', async () => {
    const { app } = server();
    const res = await app.inject({ method: 'POST', url: '/render', payload: { skill: 'nope', inputs: {} } });
    expect(res.statusCode).toBe(400);
  });

  it('mondo assembles prompt via python then renders', async () => {
    const runner = vi.fn(fakeRunner.run);
    const config = makeConfig();
    const app = buildServer(config, { provider: fakeProvider(), runner: { run: runner } as unknown as CommandRunner });
    const res = await app.inject({
      method: 'POST',
      url: '/render',
      payload: { skill: 'mondo', inputs: { subject: '1984', kind: 'book' } },
    });
    expect(res.statusCode).toBe(200);
    expect(runner).toHaveBeenCalledOnce();
    expect(res.json().files).toHaveLength(1);
  });

  it('POST /render 502s when IMAGE_API_KEY is missing (no mock fallback)', async () => {
    const config = makeConfig({ image: { configured: false, apiKey: '' } });
    const app = buildServer(config, { runner: fakeRunner });
    const res = await app.inject({
      method: 'POST',
      url: '/render',
      payload: { skill: 'baoyu-image-gen', inputs: { prompt: 'x' } },
    });
    expect(res.statusCode).toBe(502);
    expect(res.json().code).toBe('not_configured');
  });

  it('GET /shim/v1/images/generations returns OpenAI-shaped b64_json', async () => {
    const { app } = server();
    const res = await app.inject({
      method: 'POST',
      url: '/shim/v1/images/generations',
      payload: { prompt: 'a cat', size: '1024x1024' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].b64_json).toBe(PNG_1X1.toString('base64'));
  });
});
