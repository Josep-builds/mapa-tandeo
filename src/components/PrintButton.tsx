"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-blue-800 px-5 py-2 font-bold text-white"
    >
      Imprimir
    </button>
  );
}
