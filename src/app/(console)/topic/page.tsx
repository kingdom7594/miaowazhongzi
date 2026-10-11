'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RefreshCw, ArrowRight, Database, X } from 'lucide-react';
import { Badge, Button, Card, Checkbox, EmptyState, Alert, Pagehead } from '@/components/console/ui';
import { withBasePath } from '@/lib/base-path';
import type { ContentTopic } from '@/lib/radar/types';

interface TopicRow extends ContentTopic {
  briefDate: string;
  createdAt: string;
  updatedAt: string;
}

export default function TopicPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(withBasePath('/api/topics'));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '加载选题失败');
      const list = (data.topics ?? []) as TopicRow[];
      setTopics(list);
      setSelected((prev) => prev.filter((id) => list.some((t) => t.id === id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载选题失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allSelected = useMemo(
    () => topics.length > 0 && selected.length === topics.length,
    [topics, selected],
  );

  const toggle = (id: string, next: boolean) =>
    setSelected((prev) => (next ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));

  const toggleAll = (next: boolean) => setSelected(next ? topics.map((t) => t.id) : []);

  const ingest = async () => {
    setIngesting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(withBasePath('/api/radar/ingest'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '雷达拉取失败');
      setMessage(`已拉取 ${data.date}:新增 ${data.result.inserted} 条,更新 ${data.result.updated} 条。`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '雷达拉取失败');
    } finally {
      setIngesting(false);
    }
  };

  const enqueue = () => {
    if (selected.length === 0) return;
    const query = selected.map((id) => `topicId=${encodeURIComponent(id)}`).join('&');
    router.push(`/workbench?${query}`);
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 pb-24">
      <Pagehead
        title="选题看板"
        desc="雷达选题(GET /api/content)→ 入库 SQLite → 多选进入生产。"
        actions={
          <>
            {topics.length > 0 && (
              <Checkbox checked={allSelected} onChange={toggleAll} label="全选" />
            )}
            <Button variant="gen" onClick={ingest} disabled={ingesting}>
              <RefreshCw size={15} className={ingesting ? 'animate-spin' : ''} />
              {ingesting ? '拉取中…' : '从雷达拉取选题'}
            </Button>
          </>
        }
      />

      {message && <Alert tone="ok">{message}</Alert>}
      {error && <Alert tone="bad">数据源失败:{error}(不阻塞其它操作,可重试)</Alert>}

      {loading ? (
        <EmptyState title="加载中…" />
      ) : topics.length === 0 ? (
        <EmptyState title="暂无选题" hint="点击右上角「从雷达拉取选题」。" />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {topics.map((topic) => {
            const isSelected = selected.includes(topic.id);
            return (
              <Card
                key={topic.id}
                className={`flex flex-col gap-3 p-4 transition-colors ${
                  isSelected ? 'border-brand/60 ring-1 ring-brand/40' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="pt-0.5">
                      <Checkbox
                        checked={isSelected}
                        onChange={(next) => toggle(topic.id, next)}
                        label={<span className="sr-only">选择 {topic.headline}</span>}
                      />
                    </span>
                    <div className="text-sm font-semibold leading-snug">{topic.headline}</div>
                  </div>
                  <Badge tone="info">{topic.briefDate}</Badge>
                </div>
                {topic.hook && <p className="text-xs leading-relaxed text-ink-2">{topic.hook}</p>}
                <div className="flex flex-wrap items-center gap-1.5">
                  {(topic.platforms ?? []).map((p) => (
                    <Badge key={p} tone="brand">
                      {p}
                    </Badge>
                  ))}
                  <Badge tone="plum">{`依据 ${topic.evidence?.length ?? 0}`}</Badge>
                  <Badge tone="gray">{`要点 ${topic.corePoints?.length ?? 0}`}</Badge>
                </div>
                {topic.sourceRef && (
                  <div className="truncate font-mono text-[11px] text-ink-3" title={topic.sourceRef}>
                    来源追溯:{topic.sourceRef}
                  </div>
                )}
                <div className="mt-auto flex items-center justify-between pt-1">
                  <span className="font-mono text-[11px] text-ink-3">{topic.id}</span>
                  <Link
                    href={`/workbench?topicId=${encodeURIComponent(topic.id)}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                  >
                    <Database size={13} /> 去生成
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-3">
            <div className="flex items-center gap-3 text-sm">
              <Badge tone="brand">{`已选 ${selected.length}`}</Badge>
              <span className="text-ink-2">
                · 预计生成 <span className="font-mono text-ink">{selected.length}</span> 篇(每选题按所选平台数)
              </span>
              <button
                type="button"
                onClick={() => setSelected([])}
                className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink"
              >
                <X size={13} /> 清空
              </button>
            </div>
            <Button variant="gen" onClick={enqueue}>
              加入生产队列
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
