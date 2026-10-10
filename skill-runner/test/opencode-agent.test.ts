import { describe, expect, it, vi } from 'vitest';
import { OpencodeAgentRuntime } from '../src/agent/opencode.js';
import { CommandError, type CommandRunner } from '../src/command/runner.js';
import type { AgentConfig } from '../src/config.js';

const agentConfig: AgentConfig = {
  runtime: 'opencode',
  bin: 'opencode',
  model: 'opencode-go/deepseek-v4.1-flash',
  timeoutMs: 600000,
  skillsDir: '/vendor/skills',
};

describe('OpencodeAgentRuntime', () => {
  it('builds `opencode run --model --auto --dir` and passes env/workdir', async () => {
    const run = vi.fn(async () => ({ code: 0, stdout: 'ok', stderr: '' }));
    const runtime = new OpencodeAgentRuntime(agentConfig, { run } as unknown as CommandRunner);
    const result = await runtime.run({
      skill: 'baoyu-cover-image',
      prompt: 'make a cover',
      workDir: '/tmp/work',
      env: { OPENAI_BASE_URL: 'http://127.0.0.1:5090/shim/v1' },
      timeoutMs: 1234,
    });
    expect(result.code).toBe(0);
    const [bin, args, options] = run.mock.calls[0]! as unknown as [string, string[], { cwd: string; env: NodeJS.ProcessEnv }];
    expect(bin).toBe('opencode');
    expect(args.slice(0, 6)).toEqual(['run', '--model', 'opencode-go/deepseek-v4.1-flash', '--auto', '--dir', '/tmp/work']);
    expect(args[6]).toBe('make a cover');
    expect(options.cwd).toBe('/tmp/work');
    expect(options.env.OPENAI_BASE_URL).toBe('http://127.0.0.1:5090/shim/v1');
  });

  it('returns the exit code instead of throwing on non-zero', async () => {
    const runner = {
      run: vi.fn(async () => {
        throw new CommandError('failed', { code: 7, stdout: 'out', stderr: 'err' });
      }),
    } as unknown as CommandRunner;
    const runtime = new OpencodeAgentRuntime(agentConfig, runner);
    const result = await runtime.run({
      skill: 'baoyu-xhs-images',
      prompt: 'p',
      workDir: '/tmp/w',
      env: {},
      timeoutMs: 1000,
    });
    expect(result).toMatchObject({ code: 7, stdout: 'out', stderr: 'err' });
  });
});
