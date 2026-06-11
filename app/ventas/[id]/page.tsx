import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Badge, Table, Td, Button } from "@/components/ui";
import { ars, fechaHora, ESTADOS_PEDIDO, METODOS_PAGO } from "@/lib/format";
import { confirmarPedido, entregarPedido, cancelarPedido, facturarPedido } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function PedidoDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("pedidos")
    .select("*, clientes(id, nombre, condicion, telefono), pedido_items(*, productos(nombre, tipo)), facturas(id, tipo, punto_venta, numero)")
    .eq("id", id)
    .single();
  if (!p) notFound();

  const est = ESTADOS_PEDIDO[p.estado];
  const yaFacturado = (p.facturas ?? []).length > 0;
  const tipoSugerido = p.clientes?.condicion === "responsable_inscripto" ? "factura_a" : "factura_b";

  return (
    <>
      <PageHeader
        title={p.numero}
        subtitle={`${p.clientes?.nombre ?? ""} · ${fechaHora(p.fecha)}`}
        actions={<Badge tone={est?.tone}>{est?.label}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Productos">
            <Table head={["Producto", "Cant.", "Precio", "Env. dev.", "Subtotal"]}>
              {(p.pedido_items ?? []).map((it: any) => (
                <tr key={it.id}>
                  <Td>{it.productos?.nombre}</Td>
                  <Td right>{it.cantidad}</Td>
                  <Td right>{ars(it.precio_unitario)}</Td>
                  <Td right>{["garrafa", "cilindro"].includes(it.productos?.tipo) ? it.envases_devueltos : "—"}</Td>
                  <Td right className="font-medium">{ars(it.subtotal)}</Td>
                </tr>
              ))}
            </Table>
            <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between text-muted"><span>Subtotal</span><span className="tabular-nums">{ars(p.subtotal)}</span></div>
              <div className="flex justify-between text-muted"><span>IVA</span><span className="tabular-nums">{ars(p.iva)}</span></div>
              <div className="flex justify-between border-t border-line pt-2 font-display text-lg font-bold"><span>Total</span><span className="tabular-nums">{ars(p.total)}</span></div>
            </div>
          </Card>

          {p.observaciones && (
            <Card title="Observaciones"><p className="text-sm text-ink">{p.observaciones}</p></Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Acciones">
            <div className="space-y-2">
              {p.estado === "borrador" && (
                <>
                  <form action={async () => { "use server"; await confirmarPedido(Number(id)); }}>
                    <Button type="submit" className="w-full">Confirmar y descontar stock</Button>
                  </form>
                  <form action={async () => { "use server"; await cancelarPedido(Number(id)); }}>
                    <Button type="submit" variant="secondary" className="w-full">Cancelar pedido</Button>
                  </form>
                </>
              )}

              {(p.estado === "confirmado" || p.estado === "en_reparto") && (
                <>
                  <form
                    action={async (fd: FormData) => {
                      "use server";
                      await entregarPedido(Number(id), String(fd.get("metodo")));
                    }}
                    className="space-y-2"
                  >
                    <label className="block text-sm">
                      <span className="mb-1 block font-medium text-ink">Cobrado con</span>
                      <select name="metodo" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm">
                        {Object.entries(METODOS_PAGO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </label>
                    <Button type="submit" className="w-full">Marcar entregado y cobrar</Button>
                  </form>
                  <form action={async () => { "use server"; await cancelarPedido(Number(id)); }}>
                    <Button type="submit" variant="secondary" className="w-full">Cancelar (repone stock)</Button>
                  </form>
                </>
              )}

              {p.estado === "entregado" && !yaFacturado && (
                <form
                  action={async (fd: FormData) => {
                    "use server";
                    await facturarPedido(Number(id), String(fd.get("tipo")));
                  }}
                  className="space-y-2"
                >
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-ink">Comprobante</span>
                    <select name="tipo" defaultValue={tipoSugerido} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm">
                      <option value="factura_a">Factura A</option>
                      <option value="factura_b">Factura B</option>
                      <option value="factura_c">Factura C</option>
                    </select>
                  </label>
                  <Button type="submit" className="w-full">Generar factura</Button>
                </form>
              )}

              {yaFacturado && (
                <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-ok">
                  Facturado · <Link href="/facturacion" className="font-medium underline">ver en Facturación</Link>
                </p>
              )}
              {p.estado === "cancelado" && <p className="text-sm text-muted">Pedido cancelado.</p>}
            </div>
          </Card>

          <Card title="Cliente">
            <p className="font-medium text-ink">
              <Link href={`/clientes/${p.clientes?.id}`} className="text-brand hover:underline">{p.clientes?.nombre}</Link>
            </p>
            <p className="mt-1 text-sm text-muted">{p.clientes?.telefono ?? "Sin teléfono"}</p>
            {p.direccion_entrega && <p className="mt-1 text-sm text-muted">Entrega: {p.direccion_entrega}</p>}
            {p.metodo_pago && <p className="mt-1 text-sm text-muted">Pago: {METODOS_PAGO[p.metodo_pago]}</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
