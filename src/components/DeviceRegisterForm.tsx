"use client";

import { useActionState } from "react";
import { registerDevice, type ActionState } from "@/app/panel/actions";
import type { Block } from "@/lib/types";

const initialState: ActionState = { ok: false, message: "" };

export function DeviceRegisterForm({ blocks }: { blocks: Block[] }) {
  const [state, formAction, pending] = useActionState(registerDevice, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold">Registrar medidor</h2>

      <label className="block text-sm font-medium">
        Cuadra
        <select name="block_id" required className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1.5">
          <option value="">Selecciona una cuadra…</option>
          {blocks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.id} — {b.label}, {b.colonia}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium">
        Nombre del medidor
        <input
          type="text"
          name="label"
          required
          maxLength={60}
          placeholder="Ej. Toma de la esquina"
          className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1.5"
        />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="before_shutoff_valve" />
        Instalado antes de la llave de paso
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-800 px-5 py-2 font-bold text-white hover:bg-blue-900 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Registrar"}
      </button>

      {state.message && (
        <p className={state.ok ? "text-sm font-medium text-green-700" : "text-sm font-medium text-red-600"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
