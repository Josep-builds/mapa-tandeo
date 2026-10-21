"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { colorForHours } from "@/lib/colorScale";
import type { Block, BlockWeekStatRow } from "@/lib/types";

function FitBounds({ positions }: { positions: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    // Fit to Iztapalapa (the study blocks) on load — the comparison colonia
    // sits ~12km away, and including it in the fit would zoom back out far
    // enough that the tightly-packed Iztapalapa blocks overlap again.
    map.fitBounds(L.latLngBounds(positions), { padding: [32, 32], maxZoom: 17 });
  }, [map, positions]);
  return null;
}

function makeIcon(hours: number) {
  const { bg, fg } = colorForHours(hours);
  const label = hours >= 100 ? Math.round(hours).toString() : hours.toFixed(1);
  return L.divIcon({
    className: "",
    html: `<div style="background:${bg};color:${fg};border-radius:4px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;border:1.5px solid white;box-shadow:0 1px 2px rgba(0,0,0,0.4);">${label}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

interface Props {
  blocks: Block[];
  statsByBlock: Record<string, BlockWeekStatRow>;
}

export default function BlockMap({ blocks, statsByBlock }: Props) {
  const center: [number, number] = [19.355, -99.055];
  const studyPositions: Array<[number, number]> = blocks
    .filter((b) => b.grp === "study" && statsByBlock[b.id])
    .map((b) => [b.lat, b.lng]);

  return (
    <MapContainer center={center} zoom={15} style={{ height: "400px", width: "100%" }} scrollWheelZoom={false}>
      <FitBounds positions={studyPositions} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {blocks.map((block) => {
        const stat = statsByBlock[block.id];
        if (!stat) return null;
        return (
          <Marker key={block.id} position={[block.lat, block.lng]} icon={makeIcon(stat.usable_hours)}>
            <Popup>
              <div className="text-sm">
                <p className="font-bold">{block.label}</p>
                <p>{block.colonia}</p>
                <p>{stat.usable_hours.toFixed(1)} h/semana con presión útil</p>
                {!stat.verified && (
                  <p className="font-bold text-red-600">No verificado (promedio del sector)</p>
                )}
                <Link href={`/cuadra/${block.id}`} className="text-blue-700 underline">
                  Ver cuadra
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
