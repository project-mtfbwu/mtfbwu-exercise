"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { PaperCard } from "@/shared/ui/flat-lay/paper-card";
import { RetroWindow } from "@/shared/ui/flat-lay/retro-window";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";
import { PROGRESS_DATA_DISCLAIMER } from "@/modules/progress-photos/safety";
import type { ProgressTimelineItem } from "@/modules/progress/timeline-loader";
import type { ProgressSummaryPreferencesView } from "@/modules/progress/summary-preferences";
import type {
  ProgressComparisonView,
  ProgressPhotoSetView,
} from "@/modules/progress-photos/types";
import {
  chartPointsFromDatedValues,
  chartTableRows,
} from "@/widgets/progress/charts/line-chart";
import { PhotoComparisonViewer } from "@/widgets/progress/photo-comparison-viewer";
import { MeasurementEnablementPanel } from "@/widgets/progress/measurement-enablement";
import { MeasurementChartPanel } from "@/widgets/progress/measurement-chart-panel";
import { ProgressMeasurementForm } from "@/widgets/progress/progress-measurement-form";

const ProgressLineChart = dynamic(
  () =>
    import("@/widgets/progress/charts/line-chart").then((m) => ({
      default: m.ProgressLineChart,
    })),
  { ssr: false, loading: () => <p className="text-sm">Loading chart…</p> },
);

type Props = {
  timeline: ProgressTimelineItem[];
  preferences: ProgressSummaryPreferencesView;
  comparisons: ProgressComparisonView[];
  photoSets: ProgressPhotoSetView[];
  chartPoints: { localDate: string; value: number }[];
  weightTrend: string | null;
  localDate: string;
  timezone: string;
};

export function ProgressPageClient({
  timeline,
  preferences,
  comparisons,
  photoSets,
  chartPoints,
  weightTrend,
  localDate,
  timezone,
}: Props) {
  const [range, setRange] = useState(preferences.defaultDateRange);
  const [filter, setFilter] = useState<"all" | "weight" | "measurement" | "photo_set">(
    "all",
  );
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (filter === "all") return timeline;
    if (filter === "photo_set") return timeline.filter((t) => t.kind === "photo_set");
    return timeline.filter((t) => t.kind === filter);
  }, [timeline, filter]);

  const series = useMemo(
    () => [
      {
        id: "weight",
        label: "Weight (kg, normalized)",
        points: chartPointsFromDatedValues(chartPoints),
        color: "var(--mt-accent-orange)",
      },
    ],
    [chartPoints],
  );

  const tableRows = chartTableRows(chartPoints, "kg");

  return (
    <div className="mx-auto max-w-3xl space-y-4 py-4">
      <RetroWindow title="Progress" accent="orange">
        <PaperCard variant="cream">
          <p className="text-xs text-[var(--mt-ink-muted)]">{PROGRESS_DATA_DISCLAIMER}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <AppLink href={ROUTES.today}>Back to Today</AppLink>
            <select
              className="min-h-9 border-2 border-[var(--mt-ink)] px-2 text-sm"
              value={range}
              onChange={(e) => setRange(e.target.value as typeof range)}
              aria-label="Date range"
            >
              {(["7d", "30d", "90d", "180d", "365d", "all"] as const).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              className="min-h-9 border-2 border-[var(--mt-ink)] px-2 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              aria-label="Timeline filter"
            >
              <option value="all">All</option>
              <option value="weight">Weight</option>
              <option value="measurement">Measurements</option>
              <option value="photo_set">Photos</option>
            </select>
          </div>
        </PaperCard>
      </RetroWindow>

      {preferences.showWeight && chartPoints.length > 0 ? (
        <RetroWindow title="Weight trend" accent="cyan">
          <PaperCard>
            {weightTrend ? (
              <p className="mb-2 text-sm text-[var(--mt-ink)]">{weightTrend}</p>
            ) : null}
            <ProgressLineChart series={series} yUnit="kg" ariaLabel="Weight over time" />
            <table className="mt-3 w-full text-left text-sm">
              <caption className="sr-only">Weight data table fallback</caption>
              <thead>
                <tr>
                  <th scope="col" className="border-b-2 border-[var(--mt-ink)] pb-1">
                    Date
                  </th>
                  <th scope="col" className="border-b-2 border-[var(--mt-ink)] pb-1">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.date}>
                    <td className="py-1">{row.date}</td>
                    <td className="py-1">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PaperCard>
        </RetroWindow>
      ) : null}

      <RetroWindow title="Measurements setup" accent="lime">
        <PaperCard>
          <MeasurementEnablementPanel />
        </PaperCard>
      </RetroWindow>

      {preferences.showMeasurements ? (
        <RetroWindow title="Measurement trends" accent="lime">
          <PaperCard>
            <MeasurementChartPanel
              endDate={localDate}
              defaultRange={preferences.defaultDateRange}
            />
          </PaperCard>
        </RetroWindow>
      ) : null}

      {preferences.showMeasurements ? (
        <RetroWindow title="Log measurements" accent="orange">
          <PaperCard>
            <ProgressMeasurementForm localDate={localDate} timezone={timezone} />
          </PaperCard>
        </RetroWindow>
      ) : null}

      {preferences.showPhotos ? (
        <RetroWindow title="Compare photos" accent="pink">
          <PaperCard>
            <PhotoComparisonViewer photoSets={photoSets} />
          </PaperCard>
        </RetroWindow>
      ) : null}

      <RetroWindow title="Timeline" accent="pink">
        <PaperCard>
          <ul className="space-y-2 text-sm">
            {filtered.length === 0 ? (
              <li className="text-[var(--mt-ink-muted)]">
                No entries for {localDate} range.
              </li>
            ) : (
              filtered.map((item) => (
                <li
                  key={`${item.kind}-${"entry" in item ? item.entry?.id : "entryId" in item ? item.entryId : "set" in item ? item.set.id : item.noteId}`}
                >
                  {item.kind === "weight" && (
                    <span>
                      {item.date} · Weight · {item.entry.normalizedKg ?? "—"} kg
                    </span>
                  )}
                  {item.kind === "measurement" && (
                    <span>
                      {item.date} · Measurements · {item.valueCount} value
                      {item.valueCount === 1 ? "" : "s"}
                      {item.title ? ` · ${item.title}` : ""}
                    </span>
                  )}
                  {item.kind === "photo_set" && (
                    <span>
                      {item.date} · Photo set · {item.set.photos.length} photo
                      {item.set.photos.length === 1 ? "" : "s"}
                    </span>
                  )}
                  {item.kind === "note" && (
                    <span>
                      {item.date} · Note · {item.valueText}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        </PaperCard>
      </RetroWindow>

      {comparisons.length > 0 ? (
        <RetroWindow title="Saved comparisons" accent="lime">
          <PaperCard>
            <ul className="space-y-1 text-sm">
              {comparisons.map((c) => (
                <li key={c.id}>
                  {c.title ?? c.comparisonType} · {c.leftDate ?? "—"} →{" "}
                  {c.rightDate ?? "—"}
                </li>
              ))}
            </ul>
          </PaperCard>
        </RetroWindow>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <PixelButton
          tone="primary"
          loading={pending}
          onClick={() =>
            startTransition(() => {
              window.location.href = ROUTES.today;
            })
          }
        >
          Log on Today board
        </PixelButton>
      </div>
    </div>
  );
}
