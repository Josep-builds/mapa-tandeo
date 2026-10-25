import { SimulatedBadge } from "@/components/SimulatedBadge";
import { getAllBlocks, getFlags } from "@/lib/data";
import { streetLabel } from "@/lib/format";

const REASON_LABELS: Record<string, string> = {
  two_logger_mismatch: "Los dos medidores de la cuadra no concuerdan",
};

function describeReason(reason: string): string {
  if (reason in REASON_LABELS) return REASON_LABELS[reason];
  if (reason.startsWith("anomalous_device:")) return "Un medidor se comporta de forma anómala";
  return reason;
}

function formatWeek(week: string): string {
  const d = new Date(`${week}T00:00:00.000Z`);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function RegistroDeAlteracionesPage() {
  const [flags, blocks] = await Promise.all([getFlags(), getAllBlocks()]);
  const blockById = Object.fromEntries(blocks.map((b) => [b.id, b]));
  const hasSimulatedData = blocks.some((b) => b.is_simulated);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Registro público de alteraciones</h1>
        {hasSimulatedData && <SimulatedBadge />}
      </div>

      <p className="text-zinc-700">
        Cuando un medidor se comporta de forma sospechosa, o dos medidores de la misma cuadra no concuerdan, la
        cuadra se marca &quot;no verificada&quot; y se publica aquí. Mientras tanto se usa el promedio del sector en
        vez del dato propio.
      </p>

      {flags.length === 0 ? (
        <p className="text-zinc-600">No hay alteraciones registradas.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {flags.map((flag) => (
            <li key={flag.id} className="p-4">
              <p className="font-bold">
                {blockById[flag.block_id ?? ""] ? streetLabel(blockById[flag.block_id ?? ""]) : flag.block_id}
              </p>
              <p className="text-sm text-zinc-500">
                {blockById[flag.block_id ?? ""]?.label} · Semana del {formatWeek(flag.week_start)}
              </p>
              <p className="mt-1">{describeReason(flag.reason)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
