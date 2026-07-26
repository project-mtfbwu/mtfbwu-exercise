import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/utils/cn";
import styles from "./paper-card.module.css";

export type PaperCardVariant = "cream" | "yellow" | "pink" | "mint";

const variantClass: Record<PaperCardVariant, string> = {
  cream: "",
  yellow: styles.paperWarm ?? "",
  pink: styles.paperPink ?? "",
  mint: styles.paperMint ?? "",
};

export type PaperCardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: PaperCardVariant;
  dashedAccent?: boolean;
  children: ReactNode;
};

export function PaperCard({
  variant = "cream",
  dashedAccent = false,
  className,
  children,
  ...props
}: PaperCardProps) {
  return (
    <div
      className={cn(
        styles.paper ?? "",
        variantClass[variant],
        dashedAccent && (styles.dashed ?? ""),
        className,
      )}
      {...props}
    >
      <div className={styles.inner}>{children}</div>
    </div>
  );
}
