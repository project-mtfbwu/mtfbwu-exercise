"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { MotionPreference } from "@/shared/providers/motion";
import { useFocusTrap } from "./use-focus-trap";
import { cn } from "@/shared/utils/cn";

export type FocusLayerProps = {
  open: boolean;
  title: string;
  titleId: string;
  triggerId: string;
  motionPreference: MotionPreference;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

function durationMs(preference: MotionPreference) {
  if (preference === "off") return 0;
  if (preference === "reduced") return 0.15;
  return 0.28;
}

export function FocusLayer({
  open,
  title,
  titleId,
  triggerId,
  motionPreference,
  onClose,
  children,
  className,
}: FocusLayerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef, triggerId);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const seconds = durationMs(motionPreference);
  const moduleId = triggerId.startsWith("board-card-")
    ? triggerId.slice("board-card-".length)
    : triggerId;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[var(--mt-z-overlay)] flex items-end justify-center p-3 sm:items-center sm:p-6"
          initial={motionPreference === "off" ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={motionPreference === "off" ? undefined : { opacity: 0 }}
          transition={{ duration: seconds }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-[var(--mt-overlay)]"
            aria-label="Dismiss focus panel"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-label={title}
            className={cn(
              "relative z-[var(--mt-z-focus)] w-full max-w-3xl shadow-[var(--mt-shadow-focus)]",
              className,
            )}
            layoutId={motionPreference === "full" ? `card-${moduleId}` : undefined}
            initial={
              motionPreference === "off"
                ? false
                : {
                    opacity: 0,
                    scale: motionPreference === "reduced" ? 0.98 : 0.92,
                    y: 12,
                  }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              motionPreference === "off"
                ? undefined
                : {
                    opacity: 0,
                    scale: motionPreference === "reduced" ? 0.98 : 0.94,
                    y: 8,
                  }
            }
            transition={{ duration: seconds, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
