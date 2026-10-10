import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SkillRunnerConfig } from '../src/config.js';

type ConfigOverrides = Partial<Omit<SkillRunnerConfig, 'image' | 'agent'>> & {
  image?: Partial<SkillRunnerConfig['image']>;
  agent?: Partial<SkillRunnerConfig['agent']>;
};

export function makeConfig(overrides: ConfigOverrides = {}): SkillRunnerConfig {
  const outputRoot = overrides.outputRoot ?? mkdtempSync(join(tmpdir(), 'skill-runner-'));
  // 预置一个假的 vendored skills 目录，供 ensureAgentProject 软链。
  mkdirSync(join(outputRoot, 'vendor-skills', 'baoyu-cover-image'), { recursive: true });
  const { image: imageOverride, agent: agentOverride, ...rest } = overrides;
  return {
    host: '127.0.0.1',
    port: 5090,
    outputRoot,
    retentionDays: 30,
    maxImagesPerRender: 10,
    concurrency: 2,
    bunBin: 'bun',
    pythonBin: 'python3',
    shimBaseUrl: 'http://127.0.0.1:5090/shim/v1',
    ...rest,
    agent: {
      runtime: 'opencode',
      bin: 'opencode',
      model: 'opencode-go/deepseek-v4.1-flash',
      timeoutMs: 600000,
      skillsDir: join(outputRoot, 'vendor-skills'),
      ...(agentOverride ?? {}),
    },
    image: {
      baseUrl: 'https://relay.example.test/v1',
      apiKey: 'test-key',
      model: 'gpt-image-2',
      apiStyle: 'task',
      pollIntervalMs: 0,
      pollTimeoutMs: 5000,
      configured: true,
      ...(imageOverride ?? {}),
    },
  };
}

/** 最小合法 PNG（1x1）字节，供下载/探测测试。 */
export const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
