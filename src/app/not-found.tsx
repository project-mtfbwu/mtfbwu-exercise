import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";

export default function NotFound() {
  return (
    <div className="mt-paper-panel space-y-3">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-[var(--mt-ink-muted)]">That route is not on the board yet.</p>
      <AppLink href={ROUTES.today}>Back to Today</AppLink>
    </div>
  );
}
