import { describe, it, expect } from 'vitest';
import { buildDiagramMessages, extractSvg } from './diagram';

describe('extractSvg', () => {
  it('extracts a bare svg document', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
    expect(extractSvg(svg)).toBe(svg);
  });

  it('extracts svg from surrounding prose / code fences', () => {
    const text = '这是图解:\n```svg\n<svg viewBox="0 0 10 10"><circle/></svg>\n```\n希望有用';
    expect(extractSvg(text)).toBe('<svg viewBox="0 0 10 10"><circle/></svg>');
  });

  it('returns null when no svg present (no mock fallback)', () => {
    expect(extractSvg('对不起,我无法生成')).toBeNull();
    expect(extractSvg('<svg>unterminated')).toBeNull();
  });
});

describe('buildDiagramMessages', () => {
  it('passes the content to the user message and demands a single svg', () => {
    const msgs = buildDiagramMessages('三种效率方法');
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('SVG');
    expect(msgs[1].content).toContain('三种效率方法');
  });
});
