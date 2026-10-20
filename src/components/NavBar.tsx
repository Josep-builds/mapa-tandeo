import Link from "next/link";

const LINKS = [
  { href: "/", label: "Mapa" },
  { href: "/prioridad", label: "Prioridad de pipas" },
  { href: "/registro-de-alteraciones", label: "Registro de alteraciones" },
  { href: "/evidencia", label: "Evidencia" },
];

export function NavBar() {
  return (
    <header className="no-print border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-blue-900">
          Mapa de Tandeo
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium text-blue-800">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
