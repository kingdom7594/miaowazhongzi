'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, ShieldCheck, Image as ImageIcon, Library } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Checkbox, Chip, EmptyState, Alert, Pagehead } from '@/components/console/ui';
import { withBasePath } from '@/lib/base-path';
import { DRAFT_STATUS_LABELS, type DraftStatus } from '@/lib/review/status';
import type { DraftImage, DraftRecord, DraftScores } from '@/lib/types';

interface DraftImageView extends DraftImage {
  url?: string | null;
}

type DraftRow = Omit<DraftRecord, 'images'> & { images?: DraftImageView[] };

type Tone = 'gray' | 'ok' | 'warn' | 'bad' | 'info' | 'brand';

const STATUS_TONE: Record<DraftStatus, Tone> = {
  draft: 'gray',
  in_review: 'info',
  approved: 'ok',
  rejected: 'bad',
  published: 'brand',
};

const SCORE_DIMS = ['hook', 'audienceFit', 'evidence', 'platformFit', 'originality'] as const;

function scoreTotal(scores?: DraftScores): number | null {
  if (!scores) return null;
  const values = SCORE_DIMS.map((d) => scores[d]).filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

const SORTS = [
  { id: 'updated', label: '最近更新' },
  { id: 'created', label: '创建时间' },
  { id: 'quality', label: '质量(1–5)' },
] as const;

type SortId = (typeof SORTS)[number]['id'];

export default function LibraryPage() {
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [platform, setPlatform] = useState<string>('all');
  const [status, setStatus] = useState<DraftStatus | 'all'>('all');
  const [sort, setSort] = useState<SortId>('updated');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(withBasePath('/api/drafts'));
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? '加载稿件失败');
        setDrafts((data.drafts ?? []) as DraftRow[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载稿件失败');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const platforms = useMemo(
    () => [...new Set(drafts.map((d) => d.platform))],
    [drafts],
  );

  const filtered = useMemo(() => {
    const rows = drafts.filter(
      (d) => (platform === 'all' || d.platform === platform) && (status === 'all' || d.status === status),
    );
    return [...rows].sort((a, b) => {
      if (sort === 'quality') return (scoreTotal(b.scores) ?? -1) - (scoreTotal(a.scores) ?? -1);
      if (sort === 'created') return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    });
  }, [drafts, platform, status, sort]);

  const allChecked = filtered.length > 0 && filtered.every((d) => checked.has(d.id));

  const toggle = (id: number, next: boolean) => {
    setChecked((prev) => {
      const s = new Set(prev);
      if (next) s.add(id);
      else s.delete(id);
      return s;
    });
  };

  const toggleAll = (next: boolean) => {
    setChecked(next ? new Set(filtered.map((d) => d.id)) : new Set());
  };

  const exportCsv = () => {
    const rows = filtered.filter((d) => checked.has(d.id));
    if (rows.length === 0) return;
    const header = ['id', 'platform', 'title', 'status', 'quality(1-5)', 'topicId', 'updatedAt'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = rows.map((d) =>
      [d.id, d.platform, d.titles?.[0] ?? '', d.status, scoreTotal(d.scores)?.toFixed(2) ?? '', d.topicId, d.updatedAt]
        .map(esc)
        .join(','),
    );
    const csv = [header.join(','), ...body].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `library-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <EmptyState title="加载中…" />;

  const checkedCount = filtered.filter((d) => checked.has(d.id)).length;

  return (
    <div className="flex flex-col gap-4">
      <Pagehead
        icon={Library}
        title="稿件库"
        desc={`选题 ↔ 稿件 ↔ 图片 ↔ 发布记录 · 共 ${drafts.length} 篇`}
        actions={
          <>
            {checkedCount > 0 && (
              <Button variant="ghost" onClick={exportCsv}>
                <Download size={15} /> 导出 CSV({checkedCount})
              </Button>
            )}
          </>
        }
      />

      {error && <Alert tone="bad">{error}</Alert>}

      <Card>
        <CardHeader
          title="筛选 / 排序"
          action={
            <div className="flex items-center gap-1">
              {SORTS.map((s) => (
                <Chip key={s.id} active={sort === s.id} onClick={() => setSort(s.id)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          }
        />
        <div className="flex flex-wrap items-center gap-2 p-3">
          <span className="text-[11px] text-ink-3">平台</span>
          <Chip active={platform === 'all'} onClick={() => setPlatform('all')}>
            全部
          </Chip>
          {platforms.map((p) => (
            <Chip key={p} active={platform === p} onClick={() => setPlatform(p)}>
              {p}
            </Chip>
          ))}
          <span className="ml-2 text-[11px] text-ink-3">阶段</span>
          <Chip active={status === 'all'} onClick={() => setStatus('all')}>
            全部
          </Chip>
          {(Object.keys(DRAFT_STATUS_LABELS) as DraftStatus[]).map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
              {DRAFT_STATUS_LABELS[s]}
            </Chip>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="稿件" subtitle={`显示 ${filtered.length} / ${drafts.length} 篇`} />
        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState title="暂无稿件" hint="在生成工作台产出 draft 后会自动入库。" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-3">
                  <th className="w-8 px-3 py-2">
                    <Checkbox checked={allChecked} onChange={toggleAll} label={<span className="sr-only">全选</span>} />
                  </th>
                  <th className="px-3 py-2 font-medium">稿件 / 来源选题</th>
                  <th className="px-3 py-2 font-medium">平台</th>
                  <th className="px-3 py-2 font-medium">产物</th>
                  <th className="px-3 py-2 font-medium">阶段</th>
                  <th className="px-3 py-2 font-medium">质量(1–5)</th>
                  <th className="px-3 py-2 font-medium">更新</th>
                  <th className="px-3 py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const q = scoreTotal(d.scores);
                  const imgs = (d.images ?? []).filter((img) => img.url);
                  return (
                    <tr key={d.id} className="border-b border-line last:border-b-0 hover:bg-panel-2">
                      <td className="px-3 py-2.5 align-top">
                        <Checkbox
                          checked={checked.has(d.id)}
                          onChange={(next) => toggle(d.id, next)}
                          label={<span className="sr-only">选择 #{d.id}</span>}
                        />
                      </td>
                      <td className="max-w-[280px] px-3 py-2.5 align-top">
                        <div className="truncate font-medium">{d.titles?.[0] ?? `稿件 #${d.id}`}</div>
                        <div className="truncate font-mono text-[11px] text-ink-3" title={d.topicId}>
                          #{d.id} · 来源 {d.topicId}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <Badge tone="brand">{d.platform}</Badge>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        {imgs.length > 0 ? (
                          <div className="flex -space-x-2">
                            {imgs.slice(0, 3).map((img, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={i}
                                src={img.url ?? ''}
                                alt={`产物 ${i + 1}`}
                                className="h-9 w-9 rounded-sm border border-line object-cover"
                              />
                            ))}
                            {imgs.length > 3 && (
                              <span className="grid h-9 w-9 place-items-center rounded-sm border border-line bg-panel-3 font-mono text-[10px] text-ink-3">
                                +{imgs.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-ink-3">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <Badge tone={STATUS_TONE[d.status]}>{DRAFT_STATUS_LABELS[d.status]}</Badge>
                      </td>
                      <td className="px-3 py-2.5 align-top font-mono text-xs text-ink-2">
                        {q === null ? '—' : q.toFixed(1)}
                      </td>
                      <td className="px-3 py-2.5 align-top font-mono text-[11px] text-ink-3">
                        {new Date(d.updatedAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="flex items-center gap-2 text-brand">
                          <Link href="/review" className="inline-flex items-center gap-1 hover:underline">
                            <ShieldCheck size={14} /> 审核
                          </Link>
                          <Link href="/visual" className="inline-flex items-center gap-1 hover:underline">
                            <ImageIcon size={14} /> 出图
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
