import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/shared/utils/cn";

type AppLinkProps = ComponentProps<typeof Link>;

export function AppLink({ className, ...props }: AppLinkProps) {
  return (
    <Link
      className={cn(
        "font-semibold text-[var(--mt-neon-cyan)] underline-offset-4",
        "hover:underline focus-visible:outline focus-visible:outline-2",
        "focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus-ring)]",
        className,
      )}
      {...props}
    />
  );
}
