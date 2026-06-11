import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Table, Td, Badge, Input, Select, Button, Empty } from "@/components/ui";
import { fecha } from "@/lib/format";
import { crearRuta } from "@/lib/actions";

export const dynamic = "force-dynamic";

const ESTADOS_RUTA: Record<string, { label: string; tone: string }> = {
  planificada: { label: "Planificada", tone: "blue" },
  en_curso: { label: "En curso", tone: "amber" },
  cerrada: { label: "Cerrada", tone: "green" },
};

export default async function RepartoPage() {
  const supabase = await createClient();
  const [{ data: rutas }, { data: choferes }, { data: vehiculos }, { data: pendientes }] = await Promise.all([
    supabase.from("rutas_reparto").select("*, perfiles(nombre), vehiculos(patente), pedidos(id)").order("fecha", { ascending: false }).limit(40),
    supabase.from("perfiles").select("id, nombre, rol").eq("activo", true).order("nombre"),
    supabase.from("vehiculos").select("id, patente, descripcion").eq("activo", true).order("patente"),
    supabase.from("pedidos").select("id").eq("estado", "confirmado").is("ruta_id", null),
  ]);

  return (
    <>
      <PageHeader title="Reparto" subtitle={`Hojas de ruta y entregas a domicilio. ${(pendientes ?? []).length} pedidos confirmados sin asignar.`} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Rutas">
            {(rutas ?? []).length === 0 ? (
              <Empty title="Sin rutas creadas" hint="Armá la primera hoja de ruta desde el panel de la derecha." />
            ) : (
              <Table head={["Fecha", "Chofer", "Vehículo", "Pedidos", "Estado", ""]}>
                {(rutas ?? []).map((r: any) => {
                  const est = ESTADOS_RUTA[r.estado];
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/60">
                      <Td className="font-medium">{fecha(r.fecha)}</Td>
                      <Td>{r.perfiles?.nombre ?? "—"}</Td>
                      <Td className="text-muted">{r.vehiculos?.patente ?? "—"}</Td>
                      <Td right>{(r.pedidos ?? []).length}</Td>
                      <Td><Badge tone={est?.tone}>{est?.label}</Badge></Td>
                      <Td right><Link href={`/reparto/${r.id}`} className="text-sm font-medium text-brand hover:underline">Abrir</Link></Td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </Card>
        </div>

        <div>
          <Card title="Nueva hoja de ruta">
            <form action={crearRuta} className="space-y-3">
              <Input label="Fecha" name="fecha" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
              <Select label="Chofer" name="chofer_id" required>
                {(choferes ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nombre}{c.rol === "chofer" ? "" : ` (${c.rol})`}</option>
                ))}
              </Select>
              <Select label="Vehículo" name="vehiculo_id">
                <option value="">Sin vehículo</option>
                {(vehiculos ?? []).map((v: any) => (
                  <option key={v.id} value={v.id}>{v.patente}{v.descripcion ? ` · ${v.descripcion}` : ""}</option>
                ))}
              </Select>
              <Input label="Notas" name="notas" placeholder="Zona, observaciones…" />
              <Button type="submit" className="w-full">Crear ruta</Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
