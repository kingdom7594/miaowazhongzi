import { describe, it, expect } from 'vitest';
import {
  parseComplianceRules,
  buildKnowledgeBlock,
  buildMethodologyBlock,
  loadKnowledge,
  loadMethodologyDoc,
} from './loader';

describe('knowledge loader', () => {
  it('parses the compliance table into disallowed words + replacements', () => {
    const rules = parseComplianceRules();
    expect(rules.disallowed).toContain('绝了');
    expect(rules.replacements['绝了']).toBe('真的很喜欢');
    expect(rules.disallowed).not.toContain('禁用词');
    expect(rules.disallowed.length).toBeGreaterThan(10);
  });

  it('loads all three knowledge docs and builds an injectable block', () => {
    const docs = loadKnowledge();
    expect(docs.product).toContain('产品档案');
    expect(docs.persona).toContain('人设');
    expect(docs.compliance.length).toBeGreaterThan(0);
    const block = buildKnowledgeBlock();
    expect(block).toContain('## 产品档案');
    expect(block).toContain('## 人设');
    expect(block).toContain('## 合规词库');
  });

  it('loads L5 methodology docs and builds a methodology block', () => {
    expect(loadMethodologyDoc('title-formulas')).toContain('标题爆款公式');
    expect(loadMethodologyDoc('competitor-teardown')).toContain('对标拆解');
    const block = buildMethodologyBlock();
    expect(block).toContain('## 对标拆解');
    expect(block).toContain('## 复盘');
    expect(block).toContain('## 标题爆款公式');
  });

  it('includes the pre-publish compliance checklist in the compliance doc', () => {
    expect(loadKnowledge().compliance).toContain('发布前合规检查清单');
  });
});
