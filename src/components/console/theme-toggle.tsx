'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'mz-theme';

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'light' ? 'light' : 'dark';
}

/** 顶栏主题切换:切换 `html[data-theme]` 并持久化到 localStorage(与 layout 内联脚本同 key)。 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const apply = (next: Theme) => {
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* localStorage 不可用时仅当前会话生效 */
    }
    setTheme(next);
  };

  const isDark = theme !== 'light';
  const label = theme === null ? '切换主题' : isDark ? '切换到浅色主题' : '切换到深色主题';

  return (
    <button
      type="button"
      onClick={() => apply(isDark ? 'light' : 'dark')}
      aria-label={label}
      aria-pressed={theme === null ? undefined : isDark}
      title={label}
      className="grid h-8 w-8 place-items-center rounded-sm border border-line text-ink-2 transition-colors hover:bg-panel-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
    >
      {theme === null ? (
        <span className="h-4 w-4" />
      ) : isDark ? (
        <Sun size={15} strokeWidth={1.9} />
      ) : (
        <Moon size={15} strokeWidth={1.9} />
      )}
    </button>
  );
}
