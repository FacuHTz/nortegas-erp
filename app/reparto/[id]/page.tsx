import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Table, Td, Badge, Button, Select } from "@/components/ui";
import { ars, fecha, METODOS_PAGO } from "@/lib/format";
import { asignarPedidoARuta, cambiarEstadoRuta, entregarPedido } from "@/lib/actions";

export const dynamic = "force-dynamic";

const ESTADOS_RUTA: Record<string, { label: string; tone: string }> = {
  planificada: { label: "Planificada", tone: "blue" },
  en_curso: { label: "En curso", tone: "amber" },
  cerrada: { label: "Cerrada", tone: "green" },
};

export default async function RutaDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rutaId = Number(id);
  const supabase = await createClient();

  const [{ data: ruta }, { data: enRuta }, { data: disponibles }] = await Promise.all([
    supabase.from("rutas_reparto").select("*, perfiles(nombre), vehiculos(patente, capacidad_garrafas)").eq("id", id).single(),
    supabase.from("pedidos").select("id, numero, estado, total, direccion_entrega, clientes(nombre, telefono, zona_reparto)").eq("ruta_id", id).order("id"),
    supabase.from("pedidos").select("id, numero, total, direccion_entrega, clientes(nombre, zona_reparto)").eq("estado", "confirmado").is("ruta_id", null).order("id"),
  ]);
  if (!ruta) notFound();

  const est = ESTADOS_RUTA[ruta.estado];
  const entregados = (enRuta ?? []).filter((p: any) => p.estado === "entregado").length;
  const totalRuta = (enRuta ?? []).reduce((a: number, p: any) => a + Number(p.total), 0);

  return (
    <>
      <PageHeader
        title={`Ruta del ${fecha(ruta.fecha)}`}
        subtitle={`${ruta.perfiles?.nombre ?? "Sin chofer"} · ${ruta.vehiculos?.patente ?? "Sin vehículo"} · ${entregados}/${(enRuta ?? []).length} entregados · ${ars(totalRuta)}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={est?.tone}>{est?.label}</Badge>
            {ruta.estado === "planificada" && (
              <form action={async () => { "use server"; await cambiarEstadoRuta(rutaId, "en_curso"); }}>
                <Button type="submit" variant="secondary">Iniciar ruta</Button>
              </form>
            )}
            {ruta.estado === "en_curso" && (
              <form action={async () => { "use server"; await cambiarEstadoRuta(rutaId, "cerrada"); }}>
                <Button type="submit" variant="secondary">Cerrar ruta</Button>
              </form>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Pedidos en la ruta">
            {(enRuta ?? []).length === 0 ? (
              <p className="text-sm text-muted">Todavía no asignaste pedidos. Sumalos desde el panel de la derecha.</p>
            ) : (
              <Table head={["Pedido", "Cliente", "Dirección", "Total", "Entrega"]}>
                {(enRuta ?? []).map((p: any) => (
                  <tr key={p.id}>
                    <Td><Link href={`/ventas/${p.id}`} className="font-medium text-brand hover:underline">{p.numero}</Link></Td>
                    <Td>
                      <span className="font-medium">{p.clientes?.nombre}</span>
                      {p.clientes?.telefono && <span className="block text-xs text-muted">{p.clientes.telefono}</span>}
                    </Td>
                    <Td className="text-muted">{p.direccion_entrega ?? p.clientes?.zona_reparto ?? "—"}</Td>
                    <Td right className="font-medium">{ars(p.total)}</Td>
                    <Td>
                      {p.estado === "entregado" ? (
                        <Badge tone="green">Entregado</Badge>
                      ) : (
                        <form
                          action={async (fd: FormData) => {
                            "use server";
                            await entregarPedido(p.id, String(fd.get("metodo") || "efectivo"));
                          }}
                          className="flex items-center gap-2"
                        >
                          <Select name="metodo" defaultValue="efectivo" className="!py-1.5 text-xs">
                            {Object.entries(METODOS_PAGO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </Select>
                          <Button type="submit" className="!px-3 !py-1.5 text-xs">Entregar</Button>
                        </form>
                      )}
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>

        <div>
          <Card title="Pedidos confirmados sin ruta">
            {(disponibles ?? []).length === 0 ? (
              <p className="text-sm text-muted">No hay pedidos pendientes de asignación.</p>
            ) : (
              <ul className="space-y-2">
                {(disponibles ?? []).map((p: any) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-paper px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.numero} · {p.clientes?.nombre}</p>
                      <p className="truncate text-xs text-muted">{p.direccion_entrega ?? p.clientes?.zona_reparto ?? "Sin dirección"} · {ars(p.total)}</p>
                    </div>
                    <form action={async () => { "use server"; await asignarPedidoARuta(p.id, rutaId); }}>
                      <Button type="submit" variant="secondary" className="!px-3 !py-1.5 text-xs">Asignar</Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted">Al asignar, el pedido pasa a estado “En reparto”.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
