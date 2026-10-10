import { listDrafts } from '@/lib/db/drafts';
import { listPublications } from '@/lib/db/publications';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return Response.json({ drafts: listDrafts(), publications: listPublications() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list drafts';
    return Response.json({ error: message }, { status: 500 });
  }
}
