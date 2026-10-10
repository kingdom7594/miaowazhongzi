import type { SkillRunnerConfig } from '../config.js';
import type { CommandRunner } from '../command/runner.js';
import type { ImageProvider } from '../providers/types.js';

export const SKILL_NAMES = [
  'baoyu-xhs-images',
  'baoyu-cover-image',
  'baoyu-infographic',
  'baoyu-slide-deck',
  'baoyu-diagram',
  'baoyu-image-gen',
  'mondo',
] as const;

export type SkillName = (typeof SKILL_NAMES)[number];

export interface RenderedFile {
  path: string;
  width: number;
  height: number;
}

export interface RenderResult {
  files: RenderedFile[];
  meta: Record<string, unknown>;
}

export interface SkillDeps {
  config: SkillRunnerConfig;
  provider: ImageProvider;
  runner: CommandRunner;
}

export interface RenderContext {
  skill: SkillName;
  inputs: Record<string, unknown>;
  aspect?: string;
  outputDir: string;
  deps: SkillDeps;
}

export interface SkillHandler {
  readonly name: SkillName;
  /** 该 skill 当前接受的 inputs 形态说明（用于错误提示与 README）。 */
  readonly inputsDoc: string;
  render(ctx: RenderContext): Promise<RenderResult>;
}
