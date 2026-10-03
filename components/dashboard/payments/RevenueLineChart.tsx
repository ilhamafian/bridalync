"use client";

import { useId } from "react";

import { formatRmShort } from "@/components/dashboard/payments/format";

const WIDTH = 320;
const HEIGHT = 150;
const PAD_LEFT = 6;
const PAD_RIGHT = 76;
const PAD_TOP = 14;
const PAD_BOTTOM = 22;
const PLOT_WIDTH = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = HEIGHT - PAD_TOP - PAD_BOTTOM;

/** Cumulative revenue across a month; the line ends at the last plotted day. */
export function RevenueLineChart({
  dailyRm,
  daysInMonth,
}: {
  dailyRm: number[];
  daysInMonth: number;
}) {
  const gradientId = useId();

  const cumulative = [0];
  for (const amount of dailyRm) {
    cumulative.push(cumulative[cumulative.length - 1] + amount);
  }
  const totalRm = cumulative[cumulative.length - 1];
  const max = Math.max(totalRm, 1);

  const x = (day: number) => PAD_LEFT + (day / daysInMonth) * PLOT_WIDTH;
  const y = (amount: number) => PAD_TOP + PLOT_HEIGHT - (amount / max) * PLOT_HEIGHT;
  const baseline = PAD_TOP + PLOT_HEIGHT;

  const points = cumulative.map((amount, day) => [x(day), y(amount)] as const);
  const line = points
    .map(([px, py], index) => `${index === 0 ? "M" : "L"}${px},${py}`)
    .join(" ");
  const [endX, endY] = points[points.length - 1];
  const area = `${line} L${endX},${baseline} L${PAD_LEFT},${baseline} Z`;
  const labelY = Math.min(Math.max(endY, PAD_TOP + 6), baseline - 4);
  const midDay = Math.round(daysInMonth / 2);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full text-primary"
      role="img"
      aria-label={`Revenue this month: ${formatRmShort(totalRm)}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>

      <line
        x1={PAD_LEFT}
        x2={PAD_LEFT + PLOT_WIDTH}
        y1={baseline}
        y2={baseline}
        className="stroke-foreground/15"
        strokeDasharray="3 3"
      />

      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={endX} cy={endY} r={3.5} fill="currentColor" />

      <text
        x={endX + 8}
        y={labelY}
        dominantBaseline="middle"
        className="fill-foreground text-[11px] font-semibold tabular-nums"
      >
        {formatRmShort(totalRm)}
      </text>

      {[1, midDay, daysInMonth].map((day) => (
        <text
          key={day}
          x={x(day - 0.5)}
          y={HEIGHT - 6}
          textAnchor="middle"
          className="fill-muted-foreground text-[9px]"
        >
          {day}
        </text>
      ))}
    </svg>
  );
}
