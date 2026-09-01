import type { GeneratedNote } from './types';

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
