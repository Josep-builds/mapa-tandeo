import Link from "next/link";
import { SimulatedBadge } from "@/components/SimulatedBadge";
import { WeekSelector } from "@/components/WeekSelector";
import { getAllBlocks, getAvailableWeeks, getStatsForWeek } from "@/lib/data";
import { streetLabel } from "@/lib/format";
import { pipaPriority } from "@/lib/ml";

export default async function PrioridadPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { semana } = await searchParams;
  const weeks = await getAvailableWeeks();
  const week = semana && weeks.includes(semana) ? semana : weeks[0];

  const [blocks, stats] = await Promise.all([getAllBlocks(), week ? getStatsForWeek(week) : Promise.resolve([])]);
  const blockById = Object.fromEntries(blocks.map((b) => [b.id, b]));

  const studyStats = stats.filter((s) => blockById[s.block_id]?.grp === "study");
  const ranked = pipaPriority(
    studyStats.map((s) => ({
      block_id: s.block_id,
      sector: blockById[s.block_id].sector,
      usable_hours: s.usable_hours,
      verified: s.verified,
    })),
  );
  const hasSimulatedData = blocks.some((b) => b.is_simulated);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Prioridad de pipas gratuitas</h1>
        {hasSimulatedData && <SimulatedBadge />}
      </div>

      {weeks.length > 0 && week && <WeekSelector weeks={weeks} current={week} />}

      <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
        <strong>Regla pública:</strong> las pipas gratuitas van primero a las cuadras con menos horas.
      </p>

      {ranked.some((r) => !r.verified) && (
        <p className="text-sm text-zinc-600">
          <strong>No verificado</strong> quiere decir que el medidor de esa cuadra se ve sospechoso o no
          coincide con otro medidor de la misma cuadra; mientras se revisa, se muestra el promedio del
          sector en vez del dato propio.
        </p>
      )}

      <ol className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        {ranked.map((r, i) => (
          <li key={r.block_id} className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <Link href={`/cuadra/${r.block_id}`} className="font-medium text-blue-800 underline">
                  {blockById[r.block_id] ? streetLabel(blockById[r.block_id]) : r.block_id}
                </Link>
                <p className="text-sm text-zinc-500">{blockById[r.block_id]?.label ?? `Sector ${r.sector}`}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{r.usable_hours.toFixed(1)} h/sem</p>
              {!r.verified && (
                <p className="text-xs font-bold text-red-600">No verificado (promedio del sector)</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
