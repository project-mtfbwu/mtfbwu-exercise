import { PaperCard } from "@/shared/ui/flat-lay/paper-card";

export type DailyStatusItem = {
  label: string;
  value: string;
};

export type DailyStatusStripProps = {
  items: DailyStatusItem[];
  caption?: string;
};

export function DailyStatusStrip({
  items,
  caption = "Demo daily vitals — not real measurements",
}: DailyStatusStripProps) {
  return (
    <PaperCard variant="yellow" className="!shadow-[4px_4px_0_rgb(0_0_0_/_35%)]">
      <p className="mb-2 text-xs font-bold tracking-wide text-[var(--mt-ink-muted)] uppercase">
        {caption}
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-[var(--mt-ink)]">
        {items.map((item) => (
          <li key={item.label} className="min-w-[7rem]">
            <span className="block text-[0.7rem] font-bold tracking-wide text-[var(--mt-ink-muted)] uppercase">
              {item.label}
            </span>
            <span className="tabular-nums">{item.value}</span>
          </li>
        ))}
      </ul>
    </PaperCard>
  );
}
