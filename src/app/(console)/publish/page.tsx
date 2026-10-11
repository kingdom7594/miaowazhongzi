'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Share2, Hash, Info } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Alert, Pagehead } from '@/components/console/ui';
import { withBasePath } from '@/lib/base-path';
import type { PublicationRecord } from '@/lib/types';

const PLATFORM_CARDS = [
  {
    id: 'wechat',
    name: '公众号',
    icon: MessageSquare,
    desc: '微信公众号原生 API 发布,人工放行。',
  },
  {
    id: 'weibo',
    name: '微博',
    icon: Share2,
    desc: '微博通过外置 worker(Chrome 类)发布,人工放行。',
  },
  {
    id: 'x',
    name: 'X',
    icon: Hash,
    desc: 'X / Twitter 经外置 worker 发布,人工放行。',
  },
];

export default function PublishPage() {
  const [publications, setPublications] = useState<PublicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(withBasePath('/api/drafts'));
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? '加载发布记录失败');
        setPublications((data.publications ?? []) as PublicationRecord[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载发布记录失败');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <Pagehead
        title={
          <span className="inline-flex items-center gap-2">
            发布
            <Badge tone="gray">MVP 占位</Badge>
          </span>
        }
        desc="分发层(低优先):小红书人工发布为主;公众号 / 微博 / X 走 worker,全流程人工放行,不做无人值守自动发布。"
      />

      {error && <Alert tone="bad">{error}</Alert>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {PLATFORM_CARDS.map(({ id, name, icon: Icon, desc }) => (
          <Card key={id} className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-panel-3 text-ink-2">
                <Icon size={17} strokeWidth={1.9} />
              </span>
              <span className="font-semibold">{name}</span>
            </div>
            <p className="flex-1 text-xs leading-relaxed text-ink-2">{desc}</p>
            <Button variant="ghost" disabled>
              即将支持
            </Button>
          </Card>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-md border border-line bg-panel-2 px-4 py-3 text-xs text-ink-2">
        <Info size={15} strokeWidth={1.9} className="mt-0.5 shrink-0 text-ink-3" />
        <span>
          发布记录写入 <span className="font-mono">publications</span>(draft_id / platform / status / result);
          小红书以人工发布为主,worker 能力在 M4 接入。
        </span>
      </div>

      <Card>
        <CardHeader title="发布记录" subtitle="L4 分发(待接入 worker / 人工放行)" />
        {loading ? (
          <div className="p-4">
            <EmptyState title="加载中…" />
          </div>
        ) : publications.length === 0 ? (
          <div className="p-4">
            <EmptyState title="暂无发布记录" hint="L4 发布能力在 M4 接入。" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-3">
                  <th className="px-3 py-2 font-medium">记录</th>
                  <th className="px-3 py-2 font-medium">稿件</th>
                  <th className="px-3 py-2 font-medium">平台</th>
                  <th className="px-3 py-2 font-medium">状态</th>
                  <th className="px-3 py-2 font-medium">创建</th>
                </tr>
              </thead>
              <tbody>
                {publications.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-ink-3">#{p.id}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-ink-2">
                      {p.draftId === null ? '—' : `#${p.draftId}`}
                    </td>
                    <td className="px-3 py-2.5">{p.platform}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone="gray">{p.status}</Badge>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-ink-3">
                      {new Date(p.createdAt).toLocaleString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
