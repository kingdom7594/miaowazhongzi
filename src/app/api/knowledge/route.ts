import { loadKnowledge, parseComplianceRules } from '@/lib/knowledge/loader';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const knowledge = loadKnowledge();
    const rules = parseComplianceRules();
    return Response.json({ knowledge, rules });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load knowledge base';
    return Response.json({ error: message }, { status: 500 });
  }
}
