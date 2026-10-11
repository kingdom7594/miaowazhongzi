'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BASE_PATH, withBasePath } from '@/lib/base-path';
import { ThemeToggle } from './theme-toggle';
import { CommandPalette } from './command-palette';
import {
  activeStage,
  computePipelineCounts,
  countDraftsToday,
  dailyQuotaTarget,
  type PipelineCounts,
} from '@/lib/console/shell-data';
import type { ContentTopic } from '@/lib/radar/types';
import type { DraftRecord } from '@/lib/types';
import {
  Radar,
  Sparkles,
  Image as ImageIcon,
  ShieldCheck,
  Library,
  Send,
  Settings,
  FlaskConical,
  RefreshCw,
  Bell,
  Menu,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: '流水线',
    items: [
      { href: '/topic', label: '选题看板', icon: Radar },
      { href: '/workbench', label: '生成工作台', icon: Sparkles },
      { href: '/visual', label: '视觉工位', icon: ImageIcon },
      { href: '/review', label: '审核', icon: ShieldCheck },
      { href: '/library', label: '稿件库', icon: Library },
      { href: '/publish', label: '发布', icon: Send },
    ],
  },
  {
    label: '系统',
    items: [{ href: '/settings', label: '知识库 / 设置', icon: Settings }],
  },
];

const PAGE_SUBTITLES: Record<string, string> = {
  '/topic': '雷达选题 → 生产队列',
  '/workbench': '选题 → 多平台 draft',
  '/visual': 'draft → 出图 / 适配器',
  '/review': '合规闸门 + 质量评分',
  '/library': '稿件 / 图片 / 发布记录',
  '/publish': 'L4 分发(MVP 占位)',
  '/settings': '知识库 · 模型 · 依赖',
};

const STAGE_ICONS: LucideIcon[] = [Radar, Sparkles, ImageIcon, ShieldCheck, Send];

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const rawPathname = usePathname();
  const pathname = BASE_PATH && rawPathname.startsWith(BASE_PATH)
    ? rawPathname.slice(BASE_PATH.length) || '/'
    : rawPathname;

  const activeNav = NAV_GROUPS.flatMap((g) => g.items).find((n) => pathname.startsWith(n.href));
  const currentStage = activeStage(pathname);
  const subtitle = PAGE_SUBTITLES[activeNav?.href ?? ''] ?? '内容工厂控制台';

  const [topics, setTopics] = useState<ContentTopic[]>([]);
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  /** F-07:B4 起移动端(<lg)侧栏为抽屉;桌面端常驻。 */
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    (async () => {
      try {
        const [tr, dr] = await Promise.all([
          fetch(withBasePath('/api/topics')),
          fetch(withBasePath('/api/drafts')),
        ]);
        if (tr.ok) setTopics(((await tr.json()).topics ?? []) as ContentTopic[]);
        if (dr.ok) setDrafts(((await dr.json()).drafts ?? []) as DraftRecord[]);
      } catch {
        /* 侧栏统计失败不阻塞页面;页面自身会各自报错。 */
      }
    })();
  }, []);

  const counts = useMemo(() => computePipelineCounts(topics, drafts), [topics, drafts]);
  const today = useMemo(() => countDraftsToday(drafts), [drafts]);
  const quota = dailyQuotaTarget();
  const stageCounts = [counts.topic, counts.produce, counts.visual, counts.review, counts.publish];

  return (
    <div className="flex min-h-screen bg-app text-ink">
      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[250px] shrink-0 flex-col border-r border-line bg-panel transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 py-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand to-violet text-white">
            <FlaskConical size={18} strokeWidth={1.9} />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold">内容工厂</div>
            <div className="font-mono text-[10px] tracking-wide text-ink-3">CONTENT FACTORY</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                {group.label}
              </div>
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setNavOpen(false)}
                    className={`flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors ${
                      isActive ? 'bg-brand/15 text-brand' : 'text-ink-2 hover:bg-panel-3 hover:text-ink'
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.9} />
                    {label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-line px-4 py-3">
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="text-ink-2">今日产出</span>
            <span className="font-mono text-ink-3">
              {today}/{quota}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-panel-3">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.min(100, quota > 0 ? (today / quota) * 100 : 0)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 border-t border-line px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-panel-3 text-xs font-semibold text-ink-2">
            OPC
          </span>
          <div className="leading-tight">
            <div className="text-xs font-medium">OPC 主理人</div>
            <div className="font-mono text-[10px] text-ink-3">L2 生产 · SQLite</div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[60px] shrink-0 items-center justify-between gap-2 border-b border-line bg-panel/60 px-4 backdrop-blur sm:gap-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="打开导航"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-sm border border-line text-ink-2 transition-colors hover:bg-panel-3 hover:text-ink lg:hidden"
            >
              <Menu size={16} strokeWidth={1.9} />
            </button>
            <span className="hidden h-2 w-2 shrink-0 rounded-full bg-ok sm:block" aria-hidden />
            <div className="flex min-w-0 items-baseline gap-2">
              <h1 className="truncate text-base font-bold">{activeNav?.label ?? '内容工厂控制台'}</h1>
              <span className="hidden truncate text-xs text-ink-3 sm:inline">{subtitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <PipelineStepper currentStage={currentStage} counts={stageCounts} />
            <CommandPalette />
            <button
              type="button"
              onClick={() => window.location.reload()}
              aria-label="刷新页面"
              title="刷新"
              className="grid h-8 w-8 place-items-center rounded-sm border border-line text-ink-2 transition-colors hover:bg-panel-3 hover:text-ink"
            >
              <RefreshCw size={15} strokeWidth={1.9} />
            </button>
            <NotificationMenu counts={counts} />
            <ThemeToggle />
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function PipelineStepper({ currentStage, counts }: { currentStage: number; counts: number[] }) {
  const stages = ['选题', '生成', '视觉', '审核', '发布'];
  return (
    <ol className="hidden items-center gap-1 rounded-full border border-line px-1.5 py-1 xl:flex">
      {stages.map((label, i) => {
        const stage = i + 1;
        const on = currentStage === stage;
        const Icon = STAGE_ICONS[i];
        return (
          <li key={label} className="flex items-center">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] ${
                on ? 'bg-brand text-white' : currentStage > stage ? 'text-ink-2' : 'text-ink-3'
              }`}
            >
              <Icon size={12} strokeWidth={1.9} />
              {label}
              {counts[i] > 0 && (
                <span
                  className={`rounded-full px-1 text-[10px] ${
                    on ? 'bg-white/25' : 'bg-panel-3 text-ink-3'
                  }`}
                >
                  {counts[i]}
                </span>
              )}
            </span>
            {i < stages.length - 1 && (
              <ChevronRight size={12} strokeWidth={1.9} className="px-0.5 text-ink-3" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function NotificationMenu({ counts }: { counts: PipelineCounts }) {
  const [open, setOpen] = useState(false);
  const pending = [
    { label: '待出图', value: counts.visual, href: '/visual' },
    { label: '待审核', value: counts.review, href: '/review' },
    { label: '待发布', value: counts.publish, href: '/publish' },
  ];
  const total = pending.reduce((a, b) => a + b.value, 0);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="待办通知"
        title="待办"
        className="relative grid h-8 w-8 place-items-center rounded-sm border border-line text-ink-2 transition-colors hover:bg-panel-3 hover:text-ink"
      >
        <Bell size={15} strokeWidth={1.9} />
        {total > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-bad px-1 font-mono text-[10px] text-white">
            {total}
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 top-10 z-40 w-56 rounded-md border border-line bg-panel p-1 shadow-xl"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
            待办
          </div>
          {total === 0 ? (
            <div className="px-3 py-3 text-xs text-ink-3">暂无待办</div>
          ) : (
            pending
              .filter((p) => p.value > 0)
              .map((p) => (
                <Link
                  key={p.label}
                  href={p.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-sm px-3 py-2 text-sm text-ink-2 hover:bg-panel-3 hover:text-ink"
                >
                  {p.label}
                  <span className="font-mono text-[11px] text-ink-3">{p.value}</span>
                </Link>
              ))
          )}
        </div>
      )}
    </div>
  );
}
