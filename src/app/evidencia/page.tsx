import { SimulatedBadge } from "@/components/SimulatedBadge";
import { WeekSelector } from "@/components/WeekSelector";
import { getAllBlocks, getAvailableWeeks } from "@/lib/data";
import { EVIDENCE_METHOD_NOTES } from "@/lib/evidence";

export default async function EvidenciaPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { semana } = await searchParams;
  const weeks = await getAvailableWeeks();
  const week = semana && weeks.includes(semana) ? semana : weeks[0];
  const blocks = await getAllBlocks();
  const hasSimulatedData = blocks.some((b) => b.is_simulated);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Paquete de evidencia semanal</h1>
        {hasSimulatedData && <SimulatedBadge />}
      </div>

      <p className="text-zinc-700">
        Descarga los datos de cada cuadra para esa semana junto con un manifiesto con el hash SHA-256 de cada
        archivo, para que una clínica legal o la asamblea vecinal puedan verificar que el archivo no fue alterado.
      </p>

      {weeks.length > 0 && week && (
        <>
          <WeekSelector weeks={weeks} current={week} />

          <div className="flex flex-wrap gap-3">
            <a
              href={`/api/evidencia/csv?week=${week}`}
              className="rounded-lg bg-blue-800 px-5 py-3 font-bold text-white hover:bg-blue-900"
            >
              Descargar CSV
            </a>
            <a
              href={`/api/evidencia/manifest?week=${week}`}
              className="rounded-lg border border-blue-800 px-5 py-3 font-bold text-blue-800 hover:bg-blue-50"
            >
              Descargar manifiesto (SHA-256)
            </a>
          </div>
        </>
      )}

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">Notas de método</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
          <li>Umbral de presión útil: {EVIDENCE_METHOD_NOTES.usable_pressure_threshold_bar} bar.</li>
          <li>Regla de comparación: {EVIDENCE_METHOD_NOTES.comparison_rule}.</li>
          <li>Etiquetas: {EVIDENCE_METHOD_NOTES.labels}</li>
        </ul>
      </section>
    </div>
  );
}
