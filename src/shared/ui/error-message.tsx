import { cn } from "@/shared/utils/cn";

export function ErrorMessage({
  id,
  children,
  className,
}: {
  id?: string;
  children: string;
  className?: string;
}) {
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        "rounded-[var(--mt-radius-sm)] border-2 border-[var(--mt-danger)]",
        "bg-[var(--mt-paper)] px-3 py-2 text-sm font-medium text-[var(--mt-ink)]",
        className,
      )}
    >
      {children}
    </p>
  );
}
