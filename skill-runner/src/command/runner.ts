import { spawn } from 'node:child_process';

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface CommandRunner {
  run(command: string, args: string[], options?: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number }): Promise<CommandResult>;
}

export class CommandError extends Error {
  constructor(
    message: string,
    readonly result: CommandResult,
  ) {
    super(message);
    this.name = 'CommandError';
  }
}

export function createCommandRunner(): CommandRunner {
  return {
    run(command, args, options = {}) {
      return new Promise<CommandResult>((resolve, reject) => {
        const child = spawn(command, args, {
          cwd: options.cwd,
          env: { ...process.env, ...options.env },
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: options.timeoutMs,
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => {
          stdout += chunk.toString();
        });
        child.stderr.on('data', (chunk) => {
          stderr += chunk.toString();
        });
        child.on('error', (err) => reject(err));
        child.on('close', (code) => {
          const result: CommandResult = { code: code ?? -1, stdout, stderr };
          if (result.code !== 0) reject(new CommandError(`Command failed (${command}): exit ${result.code}`, result));
          else resolve(result);
        });
      });
    },
  };
}
