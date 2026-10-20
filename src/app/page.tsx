import Link from "next/link";
import { BlockMapLoader } from "@/components/BlockMapLoader";
import { SimulatedBadge } from "@/components/SimulatedBadge";
import { WeekSelector } from "@/components/WeekSelector";
import { getAllBlocks, getAvailableWeeks, getStatsForWeek } from "@/lib/data";
import { inequalityRatio, median } from "@/lib/ml";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { semana } = await searchParams;
  const weeks = await getAvailableWeeks();
  const week = semana && weeks.includes(semana) ? semana : weeks[0];

  const [blocks, stats] = await Promise.all([getAllBlocks(), week ? getStatsForWeek(week) : Promise.resolve([])]);
  const blockById = Object.fromEntries(blocks.map((b) => [b.id, b]));
  const statsByBlock = Object.fromEntries(stats.map((s) => [s.block_id, s]));

  const studyHours = stats.filter((s) => blockById[s.block_id]?.grp === "study").map((s) => s.usable_hours);
  const comparisonHours = stats.filter((s) => blockById[s.block_id]?.grp === "comparison").map((s) => s.usable_hours);
  const ratio = inequalityRatio(comparisonHours, studyHours);
  const hasSimulatedData = blocks.some((b) => b.is_simulated);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {hasSimulatedData && <SimulatedBadge />}
        {weeks.length > 0 && week && <WeekSelector weeks={weeks} current={week} />}
      </div>

      {!week ? (
        <p className="text-zinc-600">Todavía no hay datos publicados.</p>
      ) : (
        <>
          <BlockMapLoader blocks={blocks} statsByBlock={statsByBlock} />

          <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold">Horas con presión útil por semana</h2>
            <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-zinc-500">Iztapalapa (mediana)</dt>
                <dd className="text-2xl font-bold">{median(studyHours).toFixed(1)} h</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Colonia de comparación (mediana)</dt>
                <dd className="text-2xl font-bold">{median(comparisonHours).toFixed(1)} h</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Desigualdad</dt>
                <dd className="text-2xl font-bold text-red-700">{Number.isFinite(ratio) ? `${ratio.toFixed(1)}×` : "—"}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-zinc-600">
              <strong>¿Qué significa?</strong> Son las horas a la semana en que la presión del agua alcanza para
              llenar un tinaco en la azotea.
            </p>
          </section>

          <Link href="/prioridad" className="inline-block font-medium text-blue-700 underline">
            Ver prioridad de pipas →
          </Link>
        </>
      )}
    </div>
  );
}
