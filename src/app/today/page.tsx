import type { Metadata } from "next";
import { APP_NAME } from "@/shared/config/constants";

export const metadata: Metadata = {
  title: "Today",
};

export default function TodayPage() {
  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-bold tracking-[0.25em] text-[var(--mt-neon-yellow)] uppercase">
          {APP_NAME}
        </p>
        <h1 className="text-4xl font-black tracking-tight text-[var(--mt-ink-inverse)]">
          Today
        </h1>
        <p className="max-w-prose text-[var(--mt-ink-inverse)]/85">
          Home of the flat-lay board. Enabled modules will appear here together. Focus
          mode, torn-paper cards, and retro windows arrive in Increment 2+ — this shell
          only establishes tokens, routing, and offline foundations.
        </p>
      </header>

      <section
        aria-labelledby="today-board-placeholder"
        className="mt-paper-panel space-y-3"
      >
        <h2 id="today-board-placeholder" className="text-xl font-bold">
          Board placeholder
        </h2>
        <p className="text-[var(--mt-ink-muted)]">
          Visual DNA from{" "}
          <code className="rounded bg-black/5 px-1">01-master-today-board.png.png</code>{" "}
          and focus refs <code className="rounded bg-black/5 px-1">05</code>,{" "}
          <code className="rounded bg-black/5 px-1">07</code>,{" "}
          <code className="rounded bg-black/5 px-1">08</code>. No fake vitals or meal
          totals are rendered.
        </p>
      </section>
    </article>
  );
}
