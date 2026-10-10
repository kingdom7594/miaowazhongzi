'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Chip, EmptyState, Alert } from '@/components/console/ui';
import type { ContentTopic } from '@/lib/radar/types';
import type { Draft } from '@/lib/types';

interface TopicRow extends ContentTopic {
  briefDate: string;
}

interface GenDraft extends Draft {
  id: number;
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
  const [topicId, setTopicId] = useState<string>('');
  const [platforms, setPlatforms] = useState<string[]>(['xiaohongshu']);
  const [aiDensity, setAiDensity] = useState(50);
  const [generating, setGenerating] = useState(false);
  const [drafts, setDrafts] = useState<GenDraft[]>([]);
  const [errors, setErrors] = useState<Array<{ platform: string; error: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/topics');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '加载选题失败');
      const list = (data.topics ?? []) as TopicRow[];
      setTopics(list);
      const q = new URLSearchParams(window.location.search).get('topicId');
      if (q && list.some((t) => t.id === q)) setTopicId(q);
      else if (list.length > 0) setTopicId(list[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载选题失败');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const togglePlatform = (id: string) => {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const generate = async () => {
    if (!topicId || platforms.length === 0) return;
    setGenerating(true);
    setError(null);
    setDrafts([]);
    setErrors([]);
    try {
      const res = await fetch('/api/drafts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, platforms, aiDensity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '生成失败');
      setDrafts(data.drafts ?? []);
      setErrors(data.errors ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert tone="bad">{error}</Alert>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader title="生成参数" subtitle="选题 → 多平台 draft" />
          <div className="flex flex-col gap-4 p-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-ink-2">选题</span>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="h-9 rounded-sm border border-line bg-panel-2 px-2 text-sm outline-none focus:border-brand"
              >
                {topics.length === 0 && <option value="">(无选题,请先在选题看板拉取)</option>}
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.headline}
                  </option>
                ))}
              </select>
            </label>

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

            <Button variant="gen" onClick={generate} disabled={generating || !topicId || platforms.length === 0}>
              <Sparkles size={15} className={generating ? 'animate-pulse' : ''} />
              {generating ? '生成中…' : `生成 ${platforms.length} 篇`}
            </Button>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          {generating && <EmptyState title="LLM 生成中…" hint="逐平台产出,请稍候(不使用 mock 兜底)。" />}
          {!generating && drafts.length === 0 && errors.length === 0 && (
            <EmptyState title="暂无产出" hint="选择选题与平台,点击「生成」。" />
          )}
          {drafts.map((d) => (
            <DraftPreview key={d.id} draft={d} />
          ))}
          {errors.map((e) => (
            <Alert key={e.platform} tone="bad">
              [{e.platform}] {e.error}
            </Alert>
          ))}
        </div>
      </div>
    </div>
  );
}

function DraftPreview({ draft }: { draft: GenDraft }) {
  const compliance = draft.compliance;
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge tone="brand">{draft.platform}</Badge>
          <span className="font-mono text-[11px] text-ink-3">#{draft.id} · {draft.topicId}</span>
        </div>
        <Badge tone={compliance?.passed ? 'ok' : 'warn'}>
          {compliance?.passed ? '合规通过' : '待复核'}
        </Badge>
      </div>

      {draft.titles && draft.titles.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1">
          {draft.titles.map((t, i) => (
            <li key={i} className="text-sm font-semibold">
              {i + 1}. {t}
            </li>
          ))}
        </ul>
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
