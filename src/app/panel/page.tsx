import { redirect } from "next/navigation";
import { CsvUploadForm } from "@/components/CsvUploadForm";
import { DeviceRegisterForm } from "@/components/DeviceRegisterForm";
import { DevicesList } from "@/components/DevicesList";
import { getAllBlocks, getMyDevices } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PanelPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const [blocks, devices] = await Promise.all([getAllBlocks(), getMyDevices()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Panel de promotora</h1>
        <p className="text-zinc-600">{user.email}</p>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-bold">Tus medidores</h2>
        <DevicesList devices={devices} />
      </section>

      <DeviceRegisterForm blocks={blocks} />

      <CsvUploadForm devices={devices.map((d) => ({ id: d.id, label: d.label, block_id: d.block_id }))} />
    </div>
  );
}
