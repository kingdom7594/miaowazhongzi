import { Card, CardHeader } from '@/components/console/ui';

export function StagePlaceholder({
  title,
  milestone,
  description,
  items,
}: {
  title: string;
  milestone: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader
          title={title}
          subtitle={description}
          action={
            <span className="rounded-full bg-panel-3 px-2.5 py-0.5 font-mono text-[11px] text-ink-3">
              {milestone} 规划
            </span>
          }
        />
        <div className="p-4">
          <div className="mb-3 rounded-md border border-dashed border-line bg-panel-2 px-4 py-3 text-xs text-ink-2">
            本页为静态占位(M2 边界:核心 4 页实做,视觉 / 审核 / 发布占位)。能力在对应里程碑接入。
          </div>
          <ul className="flex flex-col gap-2">
            {items.map((it) => (
              <li key={it} className="flex items-start gap-2 text-sm text-ink-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {it}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
