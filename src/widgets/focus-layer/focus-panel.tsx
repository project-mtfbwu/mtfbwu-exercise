"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";
import { PaperCard } from "@/shared/ui/flat-lay/paper-card";
import { RetroWindow, type RetroWindowAccent } from "@/shared/ui/flat-lay/retro-window";

export type FocusPanelChrome = "window" | "paper";

export type FocusPanelProps = {
  title: string;
  titleId: string;
  chrome?: FocusPanelChrome;
  accent?: RetroWindowAccent;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
};

export function FocusPanel({
  title,
  titleId,
  chrome = "window",
  accent = "purple",
  onClose,
  children,
  className,
  footer,
}: FocusPanelProps) {
  const content = (
    <>
      <p className="mb-3 rounded border-2 border-dashed border-[var(--mt-ink)] bg-[var(--mt-paper-warm)] px-2 py-1 text-xs font-bold text-[var(--mt-ink)]">
        Development-only demo data — not saved to Supabase.
      </p>
      {children}
      {footer ? <div className="mt-4 flex flex-wrap gap-2">{footer}</div> : null}
    </>
  );

  if (chrome === "paper") {
    return (
      <PaperCard className={cn("max-h-[min(90dvh,52rem)] overflow-auto", className)}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-xl font-black uppercase">
            {title}
          </h2>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center border-2 border-[var(--mt-ink)] bg-[var(--mt-danger)] text-lg font-black text-[var(--mt-ink-inverse)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus-ring)]"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {content}
      </PaperCard>
    );
  }

  return (
    <RetroWindow
      title={title}
      titleId={titleId}
      accent={accent}
      onClose={onClose}
      className={cn("max-h-[min(90dvh,52rem)] overflow-hidden", className)}
      bodyClassName="max-h-[calc(min(90dvh,52rem)-3rem)] overflow-auto"
    >
      {content}
    </RetroWindow>
  );
}
