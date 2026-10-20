import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStatsForWeek } from "@/lib/data";
import { buildBlockWeekStatsCsv, buildManifest } from "@/lib/evidence";

const QuerySchema = z.object({ week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export async function GET(request: NextRequest) {
  const parsed = QuerySchema.safeParse({ week: request.nextUrl.searchParams.get("week") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetro 'week' inválido. Use formato YYYY-MM-DD." }, { status: 400 });
  }

  const stats = await getStatsForWeek(parsed.data.week);
  const csv = buildBlockWeekStatsCsv(stats);
  const manifest = await buildManifest(parsed.data.week, csv);

  return new NextResponse(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="manifest_${parsed.data.week}.json"`,
    },
  });
}
