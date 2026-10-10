import { NextRequest } from 'next/server';
import { getDraft, updateDraftImages } from '@/lib/db/drafts';
import {
  DRAFT_RENDER_SKILLS,
  isDraftRenderSkill,
  mergeImagesBySkill,
  renderDraftFiles,
  toDraftImages,
  withImageUrls,
} from '@/lib/image/render-draft';

export const runtime = 'nodejs';

/**
 * draft 出图:L2 → L3。
 * body: { draftId: number, skill?: 'baoyu-cover-image'|'baoyu-xhs-images', aspect?, count? }
 * 复用 src/lib/image/client.ts 调 skill-runner `/render`,产物落 drafts.images(同技能替换)。
 * 真实中转站出图较慢(封面 ~150s / xhs ~350s),失败显式报错(502),不 mock 兜底。
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      draftId?: number;
      skill?: string;
      aspect?: string;
      count?: number;
    };
    if (typeof body.draftId !== 'number' || !Number.isInteger(body.draftId)) {
      return Response.json({ error: 'draftId (number) is required' }, { status: 400 });
    }
    const skill = body.skill ?? 'baoyu-cover-image';
    if (!isDraftRenderSkill(skill)) {
      return Response.json(
        { error: `unsupported skill: ${skill}; expected one of ${DRAFT_RENDER_SKILLS.join(', ')}` },
        { status: 400 },
      );
    }
    const record = getDraft(body.draftId);
    if (!record) {
      return Response.json({ error: `Draft not found: ${body.draftId}` }, { status: 404 });
    }

    const aspect = typeof body.aspect === 'string' && body.aspect.trim() ? body.aspect.trim() : '3:4';
    const count =
      typeof body.count === 'number' && Number.isFinite(body.count) && body.count > 0
        ? Math.floor(body.count)
        : undefined;

    let rendered;
    try {
      rendered = await renderDraftFiles({ draft: record, skill, aspect, count });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'render failed';
      return Response.json({ error: message }, { status: 502 });
    }

    const images = toDraftImages(skill, rendered.files, aspect);
    const merged = mergeImagesBySkill(record.images, skill, images);
    updateDraftImages(record.id, merged);

    return Response.json({
      draftId: record.id,
      skill,
      images: withImageUrls(merged),
      meta: rendered.meta,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Draft render failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
