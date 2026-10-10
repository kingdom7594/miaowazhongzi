'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Radar,
  Sparkles,
  Image as ImageIcon,
  ShieldCheck,
  Library,
  Send,
  Settings,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: typeof Radar;
  stage: number;
}

const NAV: NavItem[] = [
  { href: '/topic', label: '选题看板', icon: Radar, stage: 1 },
  { href: '/workbench', label: '生成工作台', icon: Sparkles, stage: 2 },
  { href: '/visual', label: '视觉工位', icon: ImageIcon, stage: 3 },
  { href: '/review', label: '审核', icon: ShieldCheck, stage: 4 },
  { href: '/library', label: '稿件库', icon: Library, stage: 5 },
  { href: '/publish', label: '发布', icon: Send, stage: 6 },
  { href: '/settings', label: '知识库 / 设置', icon: Settings, stage: 7 },
];

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = NAV.find((n) => pathname.startsWith(n.href));

  return (
    <div className="flex min-h-screen bg-app text-ink">
      <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-panel">
        <div className="flex items-center gap-2 px-5 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand text-sm font-bold text-white">
            M
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold">内容工厂</div>
            <div className="font-mono text-[11px] text-ink-3">miaowazhongzi</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-2 py-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-brand/15 text-brand'
                    : 'text-ink-2 hover:bg-panel-3 hover:text-ink'
                }`}
              >
                <Icon size={16} strokeWidth={1.9} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line px-5 py-3 font-mono text-[11px] text-ink-3">
          L2 生产 · SQLite
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-panel/60 px-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold">{active?.label ?? '内容工厂控制台'}</h1>
            <span className="font-mono text-[11px] text-ink-3">/ {pathname.replace('/', '') || 'topic'}</span>
          </div>
          <PipelineStepper currentStage={active?.stage ?? 0} />
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden p-6">{children}</main>
      </div>
    </div>
  );
}

function PipelineStepper({ currentStage }: { currentStage: number }) {
  const stages = ['选题', '生成', '视觉', '审核', '发布'];
  return (
    <ol className="flex items-center gap-1 font-mono text-[11px]">
      {stages.map((label, i) => {
        const stage = i + 1;
        const on = currentStage === stage || (currentStage === 5 && stage === 5);
        return (
          <li key={label} className="flex items-center gap-1">
            <span
              className={`rounded-full px-2 py-0.5 ${
                on ? 'bg-brand text-white' : 'bg-panel-3 text-ink-3'
              }`}
            >
              {label}
            </span>
            {i < stages.length - 1 && <span className="text-ink-3">→</span>}
          </li>
        );
      })}
    </ol>
  );
}
