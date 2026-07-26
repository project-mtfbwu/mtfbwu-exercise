import type { Metadata } from "next";
import { MotionDevToggle } from "@/widgets/today-board/motion-dev-toggle";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-black text-[var(--mt-ink-inverse)]">Settings</h1>
        <p className="max-w-prose text-[var(--mt-ink-inverse)]/85">
          Development preferences for Increment 2. Auth, export/delete, and domain
          settings arrive later. Motion preference is stored locally in this browser only.
        </p>
      </header>
      <section
        aria-labelledby="motion-settings-heading"
        className="mt-paper-panel space-y-3"
      >
        <h2 id="motion-settings-heading" className="text-xl font-bold">
          Motion preference
        </h2>
        <p className="text-sm text-[var(--mt-ink-muted)]">
          Modes: <code>full</code>, <code>reduced</code>, <code>off</code>. System
          respects <code>prefers-reduced-motion</code> when no override is set.
        </p>
        <MotionDevToggle />
      </section>
    </article>
  );
}
