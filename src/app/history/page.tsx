import type { Metadata } from "next";
import Link from "next/link";
import { loadProfileOrRedirect } from "@/shared/board/load-board";
import { loadHistoryPageAction } from "@/modules/daily/history-actions";
import { RetroWindow } from "@/shared/ui/flat-lay/retro-window";
import { PaperCard } from "@/shared/ui/flat-lay/paper-card";
import { ROUTES } from "@/shared/config/constants";
import { SyncStatusBanner } from "@/widgets/sync/sync-status-banner";

export const metadata: Metadata = { title: "History" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ cursor?: string }>;
};

export default async function HistoryPage({ searchParams }: Props) {
  const { profile } = await loadProfileOrRedirect();
  const params = await searchParams;
  const timezone = profile.timezone || "UTC";
  const page = await loadHistoryPageAction(timezone, { cursor: params.cursor ?? null });

  return (
    <article className="mx-auto max-w-2xl space-y-4 py-4">
      <SyncStatusBanner />
      <RetroWindow title="History" accent="lime">
        <PaperCard>
          <p className="mb-4 text-sm text-[var(--mt-ink-muted)]">
            Recent days with module activity summaries.
          </p>
          <ul className="space-y-2">
            {page.items.map((item) => (
              <li
                key={item.localDate}
                className="border-2 border-[var(--mt-ink)] px-3 py-2"
              >
                <Link
                  href={`${ROUTES.today}?date=${item.localDate}`}
                  className="font-bold"
                >
                  {item.summaryLine}
                </Link>
              </li>
            ))}
          </ul>
          {page.nextCursor ? (
            <p className="mt-4">
              <Link href={`${ROUTES.history}?cursor=${page.nextCursor}`}>
                Older days →
              </Link>
            </p>
          ) : null}
          <div className="mt-4 flex gap-2 text-sm">
            <Link href={ROUTES.calendar}>Calendar</Link>
            <Link href={ROUTES.today}>Today</Link>
          </div>
        </PaperCard>
      </RetroWindow>
    </article>
  );
}
