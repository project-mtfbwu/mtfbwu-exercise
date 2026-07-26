import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Token preview",
  robots: { index: false, follow: false },
};

const swatches = [
  ["--mt-bg-board", "Board"],
  ["--mt-paper", "Paper"],
  ["--mt-neon-pink", "Pink"],
  ["--mt-neon-yellow", "Yellow"],
  ["--mt-neon-cyan", "Cyan"],
  ["--mt-neon-lime", "Lime"],
  ["--mt-neon-orange", "Orange"],
  ["--mt-neon-purple", "Purple"],
  ["--mt-success", "Success"],
  ["--mt-warning", "Warning"],
  ["--mt-danger", "Danger"],
] as const;

/** Internal token check — not a design-system marketing dashboard. */
export default function TokenPreviewPage() {
  return (
    <article className="mt-paper-panel space-y-4">
      <h1 className="text-2xl font-bold">Design token preview</h1>
      <p className="text-sm text-[var(--mt-ink-muted)]">
        Dev-only sanity check for CSS variables. Do not treat this as a product surface.
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {swatches.map(([token, label]) => (
          <li key={token} className="space-y-2">
            <div
              className="h-16 rounded-[var(--mt-radius-md)] border-2 border-[var(--mt-ink)]"
              style={{ background: `var(${token})` }}
              aria-hidden
            />
            <p className="text-xs font-semibold text-[var(--mt-ink)]">
              {label}
              <br />
              <code>{token}</code>
            </p>
          </li>
        ))}
      </ul>
    </article>
  );
}
