import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";

export function PlannedRouteShell({
  title,
  summary,
}: {
  title: string;
  summary: string;
}) {
  return (
    <article className="mt-paper-panel space-y-4">
      <header className="space-y-2">
        <p className="text-xs font-bold tracking-widest text-[var(--mt-neon-purple)] uppercase">
          Planned route
        </p>
        <h1 className="text-3xl font-bold text-[var(--mt-ink)]">{title}</h1>
      </header>
      <p className="max-w-prose text-[var(--mt-ink-muted)]">{summary}</p>
      <p className="text-sm text-[var(--mt-ink-muted)]">
        No sample health metrics are shown here. Domain UI arrives in later increments
        using the approved flat-lay / focus design system.
      </p>
      <AppLink href={ROUTES.today}>Back to Today</AppLink>
    </article>
  );
}
