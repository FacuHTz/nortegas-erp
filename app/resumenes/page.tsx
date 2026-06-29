import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { ResumenesTabs } from "./components/resumenes-tabs";
import type { ResumenConfigRow } from "@/lib/actions/resumenes";

export const dynamic = "force-dynamic";

export default async function ResumenesPage() {
  const supabase = await createClient();

  const { data: config } = await supabase
    .from("resumen_config")
    .select("*")
    .order("orden");

  return (
    <>
      <PageHeader
        title="Resúmenes mensuales"
        subtitle="Carga, visualización y configuración de los registros diarios de NorteGAS."
      />
      <ResumenesTabs initialConfig={(config as ResumenConfigRow[]) ?? []} />
    </>
  );
}
