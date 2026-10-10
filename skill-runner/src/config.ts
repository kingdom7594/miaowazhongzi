import { resolve } from 'node:path';
import { ProviderError } from './providers/errors.js';

export interface ImageConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  apiStyle: 'task';
  pollIntervalMs: number;
  pollTimeoutMs: number;
  /** 是否已注入 key。缺失时服务可启动（/health 可见），但 render 显式报错。 */
  configured: boolean;
}

export interface SkillRunnerConfig {
  host: string;
  port: number;
  image: ImageConfig;
  outputRoot: string;
  retentionDays: number;
  maxImagesPerRender: number;
  concurrency: number;
  bunBin: string;
  pythonBin: string;
  shimBaseUrl: string;
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Env ${name} must be a positive number, got "${raw}"`);
  }
  return Math.floor(value);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): SkillRunnerConfig {
  const apiKey = (env.IMAGE_API_KEY ?? '').trim();
  const baseUrl = (env.IMAGE_BASE_URL ?? '').trim();
  if (!baseUrl) {
    throw new Error('Env IMAGE_BASE_URL is required (e.g. https://www.aisplice.store/v1)');
  }
  const apiStyle = (env.IMAGE_API_STYLE ?? 'task').trim();
  if (apiStyle !== 'task') {
    throw new Error(`Unsupported IMAGE_API_STYLE "${apiStyle}" (only "task" is implemented)`);
  }
  return {
    host: (env.HOST ?? '127.0.0.1').trim(),
    port: intEnv('PORT', 5090),
    image: {
      baseUrl: baseUrl.replace(/\/+$/, ''),
      apiKey,
      model: (env.IMAGE_MODEL ?? 'gpt-image-2').trim(),
      apiStyle: 'task',
      pollIntervalMs: intEnv('IMAGE_POLL_INTERVAL_MS', 2000),
      pollTimeoutMs: intEnv('IMAGE_POLL_TIMEOUT_MS', 300000),
      configured: apiKey.length > 0,
    },
    outputRoot: resolve(env.OUTPUT_ROOT ?? './data/renders'),
    retentionDays: intEnv('RENDER_RETENTION_DAYS', 30),
    maxImagesPerRender: intEnv('MAX_IMAGES_PER_RENDER', 10),
    concurrency: intEnv('RENDER_CONCURRENCY', 2),
    bunBin: (env.BUN_BIN ?? 'bun').trim(),
    pythonBin: (env.PYTHON_BIN ?? 'python3').trim(),
    shimBaseUrl: (env.SHIM_BASE_URL ?? 'http://127.0.0.1:5090/shim/v1').trim().replace(/\/+$/, ''),
  };
}

export function requireImageConfig(config: SkillRunnerConfig): ImageConfig {
  if (!config.image.configured) {
    throw new ProviderError(
      'not_configured',
      'Image provider is not configured: IMAGE_API_KEY is missing. Inject it via .env (ops-agent).',
    );
  }
  return config.image;
}
