import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Input, Select, Button, Table, Td, Badge } from "@/components/ui";
import { CONDICIONES, num } from "@/lib/format";
import { guardarEmpresa, crearVehiculo } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const supabase = await createClient();
  const [{ data: emp }, { data: vehiculos }, { data: listas }, { data: depositos }] = await Promise.all([
    supabase.from("empresa").select("*").eq("id", 1).single(),
    supabase.from("vehiculos").select("*").order("patente"),
    supabase.from("listas_precios").select("*").order("id"),
    supabase.from("depositos").select("*").order("id"),
  ]);

  return (
    <>
      <PageHeader title="Ajustes" subtitle="Datos fiscales de la empresa, vehículos, listas y depósitos." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Empresa">
            <form action={guardarEmpresa} className="grid gap-4 sm:grid-cols-2">
              <Input label="Razón social" name="razon_social" defaultValue={emp?.razon_social ?? "NorteGAS"} required />
              <Input label="CUIT" name="cuit" defaultValue={emp?.cuit ?? ""} placeholder="20-12345678-9" />
              <Select label="Condición fiscal" name="condicion" defaultValue={emp?.condicion ?? "responsable_inscripto"}>
                {Object.entries(CONDICIONES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
              <Input label="Punto de venta" name="punto_venta" type="number" min="1" defaultValue={emp?.punto_venta ?? 1} />
              <div className="sm:col-span-2">
                <Input label="Domicilio fiscal" name="domicilio" defaultValue={emp?.domicilio ?? ""} />
              </div>
              <Input label="Nº IIBB" name="iibb" defaultValue={emp?.iibb ?? ""} />
              <Input label="Alícuota IIBB (%)" name="alicuota_iibb" type="number" step="0.01" defaultValue={emp?.alicuota_iibb ?? 3.5} />
              <Input label="Teléfono" name="telefono" defaultValue={emp?.telefono ?? ""} />
              <Input label="Email" name="email" type="email" defaultValue={emp?.email ?? ""} />
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit">Guardar empresa</Button>
              </div>
            </form>
          </Card>

          <div className="mt-6">
            <Card title="Vehículos">
              <Table head={["Patente", "Descripción", "Capacidad", "Estado"]}>
                {(vehiculos ?? []).map((v: any) => (
                  <tr key={v.id}>
                    <Td className="font-medium">{v.patente}</Td>
                    <Td className="text-muted">{v.descripcion ?? "—"}</Td>
                    <Td right>{num(v.capacidad_garrafas)} garrafas</Td>
                    <Td><Badge tone={v.activo ? "green" : "red"}>{v.activo ? "Activo" : "Inactivo"}</Badge></Td>
                  </tr>
                ))}
              </Table>
              <form action={crearVehiculo} className="mt-4 grid items-end gap-3 sm:grid-cols-[140px_1fr_140px_auto]">
                <Input label="Patente" name="patente" required placeholder="AA000AA" />
                <Input label="Descripción" name="descripcion" placeholder="Camioneta reparto" />
                <Input label="Capacidad" name="capacidad_garrafas" type="number" min="0" placeholder="80" />
                <Button type="submit" variant="secondary">Agregar</Button>
              </form>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card title="Listas de precios">
            <ul className="space-y-2 text-sm">
              {(listas ?? []).map((l: any) => (
                <li key={l.id} className="flex items-center justify-between rounded-lg border border-line bg-paper px-3 py-2">
                  <span className="font-medium">{l.nombre}</span>
                  <Badge tone={l.activa ? "green" : "red"}>{l.activa ? "Activa" : "Inactiva"}</Badge>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Las listas se gestionan en la tabla listas_precios. Cada cliente tiene una lista asignada que define sus precios.</p>
          </Card>

          <Card title="Depósitos">
            <ul className="space-y-2 text-sm">
              {(depositos ?? []).map((d: any) => (
                <li key={d.id} className="rounded-lg border border-line bg-paper px-3 py-2 font-medium">{d.nombre}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">El stock se controla por depósito. Para sumar otro, insertalo en la tabla depositos.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
