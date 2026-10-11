'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles, Loader2, Wand2, X, Check } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Chip,
  EmptyState,
  Alert,
  Pagehead,
} from '@/components/console/ui';
import { withBasePath } from '@/lib/base-path';
import { readSseJson } from '@/lib/sse-client';
import type { ContentTopic } from '@/lib/radar/types';
import type { Draft } from '@/lib/types';

interface TopicRow extends ContentTopic {
  briefDate: string;
}

interface GenDraft extends Draft {
  id: number;
}

interface BoostTitle {
  type: string;
  title: string;
}

const PLATFORMS = [
  { id: 'xiaohongshu', label: '小红书' },
  { id: 'douyin', label: '抖音' },
  { id: 'wechat', label: '公众号' },
  { id: 'bilibili', label: 'B站' },
  { id: 'kuaishou', label: '快手' },
  { id: 'shipinhao', label: '视频号' },
];

export default function WorkbenchPage() {
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>(['xiaohongshu']);
  const [aiDensity, setAiDensity] = useState(50);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [drafts, setDrafts] = useState<GenDraft[]>([]);
  const [errors, setErrors] = useState<Array<{ platform: string; error: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(withBasePath('/api/topics'));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '加载选题失败');
      const list = (data.topics ?? []) as TopicRow[];
      setTopics(list);
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.getAll('topicId').filter((id) => list.some((t) => t.id === id));
      if (fromQuery.length > 0) setBatchIds([...new Set(fromQuery)]);
      else if (list.length > 0) setBatchIds([list[0].id]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载选题失败');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const batchTopics = useMemo(
    () => batchIds.map((id) => topics.find((t) => t.id === id)).filter((t): t is TopicRow => !!t),
    [batchIds, topics],
  );

  const togglePlatform = (id: string) => {
    setPlatforms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const toggleTopic = (id: string, next: boolean) =>
    setBatchIds((prev) => (next ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));

  const generate = async () => {
    if (batchIds.length === 0 || platforms.length === 0) return;
    setGenerating(true);
    setError(null);
    setDrafts([]);
    setErrors([]);
    setProgress({ done: 0, total: batchIds.length });
    const allDrafts: GenDraft[] = [];
    const allErrors: Array<{ platform: string; error: string }> = [];
    try {
      for (let i = 0; i < batchIds.length; i += 1) {
        const topicId = batchIds[i];
        try {
          const res = await fetch(withBasePath('/api/drafts/generate'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topicId, platforms, aiDensity }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? '生成失败');
          allDrafts.push(...((data.drafts ?? []) as GenDraft[]));
          for (const e of (data.errors ?? []) as Array<{ platform: string; error: string }>) {
            allErrors.push({ platform: `${topicId}·${e.platform}`, error: e.error });
          }
        } catch (err) {
          allErrors.push({ platform: topicId, error: err instanceof Error ? err.message : '生成失败' });
        }
        setProgress({ done: i + 1, total: batchIds.length });
        setDrafts([...allDrafts]);
        setErrors([...allErrors]);
      }
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  };

  const applyTitles = (id: number, titles: string[]) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, titles } : d)));
  };

  const totalCount = batchIds.length * platforms.length;

  return (
    <div className="flex flex-col gap-4">
      <Pagehead
        title="生成工作台"
        desc="选题 → 多平台 draft(逐平台隔离,失败不整批丢)。"
      />

      {error && <Alert tone="bad">{error}</Alert>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_1fr]">
        <Card className="h-fit">
          <CardHeader title="生成参数" subtitle="选题 → 多平台 draft" />
          <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-ink-2">
                本批选题 <span className="font-mono">{batchIds.length}</span> 条
              </span>
              {batchTopics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {batchTopics.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex max-w-full items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-[11px] text-brand"
                    >
                      <span className="truncate">{t.headline}</span>
                      <button
                        type="button"
                        aria-label={`移除 ${t.headline}`}
                        onClick={() => toggleTopic(t.id, false)}
                        className="shrink-0 hover:text-ink"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-1 max-h-44 overflow-y-auto rounded-sm border border-line bg-panel-2 p-2">
                {topics.length === 0 ? (
                  <div className="px-1 py-2 text-xs text-ink-3">(无选题,请先在选题看板拉取)</div>
                ) : (
                  topics.map((t) => (
                    <div key={t.id} className="px-1 py-1">
                      <Checkbox
                        checked={batchIds.includes(t.id)}
                        onChange={(next) => toggleTopic(t.id, next)}
                        label={<span className="truncate">{t.headline}</span>}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-ink-2">目标平台</span>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => (
                  <Chip key={p.id} active={platforms.includes(p.id)} onClick={() => togglePlatform(p.id)}>
                    {p.label}
                  </Chip>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-ink-2">
                AI 浓度 <span className="font-mono">{aiDensity}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={aiDensity}
                onChange={(e) => setAiDensity(Number(e.target.value))}
                className="accent-brand"
              />
            </label>

            <Button
              variant="gen"
              onClick={generate}
              disabled={generating || batchIds.length === 0 || platforms.length === 0}
            >
              {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {generating
                ? `生成中 ${progress?.done ?? 0}/${progress?.total ?? 0}…`
                : `生成 ${totalCount} 篇(${batchIds.length} 选题 × ${platforms.length} 平台)`}
            </Button>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          {generating && (
            <EmptyState
              title={`LLM 生成中 ${progress?.done ?? 0}/${progress?.total ?? 0}…`}
              hint="逐选题 × 平台产出,单平台失败仅记入错误,不使用 mock 兜底。"
            />
          )}
          {!generating && drafts.length === 0 && errors.length === 0 && (
            <EmptyState title="暂无产出" hint="勾选本批选题与平台,点击「生成」。" />
          )}
          {drafts.map((d) => (
            <DraftPreview key={d.id} draft={d} topic={topics.find((t) => t.id === d.topicId)} onApplyTitles={applyTitles} />
          ))}
          {errors.map((e) => (
            <Alert key={`${e.platform}-${e.error}`} tone="bad">
              [{e.platform}] {e.error}
            </Alert>
          ))}
        </div>
      </div>
    </div>
  );
}

function DraftPreview({
  draft,
  topic,
  onApplyTitles,
}: {
  draft: GenDraft;
  topic?: TopicRow;
  onApplyTitles: (id: number, titles: string[]) => void;
}) {
  const compliance = draft.compliance;
  const [boosting, setBoosting] = useState(false);
  const [boosted, setBoosted] = useState<BoostTitle[] | null>(null);
  const [boostError, setBoostError] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | null>(null);

  const runBoost = async () => {
    setBoosting(true);
    setBoostError(null);
    setBoosted(null);
    try {
      const res = await fetch(withBasePath('/api/title-boost'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: draft.body,
          keyword: draft.tags?.[0] ?? '',
          targetAudience: topic?.audience ?? '',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? '标题生成失败');
      }
      const data = await readSseJson<{ titles?: BoostTitle[] }>(res);
      if (!data.titles || data.titles.length === 0) throw new Error('未返回标题');
      setBoosted(data.titles);
    } catch (err) {
      setBoostError(err instanceof Error ? err.message : '标题生成失败');
    } finally {
      setBoosting(false);
    }
  };

  const applyTitle = async (title: string) => {
    const next = [title, ...(draft.titles ?? []).filter((t) => t !== title)];
    const res = await fetch(withBasePath(`/api/drafts/${draft.id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titles: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setBoostError((data as { error?: string }).error ?? '保存标题失败');
      return;
    }
    onApplyTitles(draft.id, next);
    setApplied(title);
  };

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge tone="brand">{draft.platform}</Badge>
          <span className="font-mono text-[11px] text-ink-3">#{draft.id} · {draft.topicId}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={runBoost} disabled={boosting} className="h-7 px-2 text-xs">
            {boosting ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
            {boosting ? '生成中…' : 'AI 标题备选'}
          </Button>
          <Badge tone={compliance?.passed ? 'ok' : 'warn'}>
            {compliance?.passed ? '合规通过' : '待复核'}
          </Badge>
        </div>
      </div>

      {draft.titles && draft.titles.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1">
          {draft.titles.map((t, i) => (
            <li key={i} className={`text-sm font-semibold ${applied === t ? 'text-brand' : ''}`}>
              {i + 1}. {t}
              {applied === t && <Check size={13} className="ml-1 inline" />}
            </li>
          ))}
        </ul>
      )}

      {boostError && (
        <div className="mb-2">
          <Alert tone="bad">{boostError}</Alert>
        </div>
      )}

      {boosted && (
        <div className="mb-3 rounded-md border border-line bg-panel-2 p-2">
          <div className="mb-1 text-[11px] text-ink-3">爆款标题备选(点击应用为标题 A):</div>
          <ul className="flex flex-col gap-1">
            {boosted.map((b, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-xs">
                  <span className="mr-1 text-ink-3">[{b.type}]</span>
                  {b.title}
                </span>
                <button
                  type="button"
                  onClick={() => applyTitle(b.title)}
                  className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 text-[11px] text-brand hover:border-brand"
                >
                  应用
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{draft.body}</p>

      {draft.tags && draft.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {draft.tags.map((t, i) => (
            <span key={i} className="text-xs text-info">
              {t}
            </span>
          ))}
        </div>
      )}

      {draft.scores && (
        <div className="mt-3 flex gap-3 font-mono text-[11px] text-ink-3">
          <span>钩子 {draft.scores.hook ?? '-'}</span>
          <span>依据 {draft.scores.evidence ?? '-'}</span>
          <span>平台契合 {draft.scores.platformFit ?? '-'}</span>
        </div>
      )}
    </Card>
  );
}
