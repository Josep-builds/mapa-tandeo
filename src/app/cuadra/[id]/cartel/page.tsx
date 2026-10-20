import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { PrintButton } from "@/components/PrintButton";
import { getBlock, getStatsForBlock } from "@/lib/data";

function weekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const fmt = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "long", timeZone: "UTC" });
  return `${fmt(start)} al ${fmt(end)}`;
}

export default async function CartelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const block = await getBlock(id);
  if (!block) notFound();

  const stats = await getStatsForBlock(id);
  const latest = stats[stats.length - 1];

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  const url = `${proto}://${host}/cuadra/${id}`;
  const qrSvg = await QRCode.toString(url, { type: "svg", margin: 1, width: 180 });

  return (
    <div className="mx-auto max-w-xl space-y-8 bg-white py-8 text-center print:py-0">
      <div className="no-print mb-4">
        <PrintButton />
      </div>

      <p className="text-lg font-bold text-zinc-700">Cuadra {block.id}</p>
      <h1 className="text-3xl font-black leading-tight">{block.label}</h1>
      <p className="text-xl text-zinc-700">{block.colonia}</p>

      {latest ? (
        <>
          <p className="text-2xl font-bold text-zinc-800">Semana del {weekRange(latest.week_start)}</p>
          <p className="text-[6rem] font-black leading-none text-blue-900">{latest.usable_hours.toFixed(1)}</p>
          <p className="text-3xl font-bold text-zinc-800">horas con agua suficiente para llenar el tinaco</p>
          <p className="text-xl font-medium text-zinc-700">
            {latest.verified
              ? "Este dato fue confirmado."
              : "Este dato está en revisión; se usó el promedio del sector mientras se confirma."}
          </p>
        </>
      ) : (
        <p className="text-2xl text-zinc-700">Todavía no hay datos de esta cuadra.</p>
      )}

      <div className="flex flex-col items-center gap-2">
        <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <p className="text-sm text-zinc-500">Escanea para ver esta cuadra en línea</p>
      </div>
    </div>
  );
}
