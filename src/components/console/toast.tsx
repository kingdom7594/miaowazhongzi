'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type ToastTone = 'ok' | 'bad' | 'info' | 'warn';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const TONE_CLASS: Record<ToastTone, string> = {
  ok: 'border-ok/40 bg-ok/15 text-ok',
  bad: 'border-bad/40 bg-bad/15 text-bad',
  info: 'border-info/40 bg-info/15 text-info',
  warn: 'border-warn/40 bg-warn/15 text-warn',
};

interface ToastApi {
  push: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** 全局轻量 Toast(右下角堆叠,3s 自动消失)。审核/生成等慢操作反馈统一走这里。 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const push = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = ++seq.current;
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(92vw,22rem)] flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto rounded-md border px-3 py-2 text-xs shadow-sm',
              TONE_CLASS[t.tone],
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
