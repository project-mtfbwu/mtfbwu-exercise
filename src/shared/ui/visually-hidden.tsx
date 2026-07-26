import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

/** Visually hide content while keeping it available to assistive tech. */
export function VisuallyHidden({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return (
    <span className={cn("sr-only", className)} {...props}>
      {children}
    </span>
  );
}
