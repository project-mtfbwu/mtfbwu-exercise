import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";
import styles from "./retro-window.module.css";

export type RetroWindowAccent = "cyan" | "purple" | "pink" | "orange" | "lime" | "blue";

const accentClass: Record<RetroWindowAccent, string> = {
  cyan: styles.accentCyan ?? "",
  purple: styles.accentPurple ?? "",
  pink: styles.accentPink ?? "",
  orange: styles.accentOrange ?? "",
  lime: styles.accentLime ?? "",
  blue: styles.accentBlue ?? "",
};

export type RetroWindowProps = {
  title: string;
  titleId?: string;
  accent?: RetroWindowAccent;
  onClose?: () => void;
  closeLabel?: string;
  leading?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function RetroWindow({
  title,
  titleId,
  accent = "purple",
  onClose,
  closeLabel = "Close",
  leading,
  children,
  className,
  bodyClassName,
}: RetroWindowProps) {
  return (
    <div className={cn(styles.window ?? "", className)}>
      <div className={cn(styles.titleBar ?? "", accentClass[accent])}>
        {leading}
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <div className={styles.controls}>
          {onClose ? (
            <button
              type="button"
              className={cn(styles.control ?? "", styles.controlClose ?? "")}
              onClick={onClose}
              aria-label={closeLabel}
            >
              ×
            </button>
          ) : null}
        </div>
      </div>
      <div className={cn(styles.body ?? "", bodyClassName)}>{children}</div>
    </div>
  );
}
