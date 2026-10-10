'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { Alert, Badge, Button, Card, CardHeader, Chip, EmptyState } from '@/components/console/ui';

interface DraftImageView {
  skill?: string;
  path?: string;
  aspect?: string;
  url?: string | null;
}

interface DraftRow {
  id: number;
  topicId: string;
  platform: string;
  titles?: string[];
  body: string;
  tags?: string[];
  images?: DraftImageView[];
  status: string;
}

const SKILLS = [
  { id: 'baoyu-cover-image', label: '封面图', hint: '单张封面 · 约 150s' },
  { id: 'baoyu-xhs-images', label: '卡片图组', hint: '小红书卡片 · 约 350s' },
] as const;

const ASPECTS = ['3:4', '1:1', '16:9'];

export default function VisualPage() {
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [draftId, setDraftId] = useState<number | ''>('');
  const [skill, setSkill] = useState<string>(SKILLS[0].id);
  const [aspect, setAspect] = useState<string>('3:4');
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadingDrafts(true);
    try {
      const res = await fetch('/api/drafts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '加载稿件失败');
      const list = (data.drafts ?? []) as DraftRow[];
      setDrafts(list);
      const q = Number(new URLSearchParams(window.location.search).get('draftId'));
      if (q && list.some((d) => d.id === q)) setDraftId(q);
      else if (list.length > 0) setDraftId(list[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载稿件失败');
    } finally {
      setLoadingDrafts(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = useMemo(
    () => drafts.find((d) => d.id === draftId) ?? null,
    [drafts, draftId],
  );

  const render = async () => {
    if (typeof draftId !== 'number') return;
    setRendering(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/drafts/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, skill, aspect }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '出图失败');
      const images = (data.images ?? []) as DraftImageView[];
      setDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? { ...d, images } : d)),
      );
      setNotice(`已出图 ${images.length} 张`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '出图失败');
    } finally {
      setRendering(false);
    }
  };

  const producing = rendering ? SKILLS.find((s) => s.id === skill) : undefined;

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert tone="bad">{error}</Alert>}
      {notice && <Alert tone="ok">{notice}</Alert>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader title="出图参数" subtitle="draft → skill-runner /render" />
          <div className="flex flex-col gap-4 p-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-ink-2">稿件</span>
              <select
                value={draftId}
                onChange={(e) => setDraftId(e.target.value ? Number(e.target.value) : '')}
                disabled={loadingDrafts}
                className="h-9 rounded-sm border border-line bg-panel-2 px-2 text-sm outline-none focus:border-brand"
              >
                {drafts.length === 0 && <option value="">(无稿件,请先在生成工作台生成)</option>}
                {drafts.map((d) => (
                  <option key={d.id} value={d.id}>
                    #{d.id} · {(d.titles?.[0] ?? d.body.slice(0, 30))}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-ink-2">技能</span>
              <div className="flex flex-wrap gap-1.5">
                {SKILLS.map((s) => (
                  <Chip key={s.id} active={skill === s.id} onClick={() => setSkill(s.id)}>
                    {s.label}
                  </Chip>
                ))}
              </div>
              <span className="text-[11px] text-ink-3">
                {SKILLS.find((s) => s.id === skill)?.hint}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-ink-2">宽高比</span>
              <div className="flex flex-wrap gap-1.5">
                {ASPECTS.map((a) => (
                  <Chip key={a} active={aspect === a} onClick={() => setAspect(a)}>
                    {a}
                  </Chip>
                ))}
              </div>
            </div>

            <Button
              variant="gen"
              onClick={render}
              disabled={rendering || typeof draftId !== 'number'}
            >
              {rendering ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
              {rendering ? '出图中…' : '触发出图'}
            </Button>
            <span className="text-[11px] text-ink-3">
              真实中转站出图较慢,请勿刷新页面(封面 ~2.5 min / 卡片 ~6 min)。
            </span>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          {rendering && (
            <EmptyState
              title={`${producing?.label ?? '出图'}中…`}
              hint="agent 技能运行时执行「分析 → 组装 prompt → 出图」,耗时较长(非 mock)。"
            />
          )}
          {!rendering && !selected && (
            <EmptyState title="暂无稿件" hint="先在「生成工作台」生成一份 draft,再回来出图。" />
          )}
          {!rendering && selected && (
            <DraftImages draft={selected} />
          )}
        </div>
      </div>
    </div>
  );
}

function DraftImages({ draft }: { draft: DraftRow }) {
  const images = draft.images ?? [];
  const title = draft.titles?.[0] ?? draft.body.slice(0, 40);
  return (
    <Card>
      <CardHeader
        title={`#${draft.id} · ${title}`}
        subtitle={`${draft.platform} · ${draft.topicId}`}
        action={<Badge tone={images.length > 0 ? 'ok' : 'gray'}>{images.length} 张图</Badge>}
      />
      <div className="p-4">
        {images.length === 0 ? (
          <EmptyState title="尚未出图" hint="选择技能后点击「触发出图」。" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img, i) => (
              <figure key={`${img.path ?? i}`} className="overflow-hidden rounded-md border border-line bg-panel-2">
                {img.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.url} alt={`${title} 图 ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
                ) : (
                  <div className="grid aspect-[3/4] place-items-center text-[11px] text-ink-3">不可预览</div>
                )}
                <figcaption className="truncate px-2 py-1 font-mono text-[10px] text-ink-3">
                  {img.skill ?? 'image'} · {img.aspect ?? '-'}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
