import type { SkillRunnerConfig } from '../config.js';
import { TaskRelayProvider, type TaskRelayDeps } from './task-relay.js';
import type { ImageProvider } from './types.js';

export type { GeneratedImage, GenerateImageInput, ImageProvider } from './types.js';
export { ProviderError } from './errors.js';

export function createProvider(config: SkillRunnerConfig, deps: TaskRelayDeps = {}): ImageProvider {
  return new TaskRelayProvider(config, deps);
}
