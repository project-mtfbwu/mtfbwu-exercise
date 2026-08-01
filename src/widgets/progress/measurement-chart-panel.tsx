"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import {
  getMeasurementChartDataAction,
  listUserMeasurementsAction,
} from "@/modules/measurements/actions";
import type {
  ProgressDateRange,
  UserMeasurementDefinitionView,
} from "@/modules/measurements/types";
import {
  chartPointsFromDatedValues,
  chartTableRows,
} from "@/widgets/progress/charts/line-chart";

const ProgressLineChart = dynamic(
  () =>
    import("@/widgets/progress/charts/line-chart").then((m) => ({
      default: m.ProgressLineChart,
    })),
  { ssr: false, loading: () => <p className="text-sm">Loading chart…</p> },
);

type Side = "left" | "right" | "not_applicable";

type Props = {
  endDate: string;
  defaultRange?: ProgressDateRange;
};

function defaultSideForDefinition(
  definition: UserMeasurementDefinitionView | null | undefined,
): Side {
  if (definition?.sideMode === "left_right") return "left";
  return "not_applicable";
}

export function MeasurementChartPanel({ endDate, defaultRange = "90d" }: Props) {
  const [definitions, setDefinitions] = useState<UserMeasurementDefinitionView[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [side, setSide] = useState<Side>("not_applicable");
  const [range, setRange] = useState<ProgressDateRange>(defaultRange);
  const [points, setPoints] = useState<{ localDate: string; value: number }[]>([]);
  const [unit, setUnit] = useState("cm");
  const [displayName, setDisplayName] = useState("Measurement");
  const [trendText, setTrendText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadChart = useCallback(
    (measurementId: string, chartSide: Side, chartRange: ProgressDateRange) => {
      if (!measurementId) return;
      setError(null);
      startTransition(async () => {
        try {
          const data = await getMeasurementChartDataAction({
            userMeasurementDefinitionId: measurementId,
            side: chartSide,
            range: chartRange,
            endDate,
          });
          setPoints(data.points);
          setUnit(data.unit);
          setDisplayName(data.displayName);
          setTrendText(data.summary.trendText);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not load chart.");
        }
      });
    },
    [endDate],
  );

  useEffect(() => {
    void listUserMeasurementsAction()
      .then((rows) => {
        const enabled = rows.filter((row) => row.enabled);
        setDefinitions(enabled);
        const first = enabled[0];
        if (!first) return;
        const initialSide = defaultSideForDefinition(first);
        setSelectedId(first.id);
        setSide(initialSide);
        loadChart(first.id, initialSide, range);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load measurements.");
      });
  }, [loadChart, range]);

  const selectedDefinition = useMemo(
    () => definitions.find((row) => row.id === selectedId) ?? null,
    [definitions, selectedId],
  );

  const sideOptions = useMemo((): Side[] => {
    if (!selectedDefinition) return ["not_applicable"];
    if (selectedDefinition.sideMode === "left_right") return ["left", "right"];
    return ["not_applicable"];
  }, [selectedDefinition]);

  const effectiveSide = sideOptions.includes(side)
    ? side
    : (sideOptions[0] ?? "not_applicable");

  const series = useMemo(
    () => [
      {
        id: selectedId || "measurement",
        label: `${displayName} (${unit})`,
        points: chartPointsFromDatedValues(points),
        color: "var(--mt-accent-lime)",
      },
    ],
    [displayName, points, selectedId, unit],
  );

  const tableRows = chartTableRows(points, unit);

  if (definitions.length === 0) {
    return (
      <p className="text-sm text-[var(--mt-ink-muted)]">
        Enable a measurement above to see trends here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <label className="text-sm font-bold">
          Measurement
          <select
            className="mt-1 block min-h-11 border-2 border-[var(--mt-ink)] bg-white px-2"
            value={selectedId}
            onChange={(event) => {
              const nextId = event.target.value;
              const nextDefinition = definitions.find((row) => row.id === nextId) ?? null;
              const nextSide = defaultSideForDefinition(nextDefinition);
              setSelectedId(nextId);
              setSide(nextSide);
              loadChart(nextId, nextSide, range);
            }}
            aria-label="Measurement to chart"
          >
            {definitions.map((row) => (
              <option key={row.id} value={row.id}>
                {row.displayName}
              </option>
            ))}
          </select>
        </label>
        {sideOptions.length > 1 ? (
          <label className="text-sm font-bold">
            Side
            <select
              className="mt-1 block min-h-11 border-2 border-[var(--mt-ink)] bg-white px-2"
              value={effectiveSide}
              onChange={(event) => {
                const nextSide = event.target.value as Side;
                setSide(nextSide);
                loadChart(selectedId, nextSide, range);
              }}
              aria-label="Measurement side"
            >
              {sideOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "left" ? "Left" : "Right"}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="text-sm font-bold">
          Range
          <select
            className="mt-1 block min-h-11 border-2 border-[var(--mt-ink)] bg-white px-2"
            value={range}
            onChange={(event) => {
              const nextRange = event.target.value as ProgressDateRange;
              setRange(nextRange);
              loadChart(selectedId, effectiveSide, nextRange);
            }}
            aria-label="Measurement chart range"
          >
            {(["7d", "30d", "90d", "180d", "365d", "all"] as const).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <PixelButton
          tone="neutral"
          loading={pending}
          onClick={() => loadChart(selectedId, effectiveSide, range)}
        >
          Refresh
        </PixelButton>
      </div>
      {error ? (
        <p className="text-sm font-bold text-[var(--mt-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {points.length === 0 ? (
        <p className="text-sm text-[var(--mt-ink-muted)]">
          No {displayName} readings in this range yet.
        </p>
      ) : (
        <>
          {trendText ? <p className="text-sm text-[var(--mt-ink)]">{trendText}</p> : null}
          <ProgressLineChart
            series={series}
            yUnit={unit}
            ariaLabel={`${displayName} over time`}
          />
          <table className="mt-3 w-full text-left text-sm">
            <caption className="sr-only">{displayName} data table fallback</caption>
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
        </>
      )}
    </div>
  );
}
