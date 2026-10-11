import { describe, it, expect } from 'vitest';
import { RENDER_TYPES, getRenderType, renderTypeBySkill } from './render-types';
import { DRAFT_RENDER_SKILLS } from './render-draft';

describe('RENDER_TYPES', () => {
  it('exposes the 5 order-of-the-design types', () => {
    expect(RENDER_TYPES.map((t) => t.label)).toEqual(['卡片', '封面', '信息图', 'PPT', '图解']);
  });

  it('maps every type to a wired draft render skill (no drift)', () => {
    for (const t of RENDER_TYPES) {
      expect(DRAFT_RENDER_SKILLS as readonly string[]).toContain(t.skill);
    }
  });

  it('getRenderType / renderTypeBySkill resolve both ways', () => {
    expect(getRenderType('cards')?.skill).toBe('baoyu-xhs-images');
    expect(renderTypeBySkill('baoyu-diagram')?.id).toBe('diagram');
    expect(getRenderType('nope')).toBeUndefined();
  });
});
