"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

function formatWeek(week: string): string {
  const d = new Date(`${week}T00:00:00.000Z`);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function WeekSelector({ weeks, current }: { weeks: string[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(week: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("semana", week);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      Semana:
      <select
        className="rounded border border-zinc-300 bg-white px-2 py-1"
        value={current}
        onChange={(e) => onChange(e.target.value)}
      >
        {weeks.map((week) => (
          <option key={week} value={week}>
            {formatWeek(week)}
          </option>
        ))}
      </select>
    </label>
  );
}
