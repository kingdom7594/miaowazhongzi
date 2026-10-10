import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getJudgeConfig, DEFAULT_JUDGE_MODEL } from './client';

const KEYS = ['LLM_API_KEY', 'LLM_MODEL', 'LLM_BASE_URL', 'JUDGE_API_KEY', 'JUDGE_MODEL', 'JUDGE_BASE_URL'] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('getJudgeConfig', () => {
  it('defaults to an independent judge model and reuses LLM key/base', () => {
    process.env.LLM_API_KEY = 'k';
    process.env.LLM_BASE_URL = 'https://gen.example/v1';
    const cfg = getJudgeConfig();
    expect(cfg.model).toBe(DEFAULT_JUDGE_MODEL);
    expect(cfg.apiKey).toBe('k');
    expect(cfg.baseUrl).toBe('https://gen.example/v1');
  });

  it('prefers JUDGE_* over LLM_*', () => {
    process.env.LLM_API_KEY = 'gen';
    process.env.JUDGE_API_KEY = 'judge';
    process.env.JUDGE_MODEL = 'other-model';
    const cfg = getJudgeConfig();
    expect(cfg.apiKey).toBe('judge');
    expect(cfg.model).toBe('other-model');
  });

  it('throws when the judge model equals the generator model (no self-eval)', () => {
    process.env.LLM_API_KEY = 'k';
    process.env.LLM_MODEL = 'same';
    process.env.JUDGE_MODEL = 'same';
    expect(() => getJudgeConfig()).toThrow(/differ from the generator/);
  });

  it('throws when no key is available', () => {
    expect(() => getJudgeConfig()).toThrow(/No judge API key/);
  });
});
