import { listTopics } from '@/lib/db/topics';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return Response.json({ topics: listTopics() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list topics';
    return Response.json({ error: message }, { status: 500 });
  }
}
