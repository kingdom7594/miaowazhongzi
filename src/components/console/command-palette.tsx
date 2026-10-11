'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CornerDownLeft } from 'lucide-react';
import { withBasePath } from '@/lib/base-path';
import type { ContentTopic } from '@/lib/radar/types';
import type { DraftRecord } from '@/lib/types';

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: string;
  href: string;
}

const NAV_COMMANDS: Command[] = [
  { id: 'nav-topic', label: '选题看板', group: '页面', href: '/topic' },
  { id: 'nav-workbench', label: '生成工作台', group: '页面', href: '/workbench' },
  { id: 'nav-visual', label: '视觉工位', group: '页面', href: '/visual' },
  { id: 'nav-review', label: '审核', group: '页面', href: '/review' },
  { id: 'nav-library', label: '稿件库', group: '页面', href: '/library' },
  { id: 'nav-publish', label: '发布', group: '页面', href: '/publish' },
  { id: 'nav-settings', label: '知识库 / 设置', group: '页面', href: '/settings' },
];

/**
 * 顶栏搜索(⌘K)真实实现:导航到页面,或按标题/正文检索选题与稿件并跳转。
 * 数据来自已存在的 `/api/topics` 与 `/api/drafts`,不使用任何 mock。
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [remote, setRemote] = useState<Command[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  // 焦点管理(B5 a11y):打开时记住触发元素,关闭后归还;Tab 在面板内循环。
  useEffect(() => {
    if (open) {
      prevFocus.current = (document.activeElement as HTMLElement) ?? null;
    } else {
      prevFocus.current?.focus?.();
      prevFocus.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const root = panelRef.current;
      if (!root) return;
      const nodes = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((n) => !n.hasAttribute('disabled') && n.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCursor(0);
    inputRef.current?.focus();
    if (loaded) return;
    (async () => {
      try {
        const [tr, dr] = await Promise.all([
          fetch(withBasePath('/api/topics')),
          fetch(withBasePath('/api/drafts')),
        ]);
        const td = tr.ok ? await tr.json() : { topics: [] };
        const dd = dr.ok ? await dr.json() : { drafts: [] };
        const cmds: Command[] = [
          ...(((td.topics ?? []) as ContentTopic[]).map((t) => ({
            id: `topic-${t.id}`,
            label: t.headline,
            hint: t.id,
            group: '选题',
            href: `/workbench?topicId=${encodeURIComponent(t.id)}`,
          }))),
          ...(((dd.drafts ?? []) as DraftRecord[]).map((d) => ({
            id: `draft-${d.id}`,
            label: d.titles?.[0] ?? `稿件 #${d.id}`,
            hint: `#${d.id} · ${d.platform}`,
            group: '稿件',
            href: `/review`,
          }))),
        ];
        setRemote(cmds);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    })();
  }, [open, loaded]);

  const results = useMemo(() => {
    const all = [...NAV_COMMANDS, ...remote];
    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, 12);
    return all
      .filter((c) => c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q))
      .slice(0, 12);
  }, [query, remote]);

  const run = (cmd: Command | undefined) => {
    if (!cmd) return;
    setOpen(false);
    router.push(cmd.href);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="搜索(⌘K)"
        className="hidden h-8 items-center gap-2 rounded-sm border border-line px-2.5 text-xs text-ink-3 transition-colors hover:bg-panel-3 hover:text-ink md:inline-flex"
      >
        <Search size={14} strokeWidth={1.9} />
        <span>搜索</span>
        <kbd className="rounded border border-line px-1 font-mono text-[10px]">⌘K</kbd>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24"
      onClick={() => setOpen(false)}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="命令面板(搜索)"
        className="w-full max-w-lg overflow-hidden rounded-md border border-line bg-panel shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
          <Search size={15} strokeWidth={1.9} className="text-ink-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                run(results[cursor]);
              }
            }}
            placeholder="搜索选题 / 稿件 / 页面…"
            aria-label="搜索选题 / 稿件 / 页面"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-3"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-1">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-ink-3">无匹配结果</li>
          ) : (
            results.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => run(c)}
                  className={`flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm ${
                    i === cursor ? 'bg-brand/15 text-brand' : 'text-ink-2 hover:bg-panel-3'
                  }`}
                >
                  <span className="min-w-0 truncate">{c.label}</span>
                  <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-ink-3">
                    {c.group}
                    {c.hint ? ` · ${c.hint}` : ''}
                    {i === cursor && <CornerDownLeft size={12} />}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
