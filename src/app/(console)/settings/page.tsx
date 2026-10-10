'use client';

import { useEffect, useState } from 'react';
import { Badge, Card, CardHeader, EmptyState, Alert } from '@/components/console/ui';

interface Health {
  ok: boolean;
  checks: Record<string, { ok: boolean; detail: string }>;
}

interface KnowledgeData {
  knowledge: { product: string; persona: string; compliance: string };
  rules: { disallowed: string[]; replacements: Record<string, string> };
}

export default function SettingsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [h, k] = await Promise.all([fetch('/api/health'), fetch('/api/knowledge')]);
        const hd = await h.json();
        const kd = await k.json();
        setHealth(hd);
        if (k.ok) setKnowledge(kd);
        else setError(kd.error ?? '加载知识库失败');
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      }
    })();
  }, []);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      {error && <Alert tone="bad">{error}</Alert>}

      <Card>
        <CardHeader
          title="依赖健康检查"
          subtitle="雷达 / SQLite / LLM 配置"
          action={
            health ? (
              <Badge tone={health.ok ? 'ok' : 'warn'}>{health.ok ? '全部就绪' : '有待处理'}</Badge>
            ) : null
          }
        />
        <div className="divide-y divide-line">
          {health ? (
            Object.entries(health.checks).map(([name, c]) => (
              <div key={name} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Badge tone={c.ok ? 'ok' : 'warn'}>{c.ok ? 'OK' : '待配置'}</Badge>
                  <span className="text-sm font-medium">{name}</span>
                </div>
                <span className="truncate font-mono text-[11px] text-ink-3" title={c.detail}>
                  {c.detail}
                </span>
              </div>
            ))
          ) : (
            <div className="p-4">
              <EmptyState title="检测中…" />
            </div>
          )}
        </div>
      </Card>

      {knowledge && (
        <>
          <Card>
            <CardHeader
              title="合规词库"
              subtitle={`禁用词 ${knowledge.rules.disallowed.length} 个 · 注入生成 prompt`}
            />
            <div className="flex flex-wrap gap-1.5 p-4">
              {knowledge.rules.disallowed.map((w) => (
                <span key={w} className="rounded-full bg-bad/15 px-2 py-0.5 text-xs text-bad">
                  {w}
                  {knowledge.rules.replacements[w] ? ` → ${knowledge.rules.replacements[w]}` : ''}
                </span>
              ))}
            </div>
          </Card>

          {(['product', 'persona', 'compliance'] as const).map((name) => (
            <Card key={name}>
              <CardHeader
                title={
                  name === 'product' ? '产品档案' : name === 'persona' ? '人设' : '合规词库(原文)'
                }
                subtitle={`src/lib/knowledge/${name}.md`}
              />
              <details className="px-4 py-3">
                <summary className="cursor-pointer text-xs text-brand">展开 / 收起</summary>
                <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-ink-2">
                  {knowledge.knowledge[name]}
                </pre>
              </details>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
