"use client";

import dynamic from "next/dynamic";
import type { Block, BlockWeekStatRow } from "@/lib/types";

const BlockMap = dynamic(() => import("./BlockMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
      Cargando mapa…
    </div>
  ),
});

export function BlockMapLoader(props: { blocks: Block[]; statsByBlock: Record<string, BlockWeekStatRow> }) {
  return <BlockMap {...props} />;
}
