import type { GeneratedNote, Draft, DraftCompliance, DraftScores } from './types';

export function parseLLMJson(text: string): GeneratedNote[] {
  let cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) cleaned = codeBlockMatch[1].trim();
  const arrayStart = cleaned.indexOf('[');
  const arrayEnd = cleaned.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    cleaned = cleaned.substring(arrayStart, arrayEnd + 1);
  }
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed as GeneratedNote[];
    return [parsed as GeneratedNote];
  } catch {
    try {
      const fixed = cleaned.replace(/,\s*([\]}])/g, '$1');
      const parsed = JSON.parse(fixed);
      if (Array.isArray(parsed)) return parsed as GeneratedNote[];
      return [parsed as GeneratedNote];
    } catch {
      console.error('Failed to parse LLM JSON:', text);
      return [];
    }
  }
}

export function parseTitleBoostJson(text: string): Array<{ type: string; title: string }> {
  let cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) cleaned = codeBlockMatch[1].trim();
  const objStart = cleaned.indexOf('{');
  const objEnd = cleaned.lastIndexOf('}');
  if (objStart !== -1 && objEnd !== -1) cleaned = cleaned.substring(objStart, objEnd + 1);
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.titles && Array.isArray(parsed.titles)) return parsed.titles;
    return [];
  } catch {
    console.error('Failed to parse title boost JSON:', text);
    return [];
  }
}

/**
 * Extract the first JSON object from a model response (tolerates ```json fences
 * and trailing commas). Returns null when nothing parseable is found.
 */
export function extractJsonObject(text: string): Record<string, unknown> | null {
  let cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) cleaned = codeBlockMatch[1].trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  const slice = cleaned.substring(start, end + 1);
  try {
    const parsed = JSON.parse(slice);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    try {
      const parsed = JSON.parse(slice.replace(/,\s*([\]}])/g, '$1'));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
}

function normalizeCompliance(value: unknown): DraftCompliance | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as { passed?: unknown; risks?: unknown };
  return {
    passed: Boolean(v.passed),
    risks: Array.isArray(v.risks) ? v.risks.map(String) : [],
  };
}

function normalizeScores(value: unknown): DraftScores | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : undefined);
  return {
    hook: num(v.hook),
    evidence: num(v.evidence),
    platformFit: num(v.platformFit),
  };
}

/**
 * Parse a single draft JSON object produced for one topic+platform.
 * Returns null when the model output cannot be coerced into the draft contract.
 */
export function parseDraftJson(
  text: string,
  topicId: string,
  platform: string,
): Draft | null {
  let cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) cleaned = codeBlockMatch[1].trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  const slice = cleaned.substring(start, end + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(slice);
  } catch {
    try {
      parsed = JSON.parse(slice.replace(/,\s*([\]}])/g, '$1'));
    } catch {
      console.error('Failed to parse draft JSON:', text);
      return null;
    }
  }
  const obj = (Array.isArray(parsed) ? parsed[0] : parsed) as Record<string, unknown> | undefined;
  if (!obj || typeof obj !== 'object') return null;

  const body = typeof obj.body === 'string' ? obj.body : '';
  if (!body.trim()) return null;

  return {
    topicId,
    platform,
    titles: Array.isArray(obj.titles) ? obj.titles.map(String) : [],
    body,
    tags: Array.isArray(obj.tags) ? obj.tags.map(String) : [],
    coverPrompt: typeof obj.coverPrompt === 'string' ? obj.coverPrompt : undefined,
    compliance: normalizeCompliance(obj.compliance),
    scores: normalizeScores(obj.scores),
  };
}
