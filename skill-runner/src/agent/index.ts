import type { CommandRunner } from '../command/runner.js';
import type { SkillRunnerConfig } from '../config.js';
import { OpencodeAgentRuntime } from './opencode.js';
import type { AgentRuntime } from './types.js';

export type { AgentRunInput, AgentRunResult, AgentRuntime } from './types.js';
export { OpencodeAgentRuntime } from './opencode.js';

/** 按配置选择 agent 运行时实现（默认 opencode）。可替换适配器，避免二次锁定（ADR-0006）。 */
export function createAgentRuntime(config: SkillRunnerConfig, runner: CommandRunner): AgentRuntime {
  switch (config.agent.runtime) {
    case 'opencode':
      return new OpencodeAgentRuntime(config.agent, runner);
    default:
      throw new Error(`Unsupported AGENT_RUNTIME "${config.agent.runtime}" (only "opencode" is implemented)`);
  }
}
