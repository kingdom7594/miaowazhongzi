export const BANNED_WORDS: string[] = [
  '绝了', '封神', '天花板', '必入', 'YYDS', '绝绝子',
  '首先', '其次', '最后', '非常', '超级', '特别',
  '最', '第一', '100%', '绝对',
];

export const AI_TRACE_WORDS: string[] = [
  '总之', '综上所述', '值得注意的是', '不难发现',
  '与此同时', '不仅如此', '显而易见', '毋庸置疑',
  '众所周知', '事实上', '毫无疑问', '由此可见',
  '总而言之', '简而言之', '概括来说',
];

export function checkBannedWords(text: string): string[] {
  const found: string[] = [];
  for (const word of BANNED_WORDS) {
    if (text.includes(word)) found.push(word);
  }
  return found;
}

export function checkAITraceWords(text: string): string[] {
  const found: string[] = [];
  for (const word of AI_TRACE_WORDS) {
    if (text.includes(word)) found.push(word);
  }
  return found;
}
