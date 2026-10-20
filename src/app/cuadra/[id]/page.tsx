import Link from "next/link";
import { notFound } from "next/navigation";
import { HoursBarChart } from "@/components/HoursBarChart";
import { SimulatedBadge } from "@/components/SimulatedBadge";
import { getBlock, getStatsForBlock } from "@/lib/data";

export default async function BlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const block = await getBlock(id);
  if (!block) notFound();

  const stats = await getStatsForBlock(id);
  const latest = stats[stats.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{block.label}</h1>
          <p className="text-zinc-600">{block.colonia}</p>
        </div>
        {block.is_simulated && <SimulatedBadge />}
      </div>

      {latest && (
        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-500">Última semana registrada</p>
          <p className="text-3xl font-bold">{latest.usable_hours.toFixed(1)} h con presión útil</p>
          <p className={`mt-1 text-sm font-bold ${latest.verified ? "text-green-700" : "text-red-600"}`}>
            {latest.verified ? "Verificado" : "No verificado"}
          </p>
        </section>
      )}

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-bold">Horas por semana</h2>
        {stats.length > 0 ? <HoursBarChart stats={stats} /> : <p className="text-zinc-600">Sin datos todavía.</p>}
      </section>

      <Link
        href={`/cuadra/${block.id}/cartel`}
        className="inline-block rounded-lg bg-blue-800 px-5 py-3 font-bold text-white hover:bg-blue-900"
      >
        Imprimir cartel de la cuadra
      </Link>
    </div>
  );
}
