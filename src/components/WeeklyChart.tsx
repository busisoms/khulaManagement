import { formatDate, formatRands } from "@/lib/format";

/** Plain SVG bar chart: money in vs money spent per week. */
export function WeeklyChart({ weeks }: { weeks: { start: Date; incomeCents: number; expensesCents: number }[] }) {
  const max = Math.max(1, ...weeks.flatMap((w) => [w.incomeCents, w.expensesCents]));
  const W = 640;
  const H = 220;
  const pad = { top: 10, bottom: 40, left: 8 };
  const slot = (W - pad.left) / weeks.length;
  const barW = Math.min(26, slot / 3);
  const h = (c: number) => ((H - pad.top - pad.bottom) * c) / max;

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Money in and money spent per week for the last 8 weeks">
        <line x1="0" x2={W} y1={H - pad.bottom} y2={H - pad.bottom} stroke="#e3e8ee" />
        {weeks.map((w, i) => {
          const x = pad.left + i * slot + slot / 2;
          return (
            <g key={i}>
              <rect x={x - barW - 2} y={H - pad.bottom - h(w.incomeCents)} width={barW} height={h(w.incomeCents)} rx="3" fill="#047857">
                <title>{`Week of ${formatDate(w.start)}: money in ${formatRands(w.incomeCents)}`}</title>
              </rect>
              <rect x={x + 2} y={H - pad.bottom - h(w.expensesCents)} width={barW} height={h(w.expensesCents)} rx="3" fill="#f59e0b">
                <title>{`Week of ${formatDate(w.start)}: money spent ${formatRands(w.expensesCents)}`}</title>
              </rect>
              <text x={x} y={H - 10} textAnchor="middle" fontSize="20" fill="#5b6676">
                {i % 2 === 0 ? formatDate(w.start) : ""}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex gap-5 text-sm text-muted">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-brand" /> Money in
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#f59e0b]" /> Money spent
        </span>
      </figcaption>
    </figure>
  );
}
