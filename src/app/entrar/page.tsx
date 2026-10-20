import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function EntrarPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/panel");

  return (
    <div className="mx-auto max-w-sm space-y-6 text-center">
      <h1 className="text-xl font-bold">Acceso para promotoras</h1>
      <p className="text-zinc-700">
        Esta sección es para registrar un medidor de presión y subir sus lecturas. Las familias no necesitan entrar
        aquí: pueden ver todo en el mapa público.
      </p>
      <GoogleSignInButton />
    </div>
  );
}
