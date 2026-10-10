import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface KnowledgeDocs {
  product: string;
  persona: string;
  compliance: string;
}

export interface ComplianceRules {
  disallowed: string[];
  replacements: Record<string, string>;
}

const FILES = {
  product: 'product.md',
  persona: 'persona.md',
  compliance: 'compliance.md',
} as const;

export type KnowledgeDocName = keyof typeof FILES;

export function knowledgeDir(): string {
  return process.env.KNOWLEDGE_DIR ?? join(process.cwd(), 'src', 'lib', 'knowledge');
}

const cache = new Map<KnowledgeDocName, string>();

export function loadKnowledgeDoc(name: KnowledgeDocName): string {
  const cached = cache.get(name);
  if (cached !== undefined) return cached;
  const filePath = join(knowledgeDir(), FILES[name]);
  let content: string;
  try {
    content = readFileSync(filePath, 'utf8').trim();
  } catch {
    throw new Error(
      `Knowledge file missing: ${filePath}. Set KNOWLEDGE_DIR to point at the knowledge directory.`,
    );
  }
  if (!content) throw new Error(`Knowledge file is empty: ${filePath}`);
  cache.set(name, content);
  return content;
}

export function loadKnowledge(): KnowledgeDocs {
  return {
    product: loadKnowledgeDoc('product'),
    persona: loadKnowledgeDoc('persona'),
    compliance: loadKnowledgeDoc('compliance'),
  };
}

/** Assemble the full knowledge block injected into generation prompts. */
export function buildKnowledgeBlock(): string {
  const k = loadKnowledge();
  return [
    '## 产品档案',
    k.product,
    '',
    '## 人设',
    k.persona,
    '',
    '## 合规词库',
    k.compliance,
  ].join('\n');
}

/** Parse the compliance markdown table into disallowed words + replacement hints. */
export function parseComplianceRules(markdown: string = loadKnowledgeDoc('compliance')): ComplianceRules {
  const disallowed: string[] = [];
  const replacements: Record<string, string> = {};
  for (const raw of markdown.split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('|')) continue;
    const cells = line.split('|');
    const cols = cells.slice(1, -1).map((c) => c.trim());
    const [word, replacement] = cols;
    if (!word || word === '禁用词' || /^-+$/.test(word)) continue;
    disallowed.push(word);
    if (replacement && replacement !== '替换建议' && replacement !== '(删除)') {
      replacements[word] = replacement;
    }
  }
  return { disallowed, replacements };
}

export function clearKnowledgeCache(): void {
  cache.clear();
}
