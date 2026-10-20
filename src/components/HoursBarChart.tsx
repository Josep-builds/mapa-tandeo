import { colorForHours } from "@/lib/colorScale";
import type { BlockWeekStatRow } from "@/lib/types";

function formatWeek(week: string): string {
  const d = new Date(`${week}T00:00:00.000Z`);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function HoursBarChart({ stats }: { stats: BlockWeekStatRow[] }) {
  const width = 480;
  const height = 220;
  const paddingBottom = 40;
  const paddingTop = 24;
  const barGap = 16;
  const barWidth = (width - barGap * (stats.length + 1)) / Math.max(stats.length, 1);
  const maxHours = Math.max(...stats.map((s) => s.usable_hours), 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Horas con presión útil por semana" className="w-full">
      {stats.map((s, i) => {
        const barHeight = (s.usable_hours / maxHours) * (height - paddingTop - paddingBottom);
        const x = barGap + i * (barWidth + barGap);
        const y = height - paddingBottom - barHeight;
        const { bg } = colorForHours(s.usable_hours);
        return (
          <g key={s.week_start}>
            <rect x={x} y={y} width={barWidth} height={barHeight} fill={bg} rx={4} />
            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1a1a1a">
              {s.usable_hours.toFixed(1)}
            </text>
            <text x={x + barWidth / 2} y={height - paddingBottom + 16} textAnchor="middle" fontSize="11" fill="#52525b">
              {formatWeek(s.week_start)}
            </text>
            {!s.verified && (
              <text x={x + barWidth / 2} y={height - paddingBottom + 30} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#dc2626">
                no verificado
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
