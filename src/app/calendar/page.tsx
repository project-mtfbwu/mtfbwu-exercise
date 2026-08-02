import type { Metadata } from "next";
import Link from "next/link";
import { loadProfileOrRedirect } from "@/shared/board/load-board";
import { loadMonthIndicators, loadDayDetail } from "@/modules/calendar";
import { RetroWindow } from "@/shared/ui/flat-lay/retro-window";
import { PaperCard } from "@/shared/ui/flat-lay/paper-card";
import { ROUTES } from "@/shared/config/constants";
import { SyncStatusBanner } from "@/widgets/sync/sync-status-banner";

export const metadata: Metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ year?: string; month?: string; date?: string }>;
};

function indicatorLetters(day: {
  nutrition: number;
  workout: number;
  rehab: number;
  progress: number;
  hydration: number;
  meditation: number;
  sleep: number;
  supplements: number;
  custom: number;
}): string {
  return [
    day.nutrition && "N",
    day.workout && "W",
    day.rehab && "R",
    day.progress && "P",
    day.hydration && "H",
    day.meditation && "M",
    day.sleep && "S",
    day.supplements && "U",
    day.custom && "C",
  ]
    .filter(Boolean)
    .join(" ");
}

export default async function CalendarPage({ searchParams }: Props) {
  const { profile } = await loadProfileOrRedirect();
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) || now.getMonth() + 1;
  const selectedDate = params.date ?? null;
  const timezone = profile.timezone || "UTC";

  const monthData = await loadMonthIndicators(year, month, timezone);
  const dayDetail = selectedDate ? await loadDayDetail(selectedDate, timezone) : null;

  const prevMonth =
    month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth =
    month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return (
    <article className="mx-auto max-w-3xl space-y-4 py-4">
      <SyncStatusBanner />
      <RetroWindow title="Calendar" accent="cyan">
        <PaperCard>
          <p className="mb-4 text-sm text-[var(--mt-ink-muted)]">
            Compact activity indicators per day — not a social feed. N nutrition · W
            workout · R rehab · P progress · H hydration · M meditation · S sleep · U
            supplements · C custom.
          </p>
          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            <Link href={ROUTES.today}>Today board</Link>
            <Link href={ROUTES.history}>History</Link>
            <Link
              href={`${ROUTES.calendar}?year=${prevMonth.year}&month=${prevMonth.month}${selectedDate ? `&date=${selectedDate}` : ""}`}
            >
              ← Prev month
            </Link>
            <Link
              href={`${ROUTES.calendar}?year=${nextMonth.year}&month=${nextMonth.month}${selectedDate ? `&date=${selectedDate}` : ""}`}
            >
              Next month →
            </Link>
          </div>
          <h2 className="mb-2 text-lg font-extrabold">
            {year}-{String(month).padStart(2, "0")}
          </h2>
          <ul className="grid grid-cols-7 gap-1 text-center text-xs">
            {monthData.days.map((day) => (
              <li key={day.localDate}>
                <Link
                  href={`${ROUTES.calendar}?year=${year}&month=${month}&date=${day.localDate}`}
                  className={`block border-2 px-1 py-2 no-underline ${
                    day.hasAny
                      ? "border-[var(--mt-neon-lime)] bg-[var(--mt-paper-warm)]"
                      : "border-[var(--mt-ink-muted)]"
                  } ${selectedDate === day.localDate ? "ring-2 ring-[var(--mt-neon-yellow)]" : ""}`}
                >
                  <span className="font-bold">{day.localDate.slice(8)}</span>
                  {day.hasAny ? (
                    <span className="mt-1 block text-[10px] leading-tight">
                      {indicatorLetters(day)}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
          {dayDetail ? (
            <section className="mt-6 border-t-2 border-[var(--mt-ink)] pt-4">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                <Link
                  href={`${ROUTES.calendar}?year=${year}&month=${month}&date=${dayDetail.prevDate}`}
                >
                  ← {dayDetail.prevDate}
                </Link>
                <h3 className="font-extrabold">{dayDetail.localDate}</h3>
                <Link
                  href={`${ROUTES.calendar}?year=${year}&month=${month}&date=${dayDetail.nextDate}`}
                >
                  {dayDetail.nextDate} →
                </Link>
              </div>
              {dayDetail.completionPercent != null ? (
                <p className="text-sm text-[var(--mt-ink-muted)]">
                  {dayDetail.completionPercent}% modules with activity
                </p>
              ) : null}
              {dayDetail.sections.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--mt-ink-muted)]">
                  No logged activity for this day.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {dayDetail.sections.map((section) => (
                    <li
                      key={section.moduleKey}
                      className={`border-2 p-2 ${
                        section.deleted
                          ? "border-[var(--mt-ink-muted)] opacity-60"
                          : "border-[var(--mt-ink)]"
                      }`}
                    >
                      <p className="font-bold">{section.title}</p>
                      <p className="text-sm">{section.summary}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {section.links.map((link) =>
                          link.unavailable ? (
                            <span
                              key={link.href}
                              className="text-sm text-[var(--mt-ink-muted)]"
                            >
                              {link.label} (unavailable)
                            </span>
                          ) : (
                            <Link key={link.href} href={link.href} className="text-sm">
                              {link.label}
                            </Link>
                          ),
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : selectedDate ? (
            <section className="mt-6 border-t-2 border-[var(--mt-ink)] pt-4">
              <p className="text-sm text-[var(--mt-ink-muted)]">
                Could not load detail for {selectedDate}.{" "}
                <Link href={`${ROUTES.calendar}?year=${year}&month=${month}`}>
                  Back to month
                </Link>
              </p>
            </section>
          ) : null}
        </PaperCard>
      </RetroWindow>
    </article>
  );
}
