import { cn } from '@/lib/utils';

export function Card({
  className,
  id,
  children,
}: {
  className?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className={cn('rounded-lg border border-line bg-panel', className)}>{children}</div>
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

/** 页面头(G4):大标题 + 说明 + 右侧动作区。 */
export function Pagehead({
  title,
  desc,
  actions,
}: {
  title: React.ReactNode;
  desc?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-bold leading-tight">{title}</h2>
        {desc && <div className="mt-1 text-xs text-ink-2">{desc}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** 复选输入(选题多选等),原生 input + 可见焦点环。 */
export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-2 text-xs',
        disabled ? 'cursor-not-allowed text-ink-3' : 'cursor-pointer text-ink-2',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 cursor-pointer rounded-sm border border-line-2 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:cursor-not-allowed"
      />
      {label}
    </label>
  );
}
