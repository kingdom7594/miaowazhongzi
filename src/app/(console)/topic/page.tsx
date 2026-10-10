'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, ArrowRight, Database } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Alert } from '@/components/console/ui';
import type { ContentTopic } from '@/lib/radar/types';

interface TopicRow extends ContentTopic {
  briefDate: string;
  createdAt: string;
  updatedAt: string;
}

export default function TopicPage() {
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/topics');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '加载选题失败');
      setTopics(data.topics ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载选题失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ingest = async () => {
    setIngesting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/radar/ingest', {
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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-ink-2">
          雷达选题(<span className="text-ink-3">GET /api/content</span>)→ 入库 SQLite → 多选进入生产。
        </div>
        <Button variant="gen" onClick={ingest} disabled={ingesting}>
          <RefreshCw size={15} className={ingesting ? 'animate-spin' : ''} />
          {ingesting ? '拉取中…' : '从雷达拉取选题'}
        </Button>
      </div>

      {message && <Alert tone="ok">{message}</Alert>}
      {error && <Alert tone="bad">数据源失败:{error}(不阻塞其它操作,可重试)</Alert>}

      {loading ? (
        <EmptyState title="加载中…" />
      ) : topics.length === 0 ? (
        <EmptyState title="暂无选题" hint="点击右上角「从雷达拉取选题」。" />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {topics.map((topic) => (
            <Card key={topic.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold leading-snug">{topic.headline}</div>
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
          ))}
        </div>
      )}
    </div>
  );
}
