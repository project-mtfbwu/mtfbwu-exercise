export type ChartPoint = { x: number; y: number; label: string };

export type LineChartSeries = {
  id: string;
  label: string;
  points: ChartPoint[];
  color?: string;
};

export type LineChartProps = {
  width?: number;
  height?: number;
  series: LineChartSeries[];
  yUnit?: string;
  ariaLabel?: string;
};

function computeBounds(series: readonly LineChartSeries[]) {
  const allPoints = series.flatMap((s) => s.points);
  if (!allPoints.length) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  }
  const xs = allPoints.map((p) => p.x);
  const ys = allPoints.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const yPad = maxY === minY ? 1 : (maxY - minY) * 0.1;
  return { minX, maxX, minY: minY - yPad, maxY: maxY + yPad };
}

function scale(value: number, min: number, max: number, size: number, pad: number) {
  if (max === min) return size / 2;
  return pad + ((value - min) / (max - min)) * (size - pad * 2);
}

/** Pure SVG line chart with accessible table fallback in the caller. */
export function ProgressLineChart({
  width = 320,
  height = 160,
  series,
  yUnit = "",
  ariaLabel = "Progress chart",
}: LineChartProps) {
  const pad = 12;
  const { minX, maxX, minY, maxY } = computeBounds(series);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      className="border-2 border-[var(--mt-ink)] bg-[var(--mt-surface)]"
    >
      <rect x={0} y={0} width={width} height={height} fill="var(--mt-surface)" />
      {series.map((s) => {
        if (s.points.length < 2) return null;
        const d = s.points
          .map((p, i) => {
            const x = scale(p.x, minX, maxX, width, pad);
            const y = height - scale(p.y, minY, maxY, height, pad);
            return `${i === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ");
        return (
          <g key={s.id}>
            <path
              d={d}
              fill="none"
              stroke={s.color ?? "var(--mt-accent-cyan)"}
              strokeWidth={2}
            />
            {s.points.map((p) => {
              const x = scale(p.x, minX, maxX, width, pad);
              const y = height - scale(p.y, minY, maxY, height, pad);
              return (
                <circle
                  key={`${s.id}-${p.label}`}
                  cx={x}
                  cy={y}
                  r={3}
                  fill="var(--mt-ink)"
                />
              );
            })}
          </g>
        );
      })}
      {yUnit ? (
        <text x={pad} y={pad} fontSize={10} fill="var(--mt-ink-muted)">
          {yUnit}
        </text>
      ) : null}
    </svg>
  );
}

export function chartPointsFromDatedValues(
  points: readonly { localDate: string; value: number }[],
): ChartPoint[] {
  return points.map((p, index) => ({
    x: index,
    y: p.value,
    label: p.localDate,
  }));
}

export function chartTableRows(
  points: readonly { localDate: string; value: number }[],
  unit: string,
): { date: string; value: string }[] {
  return points.map((p) => ({
    date: p.localDate,
    value: `${p.value} ${unit}`.trim(),
  }));
}
