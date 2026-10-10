import type { SkillRunnerConfig } from '../config.js';
import { GuardedProvider } from './guarded.js';
import { TaskRelayProvider, type TaskRelayDeps } from './task-relay.js';
import type { ImageProvider } from './types.js';

export type { GeneratedImage, GenerateImageInput, ImageProvider } from './types.js';
export { ProviderError } from './errors.js';
export { GuardedProvider } from './guarded.js';

/** 基础 provider（task-relay，无成本闸）。 */
export function createProvider(config: SkillRunnerConfig, deps: TaskRelayDeps = {}): ImageProvider {
  return new TaskRelayProvider(config, deps);
}

/** 加上成本闸（全局并发 + 单次 render 张数上限）的 provider。 */
export function createGuardedProvider(config: SkillRunnerConfig, deps: TaskRelayDeps = {}): ImageProvider {
  return new GuardedProvider(createProvider(config, deps), config.maxImagesPerRender, config.concurrency);
}
