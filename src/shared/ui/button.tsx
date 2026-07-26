import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/utils/cn";

const buttonVariants = cva(
  [
    "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[var(--mt-radius-md)]",
    "border-2 border-[var(--mt-ink)] px-4 py-2 text-base font-semibold",
    "transition-[transform,opacity,background-color] duration-[var(--mt-motion-fast)]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    "focus-visible:outline-[var(--mt-focus-ring)]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "motion-safe:active:translate-y-px",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: "bg-[var(--mt-neon-lime)] text-[var(--mt-ink)] hover:brightness-95",
        secondary:
          "bg-[var(--mt-paper)] text-[var(--mt-ink)] hover:bg-[var(--mt-paper-warm)]",
        danger: "bg-[var(--mt-danger)] text-[var(--mt-ink-inverse)] hover:brightness-110",
        ghost:
          "border-transparent bg-transparent text-[var(--mt-ink-inverse)] hover:bg-white/10",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant }), className)}
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

Button.displayName = "Button";

export { buttonVariants };
