import { cn } from '@/lib/utils';

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('rounded-lg border border-line bg-panel', className)}>{children}</div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
      <div>
        <div className="text-sm font-bold">{title}</div>
        {subtitle && <div className="mt-0.5 text-xs text-ink-2">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

type BadgeTone = 'gray' | 'ok' | 'warn' | 'bad' | 'info' | 'brand' | 'plum';

const BADGE_TONES: Record<BadgeTone, string> = {
  gray: 'bg-panel-3 text-ink-2',
  ok: 'bg-ok/15 text-ok',
  warn: 'bg-warn/15 text-warn',
  bad: 'bg-bad/15 text-bad',
  info: 'bg-info/15 text-info',
  brand: 'bg-brand/15 text-brand',
  plum: 'bg-plum/15 text-plum',
};

export function Badge({
  tone = 'gray',
  children,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
}) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', BADGE_TONES[tone])}>
      {children}
    </span>
  );
}

export function Chip({
  active,
  dim,
  children,
  onClick,
}: {
  active?: boolean;
  dim?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={dim}
      className={cn(
        'rounded-full border px-2.5 py-1 text-xs transition-colors',
        dim
          ? 'cursor-not-allowed border-line text-ink-3 opacity-50'
          : active
          ? 'border-brand bg-brand/15 text-brand'
          : 'border-line text-ink-2 hover:border-line-2 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

const BUTTON_VARIANTS = {
  primary: 'bg-brand text-white hover:opacity-90',
  gen: 'bg-gen text-black hover:opacity-90',
  ghost: 'border border-line text-ink-2 hover:text-ink hover:bg-panel-3',
  ok: 'bg-ok text-black hover:opacity-90',
  danger: 'bg-bad text-white hover:opacity-90',
} as const;

export function Button({
  variant = 'primary',
  className,
  disabled,
  onClick,
  children,
  type = 'button',
}: {
  variant?: keyof typeof BUTTON_VARIANTS;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center justify-center gap-1.5 rounded-sm px-3.5 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50',
        BUTTON_VARIANTS[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="grid place-items-center gap-1 rounded-lg border border-dashed border-line bg-panel-2 px-6 py-16 text-center">
      <div className="text-sm font-medium text-ink-2">{title}</div>
      {hint && <div className="text-xs text-ink-3">{hint}</div>}
    </div>
  );
}

export function Alert({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-md px-3 py-2 text-xs', BADGE_TONES[tone])}>{children}</div>
  );
}
