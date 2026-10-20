import type { MyDevice } from "@/lib/data";

function formatDateTime(iso: string | null): string {
  if (!iso) return "Sin lecturas todavía";
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

export function DevicesList({ devices }: { devices: MyDevice[] }) {
  if (devices.length === 0) {
    return <p className="text-zinc-600">Todavía no registras ningún medidor.</p>;
  }

  return (
    <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
      {devices.map((d) => (
        <li key={d.id} className="p-4">
          <p className="font-bold">{d.label}</p>
          <p className="text-sm text-zinc-600">Cuadra: {d.block_id}</p>
          <p className="text-sm text-zinc-600">
            {d.before_shutoff_valve ? "Instalado antes de la llave de paso" : "No verificado antes de la llave de paso"}
          </p>
          <p className="text-sm text-zinc-500">Última lectura: {formatDateTime(d.last_upload_at)}</p>
        </li>
      ))}
    </ul>
  );
}
