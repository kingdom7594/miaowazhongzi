import { access, mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import type { SkillRunnerConfig } from '../config.js';
import { probeImageSize } from '../render/image-size.js';
import { InputError, readString } from './prompts.js';
import type { RenderContext, RenderResult, RenderedFile, SkillHandler, SkillName } from './types.js';

export class AgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentError';
  }
}

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
const SKIP_DIRS = new Set(['node_modules', '.opencode', '.baoyu-skills', '.git']);

/** 每个 render 产出一个独立的 agent 工作目录：内置 `.opencode/skills`(软链 vendored)+ `.baoyu-skills` 偏好。 */
export async function ensureAgentProject(outputDir: string, skill: string, config: SkillRunnerConfig): Promise<void> {
  const skillsLinkDir = join(outputDir, '.opencode', 'skills');
  await mkdir(skillsLinkDir, { recursive: true });
  let entries: string[] = [];
  try {
    entries = await readdir(config.agent.skillsDir);
  } catch {
    throw new AgentError(`AGENT_SKILLS_DIR not found: ${config.agent.skillsDir}`);
  }
  for (const name of entries) {
    const target = join(config.agent.skillsDir, name);
    const link = join(skillsLinkDir, name);
    if (await exists(link)) continue;
    await symlink(target, link, 'dir').catch(() => undefined);
  }
  await writeExtendMd(outputDir, skill);
  await writeExtendMd(outputDir, 'baoyu-image-gen');
}

async function writeExtendMd(outputDir: string, skill: string): Promise<void> {
  const dir = join(outputDir, '.baoyu-skills', skill);
  await mkdir(dir, { recursive: true });
  const extend =
    skill === 'baoyu-image-gen'
      ? [
          '---',
          'version: 3',
          'default_provider: openai',
          'default_model:',
          '  openai: gpt-image-2',
          'default_quality: normal',
          'default_image_api_dialect: openai-native',
          '---',
          '',
        ].join('\n')
      : ['---', 'version: 3', 'quick_mode: true', 'language: zh', 'preferred_image_backend: baoyu-image-gen', '---', ''].join('\n');
  await writeFile(join(dir, 'EXTEND.md'), extend, 'utf-8');
}

/** 运行时环境：出图后端指向本服务的 OpenAI 兼容 shim，再由 shim → relay。 */
export function buildAgentEnv(config: SkillRunnerConfig): NodeJS.ProcessEnv {
  return {
    OPENAI_BASE_URL: config.shimBaseUrl,
    OPENAI_API_KEY: 'skill-runner-shim',
    OPENAI_IMAGE_MODEL: config.image.model,
  };
}

export function buildSkillPrompt(skill: string, content: string, aspect: string | undefined): string {
  const aspectLine = aspect ? `- 宽高比：${aspect}。` : '';
  return [
    `使用 ${skill} 技能为下面的内容生成图片。`,
    '要求：',
    '- 直接生成，跳过所有确认与追问（quick mode），使用默认偏好。',
    '- 出图后端使用 baoyu-image-gen。',
    '- 语言：简体中文。',
    aspectLine,
    '- 实现细节不需要逐条确认，请一次性完成到出图。',
    '内容：',
    '"""',
    content,
    '"""',
    '完成后报告生成的文件路径。',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function collectImages(root: string, depth = 0): Promise<RenderedFile[]> {
  if (depth > 6) return [];
  const out: RenderedFile[] = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectImages(full, depth + 1)));
      continue;
    }
    const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) continue;
    try {
      const bytes = await readFile(full);
      const size = probeImageSize(bytes);
      out.push({ path: full, width: size.width, height: size.height });
    } catch {
      continue;
    }
  }
  return out;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * 组装式 skill（xhs-images / cover-image / infographic / slide-deck）：
 * 由 agent 运行时无头加载 vendored SKILL.md 执行「分析 → 组装 prompt → 出图」全流程，
 * 出图后端经 shim → relay（ADR-0006 方案 A）。
 */
export function createAgentSkillHandler(skill: SkillName): SkillHandler {
  return {
    name: skill,
    inputsDoc: 'inputs.content (string, 必需) + 可选等；由 agent 运行时加载该 skill 端到端执行',
    async render(ctx: RenderContext): Promise<RenderResult> {
      const content = readString(ctx.inputs, 'content') ?? readString(ctx.inputs, 'prompt');
      if (!content || !content.trim()) {
        throw new InputError(`inputs.content (string) is required for ${skill}`);
      }
      const { agent, config } = ctx.deps;
      await ensureAgentProject(ctx.outputDir, skill, config);
      const prompt = buildSkillPrompt(skill, content.trim(), ctx.aspect);
      const startedAt = Date.now();
      const result = await agent.run({
        skill,
        prompt,
        workDir: ctx.outputDir,
        env: buildAgentEnv(config),
        timeoutMs: config.agent.timeoutMs,
      });
      const durationMs = Date.now() - startedAt;
      if (result.code !== 0) {
        throw new AgentError(
          `agent runtime "${agent.name}" exited ${result.code} for ${skill}: ${result.stderr.slice(-800)}`,
        );
      }
      const files = await collectImages(ctx.outputDir);
      if (files.length === 0) {
        throw new AgentError(`agent runtime "${agent.name}" produced no image files for ${skill}`);
      }
      return {
        files,
        meta: {
          skill,
          runtime: agent.name,
          model: config.agent.model,
          durationMs,
          command: result.command,
        },
      };
    },
  };
}
