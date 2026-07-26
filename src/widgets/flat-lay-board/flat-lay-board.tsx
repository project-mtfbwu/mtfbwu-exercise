"use client";

import type { ReactNode } from "react";
import { BoardBackdrop } from "./board-backdrop";
import { DailyStatusStrip, type DailyStatusItem } from "./daily-status-strip";
import { TargetFooter, type TargetFooterMetric } from "./target-footer";
import type { MotionPreference } from "@/shared/providers/motion";
import { StickerBadge } from "@/shared/ui/flat-lay/sticker-badge";
import { cn } from "@/shared/utils/cn";
import styles from "./board-layout.module.css";

export type FlatLayBoardProps = {
  title: string;
  tagline?: string;
  statusItems: DailyStatusItem[];
  targetMetrics: TargetFooterMetric[];
  motionPreference: MotionPreference;
  dimmed?: boolean;
  inertBoard?: boolean;
  children: ReactNode;
  stickers?: ReactNode;
  toolbar?: ReactNode;
  className?: string;
};

export function FlatLayBoard({
  title,
  tagline = "Mind. Train. Fuel. Be Well.",
  statusItems,
  targetMetrics,
  motionPreference,
  dimmed = false,
  inertBoard = false,
  children,
  stickers,
  toolbar,
  className,
}: FlatLayBoardProps) {
  return (
    <BoardBackdrop motionPreference={motionPreference} className={className}>
      <div
        data-testid="flat-lay-board"
        className={cn(
          "space-y-4 transition-[filter,opacity] duration-[var(--mt-motion-med)]",
          dimmed && "pointer-events-none opacity-45 saturate-75",
        )}
        inert={inertBoard ? true : undefined}
        aria-hidden={inertBoard || undefined}
      >
        <header className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.3em] text-[var(--mt-neon-cyan)] uppercase">
                MTFBWU
              </p>
              <h1
                className={cn(
                  "mt-1 text-4xl font-black tracking-tight sm:text-5xl",
                  "bg-gradient-to-r from-[var(--mt-neon-pink)] via-[var(--mt-neon-lime)] to-[var(--mt-neon-cyan)] bg-clip-text text-transparent",
                  "[text-shadow:0_0_1px_rgb(0_0_0_/_80%)]",
                )}
              >
                {title}
              </h1>
              <p className="mt-2 inline-block rotate-[-1deg] border-2 border-[var(--mt-ink)] bg-[var(--mt-paper-warm)] px-3 py-1 text-sm font-bold text-[var(--mt-ink)]">
                {tagline}
              </p>
            </div>
            <div className="flex flex-wrap gap-2" aria-hidden>
              <StickerBadge tone="lime">Level up!</StickerBadge>
              <StickerBadge tone="pink">You got this!</StickerBadge>
            </div>
          </div>
          {toolbar}
          <DailyStatusStrip items={statusItems} />
        </header>

        <div className={styles.grid ?? ""} data-testid="board-module-grid">
          {children}
        </div>

        {stickers}

        <TargetFooter metrics={targetMetrics} />
      </div>
    </BoardBackdrop>
  );
}

export { styles as boardLayoutStyles };
