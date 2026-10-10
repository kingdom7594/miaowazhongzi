import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { resolveRenderPath } from '@/lib/image/render-draft';

export const runtime = 'nodejs';

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

/**
 * 预览 L3 出图产物。仅允许读取 RENDER_OUTPUT_ROOT(skill-runner OUTPUT_ROOT)内的文件,
 * 越界 / 不存在一律 404。
 */
export async function GET(_request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const filePath = resolveRenderPath(path ?? []);
  if (!filePath) return new Response('not found', { status: 404 });
  try {
    const bytes = await readFile(filePath);
    const type = CONTENT_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
    return new Response(new Uint8Array(bytes), {
      headers: { 'content-type': type, 'cache-control': 'no-store' },
    });
  } catch {
    return new Response('not found', { status: 404 });
  }
}
