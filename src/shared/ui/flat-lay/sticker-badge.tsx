import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

export type StickerBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  /** Decorative stickers should stay hidden from AT. */
  decorative?: boolean;
  tone?: "pink" | "lime" | "yellow" | "cyan" | "orange";
};

const toneClass = {
  pink: "bg-[var(--mt-neon-pink)] text-[var(--mt-ink-inverse)]",
  lime: "bg-[var(--mt-neon-lime)] text-[var(--mt-ink)]",
  yellow: "bg-[var(--mt-neon-yellow)] text-[var(--mt-ink)]",
  cyan: "bg-[var(--mt-neon-cyan)] text-[var(--mt-ink)]",
  orange: "bg-[var(--mt-neon-orange)] text-[var(--mt-ink)]",
} as const;

export function StickerBadge({
  children,
  decorative = true,
  tone = "yellow",
  className,
  ...props
}: StickerBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rotate-[var(--mt-rotate-sticker)] items-center justify-center border-2 border-[var(--mt-ink)] px-2 py-1 text-xs font-black tracking-wide uppercase shadow-[3px_3px_0_rgb(0_0_0_/_35%)]",
        toneClass[tone],
        className,
      )}
      aria-hidden={decorative || undefined}
      {...props}
    >
      {children}
    </span>
  );
}
