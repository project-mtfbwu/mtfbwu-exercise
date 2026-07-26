"use client";

import { forwardRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/shared/utils/cn";
import { PaperCard, type PaperCardVariant } from "./paper-card";
import { RetroWindow, type RetroWindowAccent } from "./retro-window";
import { StickerBadge } from "./sticker-badge";
import type { MotionPreference } from "@/shared/providers/motion";

export type FlatLayCardVariant = "paper" | "window";

export type FlatLayCardProps = {
  id: string;
  title: string;
  status: string;
  variant?: FlatLayCardVariant;
  paperTone?: PaperCardVariant;
  windowAccent?: RetroWindowAccent;
  rotationDeg?: number;
  sticker?: string;
  motionPreference?: MotionPreference;
  empty?: boolean;
  disabled?: boolean;
  onOpen: () => void;
  children?: ReactNode;
  className?: string;
};

export const FlatLayCard = forwardRef<HTMLButtonElement, FlatLayCardProps>(
  function FlatLayCard(
    {
      id,
      title,
      status,
      variant = "window",
      paperTone = "cream",
      windowAccent = "purple",
      rotationDeg = 0,
      sticker,
      motionPreference = "full",
      empty = false,
      disabled = false,
      onOpen,
      children,
      className,
    },
    ref,
  ) {
    const animateHover =
      motionPreference === "full" && !disabled
        ? { y: -4, scale: 1.02 }
        : motionPreference === "reduced" && !disabled
          ? { scale: 1.01 }
          : undefined;

    const body = (
      <div className="space-y-2 text-left">
        {variant === "paper" ? (
          <h2 className="text-lg font-black tracking-wide text-[var(--mt-ink)] uppercase">
            {title}
          </h2>
        ) : null}
        <p className="text-sm font-semibold text-[var(--mt-ink)]">{status}</p>
        {empty ? (
          <p className="text-sm text-[var(--mt-ink-muted)]">Demo empty — open to add.</p>
        ) : null}
        {children}
        <p className="text-xs font-bold tracking-wide text-[var(--mt-ink-muted)] uppercase">
          Dev demo data
        </p>
      </div>
    );

    return (
      <motion.div
        layout={motionPreference !== "off"}
        layoutId={motionPreference === "full" ? `card-${id}` : undefined}
        className={cn("relative", className)}
        style={{ rotate: rotationDeg }}
        whileHover={animateHover}
        transition={
          motionPreference === "off"
            ? { duration: 0 }
            : { duration: motionPreference === "reduced" ? 0.15 : 0.28 }
        }
      >
        {sticker ? (
          <StickerBadge className="absolute -top-3 -right-2 z-10" tone="pink">
            {sticker}
          </StickerBadge>
        ) : null}
        <button
          ref={ref}
          type="button"
          id={`board-card-${id}`}
          className={cn(
            "block w-full cursor-pointer rounded-[var(--mt-radius-sm)] text-left",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mt-focus-ring)]",
            disabled && "cursor-not-allowed opacity-60",
          )}
          onClick={onOpen}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-label={`Open ${title}. ${status}`}
        >
          {variant === "paper" ? (
            <PaperCard variant={paperTone}>{body}</PaperCard>
          ) : (
            <RetroWindow title={title} accent={windowAccent} bodyClassName="!p-3">
              {body}
            </RetroWindow>
          )}
        </button>
      </motion.div>
    );
  },
);
