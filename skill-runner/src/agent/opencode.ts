import { CommandError, type CommandRunner } from '../command/runner.js';
import type { AgentConfig } from '../config.js';
import type { AgentRunInput, AgentRunResult, AgentRuntime } from './types.js';

/**
 * opencode 无头运行时：`opencode run --model <m> --auto --dir <workdir> "<prompt>"`。
 * 加载 workDir 下 `.opencode/skills/` 中的 vendored skill 并执行其工作流。
 */
export class OpencodeAgentRuntime implements AgentRuntime {
  readonly name = 'opencode';

  constructor(
    private readonly config: AgentConfig,
    private readonly runner: CommandRunner,
  ) {}

  async run(input: AgentRunInput): Promise<AgentRunResult> {
    const args = [
      'run',
      '--model',
      this.config.model,
      '--auto',
      '--dir',
      input.workDir,
      input.prompt,
    ];
    const command = `${this.config.bin} ${args.slice(0, -1).join(' ')} "<prompt>"`;
    try {
      const result = await this.runner.run(this.config.bin, args, {
        cwd: input.workDir,
        env: input.env,
        timeoutMs: input.timeoutMs,
      });
      return { code: result.code, stdout: result.stdout, stderr: result.stderr, command };
    } catch (err) {
      if (err instanceof CommandError) {
        return { code: err.result.code, stdout: err.result.stdout, stderr: err.result.stderr, command };
      }
      throw err;
    }
  }
}
