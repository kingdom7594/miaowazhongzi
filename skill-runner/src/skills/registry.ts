import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { VENDOR_DIR } from '../config.js';
import { probeImageSize } from '../render/image-size.js';
import { makeImageFilename } from '../render/files.js';
import { createAgentSkillHandler } from './agent-skill.js';
import { collectPrompts, InputError, mapWithConcurrency, readString } from './prompts.js';
import type { RenderContext, RenderResult, RenderedFile, SkillHandler, SkillName } from './types.js';

export { VENDOR_DIR };

interface RenderImagesOptions {
  ctx: RenderContext;
  prompts: string[];
  filenamePrefix: string;
}

async function renderPrompts({ ctx, prompts, filenamePrefix }: RenderImagesOptions): Promise<RenderedFile[]> {
  const { provider, config } = ctx.deps;
  if (prompts.length > config.maxImagesPerRender) {
    throw new InputError(
      `requested ${prompts.length} images but MAX_IMAGES_PER_RENDER=${config.maxImagesPerRender}`,
    );
  }
  const renderId = `direct:${randomUUID()}`;
  try {
    const results = await mapWithConcurrency(prompts, config.concurrency, (prompt, index) =>
      provider.generate(
        {
          prompt,
          aspectRatio: ctx.aspect,
          filenameHint: `${filenamePrefix}-${String(index + 1).padStart(2, '0')}`,
          renderId,
        },
        ctx.outputDir,
      ),
    );
    return results.map((image) => ({ path: image.localPath, width: image.width, height: image.height }));
  } finally {
    provider.clearRender?.(renderId);
  }
}

const baoyuImageGen: SkillHandler = {
  name: 'baoyu-image-gen',
  inputsDoc: 'inputs.prompt (string) | inputs.prompts (string[]) — 直接走图像 provider 渲染',
  async render(ctx) {
    const prompts = collectPrompts(ctx.inputs);
    const files = await renderPrompts({ ctx, prompts, filenamePrefix: 'image' });
    return {
      files,
      meta: { skill: 'baoyu-image-gen', provider: ctx.deps.provider.name, model: ctx.deps.config.image.model },
    };
  },
};

const baoyuDiagram: SkillHandler = {
  name: 'baoyu-diagram',
  inputsDoc: 'inputs.svg (string, 必需的 SVG 源码) — 落盘为 .svg（R8：M3 先出 svg）',
  async render(ctx) {
    const svg = readString(ctx.inputs, 'svg');
    if (!svg || !svg.trim()) {
      throw new InputError('inputs.svg (string, SVG source) is required for baoyu-diagram');
    }
    await mkdir(ctx.outputDir, { recursive: true });
    const filename = makeImageFilename(readString(ctx.inputs, 'filenameHint') ?? 'diagram', 'svg');
    const path = join(ctx.outputDir, filename);
    const bytes = Buffer.from(svg, 'utf-8');
    await writeFile(path, bytes);
    const size = probeImageSize(bytes);
    return {
      files: [{ path, width: size.width, height: size.height }],
      meta: { skill: 'baoyu-diagram', format: 'svg' },
    };
  },
};

/** 从 generate_mondo.py --no-generate 的 stdout 中提取 prompt。 */
export function parseMondoPrompt(stdout: string): string {
  const lines = stdout.split('\n');
  const start = lines.findIndex((line) => /^=+$/.test(line.trim()));
  if (start === -1) throw new InputError('mondo prompt builder produced unexpected output');
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^=+$/.test(line.trim()));
  const prompt = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
  if (!prompt) throw new InputError('mondo prompt builder produced empty prompt');
  return prompt;
}

const mondo: SkillHandler = {
  name: 'mondo',
  inputsDoc:
    'inputs.prompt (string) 直接渲染；或 inputs.subject + inputs.kind(movie|book|album|event) + inputs.style —— 复用 vendored generate_mondo.py 组装 prompt 后经同一 provider 渲染',
  async render(ctx) {
    let prompt = readString(ctx.inputs, 'prompt');
    if (!prompt) {
      const subject = readString(ctx.inputs, 'subject');
      if (!subject) {
        throw new InputError('mondo requires inputs.prompt or inputs.subject');
      }
      const kind = readString(ctx.inputs, 'kind') ?? 'book';
      const style = readString(ctx.inputs, 'style') ?? 'auto';
      const script = join(VENDOR_DIR, 'mondo', 'scripts', 'generate_mondo.py');
      const args = [script, subject, kind, '--no-generate', '--style', style];
      const result = await ctx.deps.runner.run(ctx.deps.config.pythonBin, args, { timeoutMs: 60_000 });
      prompt = parseMondoPrompt(result.stdout);
    }
    const files = await renderPrompts({ ctx, prompts: [prompt], filenamePrefix: 'mondo' });
    return {
      files,
      meta: { skill: 'mondo', provider: ctx.deps.provider.name, model: ctx.deps.config.image.model },
    };
  },
};

export const SKILL_HANDLERS: Record<SkillName, SkillHandler> = {
  'baoyu-xhs-images': createAgentSkillHandler('baoyu-xhs-images'),
  'baoyu-cover-image': createAgentSkillHandler('baoyu-cover-image'),
  'baoyu-infographic': createAgentSkillHandler('baoyu-infographic'),
  'baoyu-slide-deck': createAgentSkillHandler('baoyu-slide-deck'),
  'baoyu-image-gen': baoyuImageGen,
  'baoyu-diagram': baoyuDiagram,
  mondo,
};

export function getHandler(skill: string): SkillHandler | null {
  return (SKILL_HANDLERS as Record<string, SkillHandler>)[skill] ?? null;
}
