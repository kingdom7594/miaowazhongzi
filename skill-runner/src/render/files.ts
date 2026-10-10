import { mkdir, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { detectExtension, probeImageSize } from './image-size.js';
import { randomUUID } from 'node:crypto';

export class PathSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathSafetyError';
  }
}

/** 把外部传入的 output_dir 解析到 OUTPUT_ROOT 之内；越界显式报错。 */
export function resolveOutputDir(requested: string | undefined, outputRoot: string): string {
  if (!requested || requested.trim() === '') {
    return resolve(join(outputRoot, dateSlug(), 'default'));
  }
  if (!isAbsolute(requested)) {
    throw new PathSafetyError(`output_dir must be absolute: ${requested}`);
  }
  const root = resolve(outputRoot);
  const target = resolve(requested);
  const rel = relative(root, target);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new PathSafetyError(`output_dir escapes OUTPUT_ROOT (${root}): ${target}`);
  }
  return target;
}

export function dateSlug(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function makeImageFilename(hint: string | undefined, extension: string): string {
  const safeHint = (hint ?? '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const base = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  return `${safeHint ? `${safeHint}-` : ''}${base}.${extension}`;
}

export interface SavedImage {
  path: string;
  width: number;
  height: number;
}

export async function saveImageBuffer(
  bytes: Buffer,
  outputDir: string,
  filenameHint?: string,
  contentType?: string | null,
): Promise<SavedImage> {
  await mkdir(outputDir, { recursive: true });
  const extension = detectExtension(bytes, contentType);
  const filename = makeImageFilename(filenameHint, extension);
  const path = join(outputDir, filename);
  await writeFile(path, bytes);
  const size = probeImageSize(bytes);
  return { path, width: size.width, height: size.height };
}
