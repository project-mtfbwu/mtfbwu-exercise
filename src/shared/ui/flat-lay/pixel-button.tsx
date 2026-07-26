import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/utils/cn";

const pixelButtonVariants = cva(
  [
    "inline-flex min-h-11 min-w-11 items-center justify-center gap-2",
    "border-2 border-[var(--mt-ink)] px-3 py-2 text-sm font-extrabold uppercase tracking-wide",
    "shadow-[3px_3px_0_rgb(0_0_0_/_40%)]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    "focus-visible:outline-[var(--mt-focus-ring)]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_rgb(0_0_0_/_40%)]",
  ].join(" "),
  {
    variants: {
      tone: {
        primary: "bg-[var(--mt-neon-lime)] text-[var(--mt-ink)]",
        danger: "bg-[var(--mt-neon-pink)] text-[var(--mt-ink-inverse)]",
        neutral: "bg-[var(--mt-paper-warm)] text-[var(--mt-ink)]",
        cyan: "bg-[var(--mt-neon-cyan)] text-[var(--mt-ink)]",
        purple: "bg-[var(--mt-neon-purple)] text-[var(--mt-ink-inverse)]",
      },
    },
    defaultVariants: {
      tone: "primary",
    },
  },
);

export type PixelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof pixelButtonVariants> & {
    loading?: boolean;
  };

export const PixelButton = forwardRef<HTMLButtonElement, PixelButtonProps>(
  ({ className, tone, loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(pixelButtonVariants({ tone }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <span className="sr-only">Loading</span> : null}
        {children}
      </button>
    );
  },
);

PixelButton.displayName = "PixelButton";
