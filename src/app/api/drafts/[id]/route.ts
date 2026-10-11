import { NextRequest } from 'next/server';
import { getDraft, updateDraftContent, updateDraftStatus } from '@/lib/db/drafts';
import { withImageUrls } from '@/lib/image/render-draft';
import {
  canTransitionDraftStatus,
  isDraftStatus,
} from '@/lib/review/status';

export const runtime = 'nodejs';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: raw } = await ctx.params;
  const id = parseId(raw);
  if (id === null) return Response.json({ error: 'invalid draft id' }, { status: 400 });
  const record = getDraft(id);
  if (!record) return Response.json({ error: `Draft not found: ${id}` }, { status: 404 });
  return Response.json({ draft: { ...record, images: withImageUrls(record.images) } });
}

/**
 * 审核处置 / 编辑后通过(B1):
 * body: { status?: DraftStatus, body?: string, titles?: string[] }
 * - 内容字段先落库(「编辑后通过」),再按状态机校验并写回 drafts.status。
 * - 非法状态 / 非法流转分别返回 400 / 409,不当作 500。
 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: raw } = await ctx.params;
  const id = parseId(raw);
  if (id === null) return Response.json({ error: 'invalid draft id' }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as {
    status?: unknown;
    body?: unknown;
    titles?: unknown;
  };

  const record = getDraft(id);
  if (!record) return Response.json({ error: `Draft not found: ${id}` }, { status: 404 });

  const content: { body?: string; titles?: string[] } = {};
  if (body.body !== undefined) {
    if (typeof body.body !== 'string' || body.body.trim().length === 0) {
      return Response.json({ error: 'body must be a non-empty string' }, { status: 400 });
    }
    content.body = body.body;
  }
  if (body.titles !== undefined) {
    if (
      !Array.isArray(body.titles) ||
      body.titles.some((t) => typeof t !== 'string' || t.trim().length === 0)
    ) {
      return Response.json({ error: 'titles must be a non-empty string array' }, { status: 400 });
    }
    content.titles = body.titles as string[];
  }

  let nextStatus = record.status;
  if (body.status !== undefined) {
    if (!isDraftStatus(body.status)) {
      return Response.json({ error: `invalid status: ${String(body.status)}` }, { status: 400 });
    }
    if (!canTransitionDraftStatus(record.status, body.status)) {
      return Response.json(
        { error: `illegal status transition: ${record.status} → ${body.status}` },
        { status: 409 },
      );
    }
    nextStatus = body.status;
  }

  if (Object.keys(content).length === 0 && nextStatus === record.status) {
    return Response.json({ error: 'no changes provided' }, { status: 400 });
  }

  if (Object.keys(content).length > 0) updateDraftContent(id, content);
  if (nextStatus !== record.status) updateDraftStatus(id, nextStatus);

  const updated = getDraft(id)!;
  return Response.json({ draft: { ...updated, images: withImageUrls(updated.images) } });
}
