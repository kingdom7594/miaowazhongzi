import { listDrafts } from '@/lib/db/drafts';
import { listPublications } from '@/lib/db/publications';
import { withImageUrls } from '@/lib/image/render-draft';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const drafts = listDrafts().map((draft) => ({ ...draft, images: withImageUrls(draft.images) }));
    return Response.json({ drafts, publications: listPublications() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list drafts';
    return Response.json({ error: message }, { status: 500 });
  }
}
