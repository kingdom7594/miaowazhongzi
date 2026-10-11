'use client';

import { useMemo } from 'react';

/** 从 risks 文本里抽取正文命中词(「」包裹)用于高亮。 */
export function highlightTerms(risks?: string[]): string[] {
  if (!risks) return [];
  const terms = new Set<string>();
  for (const risk of risks) {
    const re = /「([^」]+)」/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(risk)) !== null) {
      if (m[1]) terms.add(m[1]);
    }
  }
  return [...terms];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 正文渲染:命中词用 `--warn` 高亮。 */
export function HighlightedBody({ body, terms }: { body: string; terms: string[] }) {
  const parts = useMemo(() => {
    if (terms.length === 0) return [body];
    const re = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'g');
    return body.split(re);
  }, [body, terms]);
  const termSet = useMemo(() => new Set(terms), [terms]);
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
      {parts.map((part, i) =>
        termSet.has(part) ? (
          <mark key={i} className="rounded-sm bg-warn/25 px-0.5 text-warn">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}
