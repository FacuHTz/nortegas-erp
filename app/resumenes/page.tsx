import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { ResumenesTabs } from "./components/resumenes-tabs";
import type { ResumenConfigRow, CampoConfig } from "@/lib/actions/resumenes";

export const dynamic = "force-dynamic";

export default async function ResumenesPage() {
  const supabase = await createClient();

  const [{ data: config }, { data: camposTodos }] = await Promise.all([
    supabase.from("resumen_config").select("*").order("orden"),
    // Traer TODOS los campos (activos e inactivos) ordenados para Configuración
    supabase.from("campos_config").select("*").order("es_base", { ascending: false }).order("grupo").order("orden"),
  ]);

  // Solo los activos para carga/resumen/grilla
  const camposActivos = ((camposTodos as CampoConfig[]) ?? []).filter((c) => c.activo);

  return (
    <>
      <PageHeader
        title="Resúmenes mensuales"
        subtitle="Carga, visualización y configuración de los registros diarios de NorteGAS."
      />
      <ResumenesTabs
        initialConfig={(config as ResumenConfigRow[]) ?? []}
        initialCampos={camposActivos}
        initialCamposTodos={(camposTodos as CampoConfig[]) ?? []}
      />
    </>
  );
}
