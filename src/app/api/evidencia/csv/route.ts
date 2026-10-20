import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStatsForWeek } from "@/lib/data";
import { buildBlockWeekStatsCsv } from "@/lib/evidence";

const QuerySchema = z.object({ week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export async function GET(request: NextRequest) {
  const parsed = QuerySchema.safeParse({ week: request.nextUrl.searchParams.get("week") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetro 'week' inválido. Use formato YYYY-MM-DD." }, { status: 400 });
  }

  const stats = await getStatsForWeek(parsed.data.week);
  const csv = buildBlockWeekStatsCsv(stats);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="block_week_stats_${parsed.data.week}.csv"`,
    },
  });
}
