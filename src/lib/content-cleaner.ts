export function stripMarkdown(text: string): string {
  let cleaned = text;
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  cleaned = cleaned.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');
  cleaned = cleaned.replace(/_{1,3}([^_]+)_{1,3}/g, '$1');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  return cleaned;
}

export function normalizeLineBreaks(text: string): string {
  let cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned;
}

export function cleanContent(text: string): string {
  let cleaned = text;
  cleaned = normalizeLineBreaks(cleaned);
  cleaned = stripMarkdown(cleaned);
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();
  return cleaned;
}

export function stripEmoji(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{FE0F}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
