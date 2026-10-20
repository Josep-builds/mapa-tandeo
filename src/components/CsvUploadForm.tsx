"use client";

import Papa from "papaparse";
import { useActionState, useState } from "react";
import { uploadReadings, type ActionState } from "@/app/panel/actions";

const initialState: ActionState = { ok: false, message: "" };

interface DeviceOption {
  id: string;
  label: string;
  block_id: string;
}

export function CsvUploadForm({ devices }: { devices: DeviceOption[] }) {
  const [state, formAction, pending] = useActionState(uploadReadings, initialState);
  const [preview, setPreview] = useState<{ rows: number; sample: Record<string, string>[] } | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      return;
    }
    file.text().then((text) => {
      const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      setPreview({ rows: parsed.data.length, sample: parsed.data.slice(0, 3) });
    });
  }

  if (devices.length === 0) {
    return <p className="text-zinc-600">Registra un medidor primero para poder subir lecturas.</p>;
  }

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold">Subir lecturas (CSV)</h2>
      <p className="text-sm text-zinc-600">Columnas: timestamp, pressure_bar. Máximo 1 MB y 5,000 filas.</p>

      <label className="block text-sm font-medium">
        Medidor
        <select name="device_id" required className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1.5">
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label} — {d.block_id}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium">
        Archivo CSV
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          onChange={handleFileChange}
          className="mt-1 block w-full text-sm"
        />
      </label>

      {preview && (
        <div className="rounded bg-zinc-50 p-2 text-xs text-zinc-700">
          <p className="font-medium">{preview.rows} filas detectadas. Vista previa:</p>
          <pre className="mt-1 overflow-x-auto">{JSON.stringify(preview.sample, null, 1)}</pre>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-800 px-5 py-2 font-bold text-white hover:bg-blue-900 disabled:opacity-60"
      >
        {pending ? "Subiendo…" : "Subir lecturas"}
      </button>

      {state.message && (
        <p className={state.ok ? "text-sm font-medium text-green-700" : "text-sm font-medium text-red-600"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
