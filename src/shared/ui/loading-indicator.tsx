import { cn } from "@/shared/utils/cn";

export function LoadingIndicator({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "inline-flex items-center gap-2 text-[var(--mt-ink-inverse)]",
        className,
      )}
    >
      <span
        aria-hidden
        className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
      />
      <span>{label}</span>
    </div>
  );
}
