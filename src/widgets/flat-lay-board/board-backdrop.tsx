import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";
import type { MotionPreference } from "@/shared/providers/motion";
import styles from "./board-backdrop.module.css";

export type BoardBackdropProps = {
  children: ReactNode;
  motionPreference?: MotionPreference;
  className?: string;
};

export function BoardBackdrop({
  children,
  motionPreference = "full",
  className,
}: BoardBackdropProps) {
  return (
    <div className={cn(styles.backdrop ?? "", className)}>
      <div
        className={cn(
          styles.twinkle ?? "",
          motionPreference === "full" && (styles.twinkleFull ?? ""),
        )}
        aria-hidden
      />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
