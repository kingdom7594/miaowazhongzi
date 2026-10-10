import { isAbsolute, relative, resolve, sep } from 'node:path';
import { renderImage } from './client';
import { withBasePath } from '@/lib/base-path';
import type { Draft, DraftImage } from '@/lib/types';

/** 应用层可选用的出图技能(draft 出图):封面单图 / 小红书卡片图组。 */
export const DRAFT_RENDER_SKILLS = ['baoyu-cover-image', 'baoyu-xhs-images'] as const;
export type DraftRenderSkill = (typeof DRAFT_RENDER_SKILLS)[number];

export function isDraftRenderSkill(value: unknown): value is DraftRenderSkill {
  return typeof value === 'string' && (DRAFT_RENDER_SKILLS as readonly string[]).includes(value);
}

/**
 * 出图产物根目录:必须与 skill-runner 的 `OUTPUT_ROOT` 指向同一路径(同机部署)。
 * 缺省 `<cwd>/skill-runner/data/renders` —— 开发态 cwd=仓根、部署态 cwd=/opt/miaowazhongzi 均成立。
 */
export function getRenderOutputRoot(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.RENDER_OUTPUT_ROOT?.trim();
  if (configured) return resolve(configured);
  return resolve(process.cwd(), 'skill-runner/data/renders');
}

/** 单次 render 超时:封面 ~150s、xhs 6 卡 ~350s,默认放宽到 600s(对齐 skill-runner AGENT_TIMEOUT_MS)。 */
export function getRenderTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.RENDER_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 600_000;
}

/** 把 draft 组装成 agent 技能(xhs-images / cover-image)所需的 `inputs.content`。 */
export function imageContentFromDraft(
  draft: Pick<Draft, 'titles' | 'body' | 'tags' | 'coverPrompt'>,
): string {
  const parts: string[] = [];
  const titles = (draft.titles ?? []).filter((t) => typeof t === 'string' && t.trim());
  if (titles.length > 0) {
    parts.push(`标题备选：\n${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}`);
  }
  if (draft.body && draft.body.trim()) parts.push(`正文：\n${draft.body.trim()}`);
  const tags = (draft.tags ?? []).filter((t) => typeof t === 'string' && t.trim());
  if (tags.length > 0) parts.push(`话题标签：${tags.join(' ')}`);
  if (draft.coverPrompt && draft.coverPrompt.trim()) parts.push(`封面提示词：${draft.coverPrompt.trim()}`);
  const content = parts.join('\n\n').trim();
  if (!content) throw new Error('draft 无可出图内容(标题/正文为空)');
  return content;
}

export interface RenderDraftOptions {
  draft: Pick<Draft, 'titles' | 'body' | 'tags' | 'coverPrompt'>;
  skill: DraftRenderSkill;
  aspect?: string;
  /** 期望张数(xhs 卡片;作为 inputs 提示,最终受 skill-runner MAX_IMAGES_PER_RENDER 约束)。 */
  count?: number;
  timeoutMs?: number;
}

export interface RenderDraftFiles {
  skill: DraftRenderSkill;
  files: Array<{ path: string; width: number; height: number }>;
  meta: Record<string, unknown>;
}

/** 调 L3 skill-runner `/render`(复用 `src/lib/image/client.ts`)。失败显式抛错,不 mock。 */
export async function renderDraftFiles(options: RenderDraftOptions): Promise<RenderDraftFiles> {
  const { draft, skill } = options;
  const inputs: Record<string, unknown> = { content: imageContentFromDraft(draft) };
  if (options.count !== undefined) inputs.count = options.count;
  const response = await renderImage(
    { skill, inputs, ...(options.aspect ? { aspect: options.aspect } : {}) },
    options.timeoutMs ?? getRenderTimeoutMs(),
  );
  return { skill, files: response.files, meta: response.meta };
}

/** skill-runner 返回的文件 → draft.images 契约形状。 */
export function toDraftImages(
  skill: string,
  files: Array<{ path: string }>,
  aspect?: string,
): DraftImage[] {
  return files.map((f) => ({ skill, path: f.path, ...(aspect ? { aspect } : {}) }));
}

/** 同技能替换、异技能保留:重出封面不丢已出的卡片,反之亦然。 */
export function mergeImagesBySkill(
  existing: DraftImage[] | undefined,
  skill: string,
  next: DraftImage[],
): DraftImage[] {
  const kept = (existing ?? []).filter((img) => img.skill !== skill);
  return [...kept, ...next];
}

/** draft.images + 可预览 url(app 内 `/api/renders/*`,由 skill-runner 绝对路径映射而来)。 */
export interface DraftImageView extends DraftImage {
  url: string | null;
}

/** 把 skill-runner 绝对路径映射为 app 预览 url;越出 RENDER_OUTPUT_ROOT 时返回 null(不可预览)。 */
export function toRenderUrl(filePath: string, root: string = getRenderOutputRoot()): string | null {
  const rel = relative(resolve(root), resolve(filePath));
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return null;
  return withBasePath(`/api/renders/${rel.split(sep).map(encodeURIComponent).join('/')}`);
}

export function withImageUrls(
  images: DraftImage[] | undefined,
  root: string = getRenderOutputRoot(),
): DraftImageView[] {
  return (images ?? []).map((img) => ({
    ...img,
    url: img.path ? toRenderUrl(img.path, root) : null,
  }));
}

/**
 * 解析 `GET /api/renders/[...path]` 的路径段到绝对路径,限制在 `root` 内;
 * 越界(含 `..`/绝对段)返回 null。
 */
export function resolveRenderPath(
  segments: string[],
  root: string = getRenderOutputRoot(),
): string | null {
  if (!segments || segments.length === 0) return null;
  const rootResolved = resolve(root);
  const target = resolve(rootResolved, ...segments);
  const rel = relative(rootResolved, target);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return null;
  return target;
}
