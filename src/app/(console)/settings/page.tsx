'use client';

import { useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Badge, Card, CardHeader, EmptyState, Alert, Pagehead } from '@/components/console/ui';
import { withBasePath } from '@/lib/base-path';
import { countDraftsToday, dailyQuotaTarget } from '@/lib/console/shell-data';
import type { DraftRecord } from '@/lib/types';

interface Health {
  ok: boolean;
  checks: Record<string, { ok: boolean; detail: string }>;
}

interface KnowledgeData {
  knowledge: { product: string; persona: string; compliance: string };
  rules: { disallowed: string[]; replacements: Record<string, string> };
}

interface Renderers {
  status?: string;
  skills?: string[];
  image?: { configured: boolean; model: string };
}

const SET_SECTIONS = [
  { id: 'product', label: '产品档案' },
  { id: 'persona', label: '人设' },
  { id: 'compliance', label: '合规词库' },
  { id: 'platforms', label: '平台配置' },
  { id: 'models', label: '模型与额度' },
  { id: 'health', label: '健康检查' },
] as const;

const PLATFORMS = [
  { id: 'xiaohongshu', label: '小红书', enabled: true },
  { id: 'douyin', label: '抖音', enabled: false },
  { id: 'wechat', label: '公众号', enabled: false },
  { id: 'bilibili', label: 'B站', enabled: false },
  { id: 'kuaishou', label: '快手', enabled: false },
  { id: 'shipinhao', label: '视频号', enabled: false },
];

export default function SettingsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeData | null>(null);
  const [renderers, setRenderers] = useState<Renderers | null>(null);
  const [renderersError, setRenderersError] = useState<string | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [h, k, r, d] = await Promise.all([
          fetch(withBasePath('/api/health')),
          fetch(withBasePath('/api/knowledge')),
          fetch(withBasePath('/api/renderers')),
          fetch(withBasePath('/api/drafts')),
        ]);
        const hd = await h.json();
        const kd = await k.json();
        setHealth(hd);
        if (k.ok) setKnowledge(kd);
        else setError(kd.error ?? '加载知识库失败');
        if (r.ok) setRenderers(await r.json());
        else setRenderersError((await r.json().catch(() => ({}))).error ?? '视觉适配器不可达');
        if (d.ok) setTodayCount(countDraftsToday(((await d.json()).drafts ?? []) as DraftRecord[]));
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      }
    })();
  }, []);

  const quota = dailyQuotaTarget();

  return (
    <div className="flex flex-col gap-4">
      <Pagehead icon={Settings2} title="知识库 / 设置" desc="产品档案 · 人设 · 合规词库 · 平台 / 模型配置与依赖健康。" />

      {error && <Alert tone="bad">{error}</Alert>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
        {/* 左:设置导航 */}
        <nav className="flex h-fit flex-row gap-1 overflow-x-auto lg:sticky lg:top-4 lg:flex-col lg:overflow-visible">
          {SET_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="shrink-0 rounded-sm px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-panel-3 hover:text-ink"
            >
              {s.label}
            </a>
          ))}
        </nav>

        {/* 右:分区 */}
        <div className="flex min-w-0 flex-col gap-4">
          {knowledge && (
            <Card id="product">
              <CardHeader title="产品档案" subtitle="src/lib/knowledge/product.md" />
              <pre className="whitespace-pre-wrap px-4 py-3 font-mono text-[11px] leading-relaxed text-ink-2">
                {knowledge.knowledge.product}
              </pre>
            </Card>
          )}

          {knowledge && (
            <Card id="persona">
              <CardHeader title="人设" subtitle="src/lib/knowledge/persona.md" />
              <pre className="whitespace-pre-wrap px-4 py-3 font-mono text-[11px] leading-relaxed text-ink-2">
                {knowledge.knowledge.persona}
              </pre>
            </Card>
          )}

          {knowledge && (
            <Card id="compliance">
              <CardHeader
                title="合规词库"
                subtitle={`禁用词 ${knowledge.rules.disallowed.length} 个 · 注入生成 prompt`}
              />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-3">
                      <th className="px-4 py-2 font-medium">禁用词</th>
                      <th className="w-8 px-2 py-2" />
                      <th className="px-4 py-2 font-medium">替换词</th>
                    </tr>
                  </thead>
                  <tbody>
                    {knowledge.rules.disallowed.map((w) => (
                      <tr key={w} className="border-b border-line last:border-b-0">
                        <td className="px-4 py-2 font-mono text-xs text-bad">{w}</td>
                        <td className="px-2 py-2 text-center text-ink-3">→</td>
                        <td className="px-4 py-2 font-mono text-xs text-ok">
                          {knowledge.rules.replacements[w] ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Card id="platforms">
            <CardHeader title="平台配置" subtitle="MVP 先做小红书,其余待接入" />
            <div className="divide-y divide-line">
              {PLATFORMS.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-sm">{p.label}</span>
                  <Badge tone={p.enabled ? 'ok' : 'gray'}>{p.enabled ? '已启用' : '待接入'}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card id="models">
            <CardHeader title="模型与额度" subtitle="生成 / 评审模型 · 视觉适配器 · 数据层" />
            <div className="flex flex-col gap-3 p-4 text-xs text-ink-2">
              <div className="flex items-center justify-between gap-2">
                <span>生成 / 评审模型</span>
                <span className="truncate font-mono text-[11px] text-ink-3" title={health?.checks?.llm?.detail ?? ''}>
                  {health?.checks?.llm?.detail ?? '未配置'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>视觉适配器</span>
                <span className="truncate font-mono text-[11px] text-ink-3" title={renderers?.skills?.join(', ') ?? ''}>
                  {renderersError
                    ? `不可达:${renderersError}`
                    : renderers
                    ? `${renderers.image?.configured ? '已配置' : '未配置'} · ${renderers.image?.model ?? '-'} · ${renderers.skills?.length ?? 0} skills`
                    : '检测中…'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>数据层</span>
                <span className="font-mono text-[11px] text-ink-3">SQLite</span>
              </div>
              <div className="mt-1">
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span>今日产出额度</span>
                  <span className="font-mono text-ink-3">
                    {todayCount}/{quota}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-panel-3">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.min(100, quota > 0 ? (todayCount / quota) * 100 : 0)}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card id="health">
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
        </div>
      </div>
    </div>
  );
}
