'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image as ImageIcon,
  Loader2,
  ExternalLink,
  Download,
  FileCode2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Alert, Badge, Button, Card, CardHeader, Chip, EmptyState, Pagehead } from '@/components/console/ui';
import { withBasePath } from '@/lib/base-path';
import { readSseText } from '@/lib/sse-client';
import { RENDER_TYPES, type RenderType } from '@/lib/image/render-types';

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

interface AdapterHealth {
  status: string;
  skills: string[];
  image?: { configured: boolean; model: string };
}

const ASPECTS = ['3:4', '1:1', '16:9'];

const STYLES = [
  { id: 'simple', label: '简约白', bg: '#f8fafc', fg: '#0f172a', accent: '#0ea5e9', sub: '#475569' },
  { id: 'warm', label: '暖阳', bg: '#fff7ed', fg: '#7c2d12', accent: '#f97316', sub: '#9a3412' },
  { id: 'gradient', label: '渐变', bg: 'linear-gradient(135deg,#6d28d9,#db2777)', fg: '#ffffff', accent: '#fde047', sub: '#f5d0fe' },
  { id: 'night', label: '暗夜', bg: '#0f172a', fg: '#e2e8f0', accent: '#22d3ee', sub: '#94a3b8' },
];

export default function VisualPage() {
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [draftId, setDraftId] = useState<number | ''>('');
  const [typeId, setTypeId] = useState<string>(RENDER_TYPES[0].id);
  const [aspect, setAspect] = useState<string>('3:4');
  const [count, setCount] = useState(4);
  const [styleId, setStyleId] = useState<string>(STYLES[0].id);
  const [candidate, setCandidate] = useState(0);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [adapter, setAdapter] = useState<AdapterHealth | null>(null);
  const [adapterError, setAdapterError] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [htmlBusy, setHtmlBusy] = useState(false);

  const type: RenderType = useMemo(
    () => RENDER_TYPES.find((t) => t.id === typeId) ?? RENDER_TYPES[0],
    [typeId],
  );

  const load = useCallback(async () => {
    setLoadingDrafts(true);
    try {
      const res = await fetch(withBasePath('/api/drafts'));
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

  const loadAdapter = useCallback(async () => {
    try {
      const res = await fetch(withBasePath('/api/renderers'));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '适配器不可达');
      setAdapter(data as AdapterHealth);
      setAdapterError(null);
    } catch (err) {
      setAdapter(null);
      setAdapterError(err instanceof Error ? err.message : '适配器不可达');
    }
  }, []);

  useEffect(() => {
    load();
    loadAdapter();
  }, [load, loadAdapter]);

  const selected = useMemo(() => drafts.find((d) => d.id === draftId) ?? null, [drafts, draftId]);

  const images = useMemo(
    () => (selected?.images ?? []).filter((img) => img.skill === type.skill),
    [selected, type.skill],
  );
  const titles = selected?.titles ?? [];
  const candidateList: Array<{ key: string; kind: 'image' | 'title'; img?: DraftImageView; title?: string }> =
    images.length > 0
      ? images.map((img, i) => ({ key: `img-${i}`, kind: 'image', img }))
      : titles.map((t, i) => ({ key: `t-${i}`, kind: 'title', title: t }));

  useEffect(() => {
    setCandidate(0);
    setHtml(null);
  }, [draftId, typeId]);

  const activeImage = images[candidate] ?? null;
  const activeTitle = titles[candidate] ?? titles[0] ?? '';
  const style = STYLES.find((s) => s.id === styleId) ?? STYLES[0];

  const online = adapter?.skills?.includes(type.skill) ?? false;

  const render = async () => {
    if (typeof draftId !== 'number') return;
    setRendering(true);
    setError(null);
    setNotice(null);
    setHtml(null);
    try {
      const res = await fetch(withBasePath('/api/drafts/render'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId,
          skill: type.skill,
          aspect,
          ...(type.multi ? { count } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '出图失败');
      const nextImages = (data.images ?? []) as DraftImageView[];
      setDrafts((prev) => prev.map((d) => (d.id === draftId ? { ...d, images: nextImages } : d)));
      setNotice(`已出图 ${nextImages.filter((i) => i.skill === type.skill).length} 张(${type.label})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '出图失败');
    } finally {
      setRendering(false);
    }
  };

  const renderInfographicHtml = async () => {
    if (!selected) return;
    setHtmlBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(withBasePath('/api/infographic'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: selected.body, title: activeTitle }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? '信息图生成失败');
      }
      const text = await readSseText(res);
      if (!text.trim()) throw new Error('信息图返回为空');
      setHtml(text);
      setNotice('已生成信息图 HTML(可预览 / 下载)');
    } catch (err) {
      setError(err instanceof Error ? err.message : '信息图生成失败');
    } finally {
      setHtmlBusy(false);
    }
  };

  const downloadHtml = () => {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `infographic-${selected?.id ?? 'draft'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <Pagehead
        title="视觉工位"
        desc="draft → L3 适配器(skill-runner)出图:分析 → 组装 prompt → 出图,耗时较长(非 mock)。"
        actions={
          adapter ? (
            <>
              <Badge tone="ok">适配器在线</Badge>
              {adapter.image?.model && <Badge tone="gray">{adapter.image.model}</Badge>}
            </>
          ) : (
            <Badge tone={adapterError ? 'bad' : 'gray'}>{adapterError ? '适配器不可达' : '适配器检测中…'}</Badge>
          )
        }
      />

      {error && <Alert tone="bad">{error}</Alert>}
      {notice && <Alert tone="ok">{notice}</Alert>}
      {adapterError && (
        <Alert tone="warn">
          <AlertTriangle size={13} className="mr-1 inline" />
          skill-runner 不可达:{adapterError}。出图按钮已禁用(上游恢复后重试)。
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        {/* 左:待出图列表 + 出图类型 */}
        <Card className="h-fit">
          <CardHeader title="待出图" subtitle={`${drafts.length} 篇 draft`} />
          <div className="max-h-[520px] overflow-y-auto p-2">
            {loadingDrafts ? (
              <div className="px-2 py-6 text-center text-xs text-ink-3">加载中…</div>
            ) : drafts.length === 0 ? (
              <div className="px-2 py-6 text-center text-xs text-ink-3">暂无稿件,先去生成工作台。</div>
            ) : (
              drafts.map((d) => {
                const active = d.id === draftId;
                const hasImg = (d.images ?? []).length > 0;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDraftId(d.id)}
                    className={`mb-1 flex w-full items-start justify-between gap-2 rounded-sm px-2 py-2 text-left text-xs transition-colors ${
                      active ? 'bg-brand/15 text-brand' : 'text-ink-2 hover:bg-panel-3 hover:text-ink'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="line-clamp-2">{d.titles?.[0] ?? d.body.slice(0, 40)}</span>
                      <span className="mt-0.5 block font-mono text-[10px] text-ink-3">
                        #{d.id} · {d.platform}
                      </span>
                    </span>
                    {hasImg && <ImageIcon size={13} className="mt-0.5 shrink-0 text-ok" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-line p-3">
            <div className="mb-1.5 text-xs text-ink-2">出图类型(5 类)</div>
            <div className="flex flex-wrap gap-1.5">
              {RENDER_TYPES.map((t) => {
                const tOnline = adapter?.skills?.includes(t.skill) ?? false;
                return (
                  <Chip
                    key={t.id}
                    active={typeId === t.id}
                    dim={adapter ? !tOnline : false}
                    onClick={() => setTypeId(t.id)}
                  >
                    {t.label}
                    {adapter && !tOnline ? ' ·未上线' : ''}
                  </Chip>
                );
              })}
            </div>
            <div className="mt-1.5 text-[11px] text-ink-3">{type.hint}</div>
          </div>
        </Card>

        {/* 中:预览画布 */}
        <Card className="flex min-w-0 flex-col">
          <CardHeader
            title="预览画布"
            subtitle={selected ? `#${selected.id} · ${selected.platform} · ${selected.topicId}` : '未选择稿件'}
            action={
              activeImage?.url ? (
                <a
                  href={activeImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
                >
                  <ExternalLink size={13} /> 查看原图
                </a>
              ) : null
            }
          />
          <div className="flex flex-1 flex-col items-center gap-3 p-4">
            {!selected ? (
              <EmptyState title="暂无稿件" hint="先在「生成工作台」生成一份 draft。" />
            ) : html ? (
              <div className="w-full">
                <iframe
                  title="信息图预览"
                  srcDoc={html}
                  sandbox="allow-same-origin"
                  className="h-[560px] w-full rounded-md border border-line bg-white"
                />
              </div>
            ) : activeImage?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeImage.url}
                alt={activeTitle || `draft ${selected.id}`}
                className="max-h-[560px] w-auto rounded-md border border-line object-contain"
              />
            ) : (
              <PreviewCard title={activeTitle} body={selected.body} tags={selected.tags} style={style} />
            )}

            {!html && candidateList.length > 0 && (
              <div className="w-full">
                <div className="mb-1.5 text-[11px] text-ink-3">
                  {candidateList[0].kind === 'image' ? '候选图切换' : '标题备选(候选)'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {candidateList.map((c, i) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCandidate(i)}
                      className={`h-20 w-16 overflow-hidden rounded-sm border text-left ${
                        candidate === i ? 'border-brand ring-1 ring-brand/40' : 'border-line hover:border-line-2'
                      }`}
                      aria-label={`候选 ${i + 1}`}
                    >
                      {c.kind === 'image' && c.img?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.img.url} alt={`候选 ${i + 1}`} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full flex-col justify-between p-1.5">
                          <span className="line-clamp-4 text-[10px] leading-tight text-ink-2">
                            {c.title}
                          </span>
                          <span className="font-mono text-[9px] text-ink-3">A{i + 1}</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!selected && rendering && (
              <EmptyState title={`${type.label}出图中…`} hint="agent 技能运行时执行,请勿刷新。" />
            )}
          </div>
        </Card>

        {/* 右:风格 / 参数 / 生成 / 导出 */}
        <Card className="h-fit">
          <CardHeader title="风格 · 参数" subtitle={type.label} />
          <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-ink-2">风格模板</span>
              <div className="grid grid-cols-2 gap-1.5">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStyleId(s.id)}
                    className={`flex items-center gap-2 rounded-sm border px-2 py-1.5 text-xs ${
                      styleId === s.id ? 'border-brand text-brand' : 'border-line text-ink-2 hover:border-line-2'
                    }`}
                  >
                    <span className="h-4 w-4 rounded-sm border border-line" style={{ background: s.bg }} />
                    {s.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-ink-3">仅影响本地预览,出图设计语言由技能决定。</span>
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

            {type.multi && (
              <label className="flex items-center justify-between gap-2 text-xs text-ink-2">
                张数
                <input
                  type="number"
                  min={1}
                  max={9}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(9, Number(e.target.value) || 1)))}
                  className="h-8 w-16 rounded-sm border border-line bg-panel-2 px-2 text-sm outline-none focus:border-brand"
                />
              </label>
            )}

            <Button variant="gen" onClick={render} disabled={rendering || typeof draftId !== 'number' || !online}>
              {rendering ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
              {rendering ? '出图中…' : online ? `生成${type.label}` : `${type.label} · 未上线`}
            </Button>

            {type.id === 'infographic' && (
              <Button variant="ghost" onClick={renderInfographicHtml} disabled={htmlBusy || !selected}>
                {htmlBusy ? <Loader2 size={15} className="animate-spin" /> : <FileCode2 size={15} />}
                {htmlBusy ? '生成中…' : '信息图 HTML 版'}
              </Button>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-ink-2">导出</span>
              {html ? (
                <Button variant="ghost" onClick={downloadHtml}>
                  <Download size={15} /> 下载信息图 HTML
                </Button>
              ) : activeImage?.url ? (
                <a
                  href={activeImage.url}
                  download
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-sm border border-line px-3.5 text-sm font-medium text-ink-2 hover:bg-panel-3 hover:text-ink"
                >
                  <Download size={15} /> 下载当前图
                </a>
              ) : (
                <span className="text-[11px] text-ink-3">出图后可下载产物。</span>
              )}
            </div>

            <span className="text-[11px] text-ink-3">
              真实出图较慢,请勿刷新(封面 ~2.5 min / 卡片 ~6 min)。
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PreviewCard({
  title,
  body,
  tags,
  style,
}: {
  title: string;
  body: string;
  tags?: string[];
  style: { bg: string; fg: string; accent: string; sub: string };
}) {
  return (
    <div
      className="flex aspect-[3/4] w-full max-w-[360px] flex-col justify-between rounded-xl border border-line p-6 shadow-sm"
      style={{ background: style.bg, color: style.fg }}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: style.accent, color: style.bg }}>
          卡片预览
        </span>
        <span className="font-mono text-[10px]" style={{ color: style.sub }}>
          3:4
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <div className="text-xl font-black leading-snug">{title || '(无标题)'}</div>
        <div className="line-clamp-6 text-xs leading-relaxed" style={{ color: style.sub }}>
          {body}
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {(tags ?? []).slice(0, 4).map((t, i) => (
          <span key={i} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: style.accent, color: style.bg }}>
            {t}
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-0.5 text-[10px]" style={{ color: style.sub }}>
          <Check size={10} /> 本地预览
        </span>
      </div>
    </div>
  );
}
