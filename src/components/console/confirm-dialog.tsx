'use client';

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from './ui';

/**
 * B5 a11y:通用二次确认对话框 —— `role="dialog"` + `aria-modal` + `aria-labelledby/describedby`,
 * Esc 关闭、Tab 焦点捕获、关闭后焦点归还触发元素。
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  tone = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger' | 'gen' | 'ok';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = (document.activeElement as HTMLElement) ?? null;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }
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
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      prevFocus.current?.focus?.();
      prevFocus.current = null;
    };
  }, [open, onCancel]);

  if (!open) return null;
  const titleId = 'confirm-dialog-title';
  const descId = description ? 'confirm-dialog-desc' : undefined;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-black/40 p-4"
      onClick={busy ? undefined : onCancel}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-sm rounded-lg border border-line bg-panel p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-sm font-bold">
          {title}
        </h2>
        {description && (
          <div id={descId} className="mt-2 text-xs leading-relaxed text-ink-2">
            {description}
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} disabled={busy} autoFocus>
            {busy && <Loader2 size={15} className="animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
