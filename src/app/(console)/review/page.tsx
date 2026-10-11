'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Loader2, RotateCw, ShieldCheck, X } from 'lucide-react';
import { Alert, Badge, Button, Card, CardHeader, Chip, EmptyState, Pagehead } from '@/components/console/ui';
import { HighlightedBody, highlightTerms } from '@/components/console/highlight';
import { useToast } from '@/components/console/toast';
import { withBasePath } from '@/lib/base-path';
import { RUBRIC_LABELS, RUBRIC_DIMS } from '@/lib/eval/rubric';
import type { DraftRecord, DraftScores } from '@/lib/types';
import {
  DRAFT_STATUS_LABELS,
  canTransitionDraftStatus,
  type DraftStatus,
} from '@/lib/review/status';

type DraftRow = DraftRecord;

type Tone = 'gray' | 'ok' | 'warn' | 'bad' | 'info' | 'brand';

const STATUS_TONE: Record<DraftStatus, Tone> = {
  draft: 'gray',
  in_review: 'info',
  approved: 'ok',
  rejected: 'bad',
  published: 'brand',
};

const SCORE_DIMS = ['hook', 'audienceFit', 'evidence', 'platformFit', 'originality'] as const;
const SCORE_LABELS: Record<(typeof SCORE_DIMS)[number], string> = {
  hook: RUBRIC_LABELS.hook,
  audienceFit: RUBRIC_LABELS.audienceFit,
  evidence: RUBRIC_LABELS.evidence,
  platformFit: RUBRIC_LABELS.platformFit,
  originality: RUBRIC_LABELS.originality,
};

function scoreTotal(scores?: DraftScores): number | null {
  if (!scores) return null;
  const values = SCORE_DIMS.map((d) => scores[d]).filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function ScoreRing({ value }: { value: number | null }) {
  const pct = value === null ? 0 : Math.min(1, Math.max(0, value / 5));
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-20 w-20 shrink-0 place-items-center">
      <svg viewBox="0 0 72 72" className="h-20 w-20 -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="6" className="stroke-panel-3" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="stroke-brand transition-[stroke-dashoffset]"
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-mono text-lg font-bold leading-none">
          {value === null ? '—' : value.toFixed(1)}
        </div>
        <div className="text-[10px] text-ink-3">/ 5</div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const toast = useToast();
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<DraftStatus | 'all'>('all');
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<null | 'evaluate' | 'act'>(null);
  const [editMode, setEditMode] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [titleIdx, setTitleIdx] = useState(0);
  const [confirmReject, setConfirmReject] = useState(false);
  const [confirmBatch, setConfirmBatch] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(withBasePath('/api/drafts'));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '加载稿件失败');
      const list = (data.drafts ?? []) as DraftRow[];
      setDrafts(list);
      setError(null);
      setSelectedId((prev) => (prev && list.some((d) => d.id === prev) ? prev : list[0]?.id ?? null));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载稿件失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = useMemo(() => drafts.find((d) => d.id === selectedId) ?? null, [drafts, selectedId]);
  const filtered = useMemo(
    () => (statusFilter === 'all' ? drafts : drafts.filter((d) => d.status === statusFilter)),
    [drafts, statusFilter],
  );

  // 选中稿件切换时,重置编辑态。
  useEffect(() => {
    setEditMode(false);
    setConfirmReject(false);
    setTitleIdx(0);
    if (selected) setEditBody(selected.body);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const patchDraft = useCallback(
    async (id: number, payload: { status?: DraftStatus; body?: string; titles?: string[] }) => {
      const res = await fetch(withBasePath(`/api/drafts/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '处置失败');
      const updated = data.draft as DraftRow;
      setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
      return updated;
    },
    [],
  );

  const evaluate = async () => {
    if (!selected) return;
    setBusy('evaluate');
    setError(null);
    try {
      const res = await fetch(withBasePath('/api/drafts/evaluate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '评估失败');
      const evaluated = data.draft as DraftRow;
      setDrafts((prev) => prev.map((d) => (d.id === selected.id ? { ...d, ...evaluated } : d)));
      toast.push('已完成规则 + judge 双闸门评估', 'ok');
    } catch (err) {
      const message = err instanceof Error ? err.message : '评估失败';
      setError(message);
      toast.push(message, 'bad');
    } finally {
      setBusy(null);
    }
  };

  const act = async (status: DraftStatus, extra?: { body?: string; titles?: string[] }, label?: string) => {
    if (!selected) return;
    if (!canTransitionDraftStatus(selected.status, status)) {
      toast.push(`非法状态流转:${DRAFT_STATUS_LABELS[selected.status]} → ${DRAFT_STATUS_LABELS[status]}`, 'warn');
      return;
    }
    setBusy('act');
    try {
      await patchDraft(selected.id, { status, ...extra });
      setEditMode(false);
      setConfirmReject(false);
      toast.push(label ?? `已${DRAFT_STATUS_LABELS[status]}`, 'ok');
    } catch (err) {
      toast.push(err instanceof Error ? err.message : '处置失败', 'bad');
    } finally {
      setBusy(null);
    }
  };

  const batchRelease = async () => {
    const targets = filtered.filter(
      (d) => checked.has(d.id) && canTransitionDraftStatus(d.status, 'approved'),
    );
    setConfirmBatch(false);
    if (targets.length === 0) {
      toast.push('所选稿件中没有可放行的条目', 'warn');
      return;
    }
    setBusy('act');
    let ok = 0;
    const failed: string[] = [];
    for (const d of targets) {
      try {
        await patchDraft(d.id, { status: 'approved' });
        ok += 1;
      } catch (err) {
        failed.push(`#${d.id} ${err instanceof Error ? err.message : '失败'}`);
      }
    }
    setChecked(new Set());
    if (failed.length === 0) toast.push(`已批量放行 ${ok} 篇`, 'ok');
    else toast.push(`放行 ${ok} 篇,失败 ${failed.length} 篇:${failed.join(';')}`, 'warn');
    setBusy(null);
  };

  const toggleChecked = (id: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const terms = highlightTerms(selected?.compliance?.risks);
  const ruleRisks = selected?.compliance?.risks.filter((r) => !r.startsWith('[judge]')) ?? [];
  const judgeRisks = selected?.compliance?.risks.filter((r) => r.startsWith('[judge]')) ?? [];
  const total = scoreTotal(selected?.scores);
  const checkedEligible = filtered.filter(
    (d) => checked.has(d.id) && canTransitionDraftStatus(d.status, 'approved'),
  );

  return (
    <div className="flex flex-col gap-4">
      <Pagehead
        title="审核"
        desc="合规闸门(规则 + LLM judge)+ 质量评分;通过 / 打回写回 drafts.status,全流程人工放行。"
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_300px]">
      {/* 左:审核队列 */}
      <Card className="flex h-fit flex-col">
        <CardHeader title="审核队列" subtitle={`共 ${drafts.length} 篇`} />
        <div className="flex flex-wrap gap-1.5 border-b border-line p-3">
          <Chip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
            全部
          </Chip>
          {(['draft', 'in_review', 'approved', 'rejected'] as DraftStatus[]).map((s) => (
            <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {DRAFT_STATUS_LABELS[s]}
            </Chip>
          ))}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-ink-3">加载中…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState title="队列为空" hint="在生成工作台产出 draft 后进入审核。" />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {filtered.map((d) => {
                const t = scoreTotal(d.scores);
                const active = d.id === selectedId;
                const canRelease = canTransitionDraftStatus(d.status, 'approved');
                return (
                  <li key={d.id} className={active ? 'bg-brand/10' : undefined}>
                    <div className="flex items-start gap-2 p-3">
                      <input
                        type="checkbox"
                        aria-label={`选择稿件 #${d.id}`}
                        checked={checked.has(d.id)}
                        disabled={!canRelease}
                        onChange={() => toggleChecked(d.id)}
                        className="mt-1 h-3.5 w-3.5 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedId(d.id)}
                        className="flex min-w-0 flex-1 flex-col gap-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                      >
                        <div className="flex items-center gap-2">
                          <Badge tone="brand">{d.platform}</Badge>
                          <span className="font-mono text-[11px] text-ink-3">#{d.id}</span>
                          <span className="ml-auto">
                            <Badge tone={STATUS_TONE[d.status] ?? 'gray'}>
                              {DRAFT_STATUS_LABELS[d.status] ?? d.status}
                            </Badge>
                          </span>
                        </div>
                        <div className="line-clamp-2 text-xs text-ink-2">
                          {d.titles?.[0] ?? d.body.slice(0, 40)}
                        </div>
                        <div className="font-mono text-[11px] text-ink-3">
                          质量 {t === null ? '—' : t.toFixed(1)} · {d.compliance ? (d.compliance.passed ? '合规通过' : '命中风险') : '未评估'}
                        </div>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border-t border-line p-3">
          {confirmBatch ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-ink-2">确认放行已选 {checkedEligible.length} 篇?</span>
              <div className="flex gap-2">
                <Button variant="ok" onClick={batchRelease} disabled={busy !== null}>
                  确认放行
                </Button>
                <Button variant="ghost" onClick={() => setConfirmBatch(false)}>
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full"
              disabled={checkedEligible.length === 0 || busy !== null}
              onClick={() => setConfirmBatch(true)}
            >
              <Check size={15} /> 批量放行{checkedEligible.length > 0 ? ` ${checkedEligible.length} 篇` : ''}
            </Button>
          )}
        </div>
      </Card>

      {/* 中:稿件详情 */}
      <div className="flex min-w-0 flex-col gap-4">
        {error && <Alert tone="bad">{error}</Alert>}
        {!selected ? (
          <EmptyState title="未选择稿件" hint="从左侧队列选择一篇进入审核。" />
        ) : (
          <Card>
            <CardHeader
              title="稿件详情"
              subtitle={`#${selected.id} · ${selected.topicId}`}
              action={
                <div className="flex items-center gap-2">
                  <Badge tone="brand">{selected.platform}</Badge>
                  <Badge tone={STATUS_TONE[selected.status] ?? 'gray'}>
                    {DRAFT_STATUS_LABELS[selected.status] ?? selected.status}
                  </Badge>
                </div>
              }
            />
            <div className="flex flex-col gap-4 p-4">
              <div className="flex flex-col gap-1.5">
                <div className="text-xs text-ink-2">标题备选(选中的用于「编辑后通过」)</div>
                {(selected.titles ?? []).length === 0 ? (
                  <div className="text-sm text-ink-3">无标题备选</div>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {(selected.titles ?? []).map((t, i) => (
                      <li key={i}>
                        <label className="flex cursor-pointer items-start gap-2 rounded-sm border border-line px-2.5 py-1.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/10">
                          <input
                            type="radio"
                            name="title-opt"
                            checked={titleIdx === i}
                            onChange={() => setTitleIdx(i)}
                            className="mt-1 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                          />
                          <span>{t}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-2">正文{terms.length > 0 ? '(风险词已高亮)' : ''}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode((v) => !v);
                      setEditBody(selected.body);
                    }}
                    className="text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                  >
                    {editMode ? '取消编辑' : '编辑正文'}
                  </button>
                </div>
                {editMode ? (
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={12}
                    className="w-full rounded-sm border border-line bg-panel-2 p-2 text-sm leading-relaxed outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/50"
                  />
                ) : (
                  <div className="rounded-sm border border-line bg-panel-2 p-3">
                    <HighlightedBody body={selected.body} terms={terms} />
                  </div>
                )}
              </div>

              <div
                className={`rounded-md px-3 py-2 text-xs ${
                  selected.compliance
                    ? selected.compliance.passed
                      ? 'bg-ok/15 text-ok'
                      : 'bg-bad/15 text-bad'
                    : 'bg-panel-3 text-ink-2'
                }`}
              >
                {selected.compliance
                  ? `${selected.compliance.passed ? '合规通过' : '命中风险'} · ${selected.compliance.checkedBy ?? '规则 + judge'}`
                  : '尚未评估:点击右侧「运行双闸门」'}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* 右:闸门 + 评分 + 操作 */}
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="合规闸门" subtitle="规则 + 独立 LLM judge" />
          <div className="flex flex-col gap-3 p-4">
            {!selected?.compliance ? (
              <div className="text-xs text-ink-3">未评估</div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <ShieldCheck size={14} /> 规则闸门
                    <span className="ml-auto font-mono text-ink-3">
                      {ruleRisks.length === 0 ? '通过' : `${ruleRisks.length} 项`}
                    </span>
                  </div>
                  {ruleRisks.length === 0 ? (
                    <div className="text-xs text-ok">无命中</div>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {ruleRisks.map((r, i) => (
                        <li key={i} className="rounded-sm bg-bad/10 px-2 py-1 text-xs text-bad">
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 border-t border-line pt-3">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <ShieldCheck size={14} /> judge 闸门
                    <span className="ml-auto font-mono text-ink-3">{selected.compliance.checkedBy ?? 'judge'}</span>
                  </div>
                  {judgeRisks.length === 0 ? (
                    <div className="text-xs text-ok">judge 无异议</div>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {judgeRisks.map((r, i) => (
                        <li key={i} className="rounded-sm bg-warn/10 px-2 py-1 text-xs text-warn">
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
            <Button variant="ghost" onClick={evaluate} disabled={!selected || busy !== null}>
              {busy === 'evaluate' ? <Loader2 size={15} className="animate-spin" /> : <RotateCw size={15} />}
              {busy === 'evaluate' ? '评估中…' : selected?.compliance ? '重新评估' : '运行双闸门'}
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="质量评分" subtitle="1–5 分 / 维" />
          <div className="flex items-center gap-4 p-4">
            <ScoreRing value={total} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {RUBRIC_DIMS.map((dim) => {
                const v = selected?.scores?.[dim];
                return (
                  <div key={dim} className="flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0 text-ink-2">{SCORE_LABELS[dim] ?? dim}</span>
                    <div className="h-1.5 flex-1 rounded-full bg-panel-3">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${v ? (v / 5) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right font-mono text-ink-3">{v ?? '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="处置" subtitle="写回 drafts.status" />
          <div className="flex flex-col gap-2 p-4">
            {selected && editMode ? (
              <Button
                variant="primary"
                disabled={busy !== null || editBody.trim().length === 0}
                onClick={() => {
                  const titles = selected.titles ?? [];
                  const reordered =
                    titles.length > 0
                      ? [titles[titleIdx], ...titles.filter((_, i) => i !== titleIdx)]
                      : undefined;
                  act('approved', { body: editBody, ...(reordered ? { titles: reordered } : {}) }, '已编辑并通过');
                }}
              >
                {busy === 'act' ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                保存并放行
              </Button>
            ) : (
              <Button variant="ok" disabled={!selected || busy !== null || !canTransitionDraftStatus(selected.status, 'approved')} onClick={() => act('approved')}>
                <Check size={15} /> 通过
              </Button>
            )}
            <Button
              variant="ghost"
              disabled={!selected || busy !== null || !canTransitionDraftStatus(selected.status, 'in_review')}
              onClick={() => act('in_review', undefined, '已送入审核')}
            >
              提交审核
            </Button>
            {confirmReject ? (
              <div className="flex items-center gap-2">
                <Button variant="danger" disabled={busy !== null} onClick={() => act('rejected')}>
                  确认打回
                </Button>
                <Button variant="ghost" onClick={() => setConfirmReject(false)}>
                  取消
                </Button>
              </div>
            ) : (
              <Button
                variant="danger"
                disabled={!selected || busy !== null || !canTransitionDraftStatus(selected.status, 'rejected')}
                onClick={() => setConfirmReject(true)}
              >
                <X size={15} /> 打回
              </Button>
            )}
          </div>
        </Card>
      </div>
      </div>
    </div>
  );
}
