export interface AgentRunInput {
  /** 要加载的上游 skill 名（如 baoyu-cover-image）。 */
  skill: string;
  /** 交给运行时的指令（含 content、aspect、出图后端要求等）。 */
  prompt: string;
  /** 运行工作目录（skill 发现 + 产物落地都基于此）。 */
  workDir: string;
  /** 追加/覆盖的环境变量。 */
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
}

export interface AgentRunResult {
  code: number;
  stdout: string;
  stderr: string;
  /** 实际执行的命令行（便于排查，不含密钥）。 */
  command: string;
}

/**
 * 「agent 运行时」可替换适配器：默认 opencode（本机已装、可无头加载 SKILL.md）。
 * 备选（后续治理）：OpenClaw 等 —— 只要实现本接口，调用方不感知具体运行时（ADR-0006）。
 */
export interface AgentRuntime {
  readonly name: string;
  run(input: AgentRunInput): Promise<AgentRunResult>;
}
