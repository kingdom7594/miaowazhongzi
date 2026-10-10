'use client';

import { useEffect, useState } from 'react';
import { Badge, Card, CardHeader, EmptyState, Alert } from '@/components/console/ui';
import type { DraftRecord, PublicationRecord } from '@/lib/types';

export default function LibraryPage() {
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [publications, setPublications] = useState<PublicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/drafts');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? '加载稿件失败');
        setDrafts(data.drafts ?? []);
        setPublications(data.publications ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载稿件失败');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <EmptyState title="加载中…" />;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      {error && <Alert tone="bad">{error}</Alert>}

      <Card>
        <CardHeader
          title="稿件库"
          subtitle={`选题 ↔ 稿件 ↔ 图片 ↔ 发布记录 · 共 ${drafts.length} 篇`}
        />
        {drafts.length === 0 ? (
          <div className="p-4">
            <EmptyState title="暂无稿件" hint="在生成工作台产出 draft 后会自动入库。" />
          </div>
        ) : (
          <div className="divide-y divide-line">
            {drafts.map((d) => (
              <article key={d.id} className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone="brand">{d.platform}</Badge>
                    <span className="font-mono text-[11px] text-ink-3">
                      #{d.id} · {d.topicId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={d.compliance?.passed ? 'ok' : 'warn'}>
                      {d.compliance?.passed ? '合规通过' : '待复核'}
                    </Badge>
                    <Badge tone="gray">{d.status}</Badge>
                  </div>
                </div>
                {d.titles?.[0] && <div className="text-sm font-semibold">{d.titles[0]}</div>}
                <p className="line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-ink-2">
                  {d.body}
                </p>
                <div className="font-mono text-[11px] text-ink-3">
                  创建 {new Date(d.createdAt).toLocaleString('zh-CN')}
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="发布记录" subtitle="L4 分发(待接入 worker / 人工放行)" />
        {publications.length === 0 ? (
          <div className="p-4">
            <EmptyState title="暂无发布记录" hint="L4 发布能力在 M4 接入。" />
          </div>
        ) : (
          <div className="divide-y divide-line">
            {publications.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 text-sm">
                <span className="font-mono text-xs text-ink-3">
                  #{p.id} · draft #{p.draftId ?? '-'} · {p.platform}
                </span>
                <Badge tone="gray">{p.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
