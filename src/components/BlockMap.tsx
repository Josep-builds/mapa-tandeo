"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { colorForHours } from "@/lib/colorScale";
import { streetLabel } from "@/lib/format";
import { haversineKm } from "@/lib/geo";
import type { Block, BlockWeekStatRow } from "@/lib/types";

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

interface MapContentsProps {
  blocks: Block[];
  statsByBlock: Record<string, BlockWeekStatRow>;
  studyPositions: Array<[number, number]>;
  selected: Block | null;
  markerRefs: React.MutableRefObject<Record<string, L.Marker | null>>;
}

function MapContents({ blocks, statsByBlock, studyPositions, selected, markerRefs }: MapContentsProps) {
  const map = useMap();

  // Fit to Iztapalapa (the study blocks) once on load — the comparison
  // colonia sits ~12km away, and including it would zoom back out far
  // enough that the tightly-packed Iztapalapa blocks overlap again.
  useEffect(() => {
    if (studyPositions.length === 0) return;
    map.fitBounds(L.latLngBounds(studyPositions), { padding: [32, 32], maxZoom: 17 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A search result or "usar mi ubicación" pick flies to that block and
  // opens its popup once the pan finishes.
  useEffect(() => {
    if (!selected) return;
    map.flyTo([selected.lat, selected.lng], 17, { duration: 0.8 });
    const marker = markerRefs.current[selected.id];
    if (marker) {
      map.once("moveend", () => marker.openPopup());
    }
  }, [selected, map, markerRefs]);

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {blocks.map((block) => {
        const stat = statsByBlock[block.id];
        if (!stat) return null;
        return (
          <Marker
            key={block.id}
            position={[block.lat, block.lng]}
            icon={makeIcon(stat.usable_hours)}
            ref={(instance) => {
              markerRefs.current[block.id] = instance;
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold">{streetLabel(block)}</p>
                <p className="text-xs text-zinc-500">
                  {block.label} · {block.colonia}
                </p>
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
    </>
  );
}

interface Props {
  blocks: Block[];
  statsByBlock: Record<string, BlockWeekStatRow>;
}

export default function BlockMap({ blocks, statsByBlock }: Props) {
  const center: [number, number] = [19.355, -99.055];
  const studyBlocks = useMemo(
    () => blocks.filter((b) => b.grp === "study" && statsByBlock[b.id]),
    [blocks, statsByBlock],
  );
  const studyPositions = useMemo<Array<[number, number]>>(
    () => studyBlocks.map((b) => [b.lat, b.lng]),
    [studyBlocks],
  );

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Block | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "locating" | "error">("idle");
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return studyBlocks.filter((b) => b.street_label.toLowerCase().includes(q)).slice(0, 6);
  }, [query, studyBlocks]);

  function selectBlock(block: Block) {
    setQuery("");
    setGeoStatus("idle");
    setSelected(block);
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setGeoStatus("error");
      return;
    }
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Used once, entirely in the browser, to find the nearest block —
        // never sent to our server, never stored anywhere.
        const { latitude, longitude } = pos.coords;
        let nearest: Block | null = null;
        let nearestDist = Infinity;
        for (const b of studyBlocks) {
          const d = haversineKm(latitude, longitude, b.lat, b.lng);
          if (d < nearestDist) {
            nearestDist = d;
            nearest = b;
          }
        }
        setGeoStatus("idle");
        if (nearest) selectBlock(nearest);
      },
      () => setGeoStatus("error"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[180px] flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca tu calle…"
            aria-label="Busca tu calle"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          {matches.length > 0 && (
            <ul className="absolute z-[1000] mt-1 w-full rounded border border-zinc-300 bg-white shadow-lg">
              {matches.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => selectBlock(b)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                  >
                    <span className="font-medium">{b.street_label}</span>
                    <span className="block text-xs text-zinc-500">{b.label} (simulado)</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={geoStatus === "locating"}
          className="rounded bg-blue-800 px-3 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-60"
        >
          {geoStatus === "locating" ? "Buscando…" : "Usar mi ubicación"}
        </button>
      </div>

      {geoStatus === "error" && (
        <p className="text-sm text-red-600">
          No pudimos usar tu ubicación. Revisa los permisos de ubicación de tu navegador, o busca tu calle
          arriba.
        </p>
      )}

      <MapContainer center={center} zoom={15} style={{ height: "400px", width: "100%" }} scrollWheelZoom={false}>
        <MapContents
          blocks={blocks}
          statsByBlock={statsByBlock}
          studyPositions={studyPositions}
          selected={selected}
          markerRefs={markerRefs}
        />
      </MapContainer>
    </div>
  );
}
