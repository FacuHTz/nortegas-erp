import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Stat, Badge, Table, Td, Button, Input, Select, Empty } from "@/components/ui";
import { ars, fecha, fechaHora, CONDICIONES, METODOS_PAGO, ESTADOS_PEDIDO } from "@/lib/format";
import { registrarCobranza } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function ClienteDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: c }, { data: cc }, { data: envases }, { data: pedidos }] = await Promise.all([
    supabase.from("clientes").select("*, listas_precios(nombre)").eq("id", id).single(),
    supabase.from("movimientos_cc").select("*").eq("cliente_id", id).order("fecha", { ascending: false }).limit(60),
    supabase.from("envases_clientes").select("cantidad, productos(nombre, codigo)").eq("cliente_id", id),
    supabase.from("pedidos").select("id, numero, fecha, estado, total").eq("cliente_id", id).order("fecha", { ascending: false }).limit(10),
  ]);
  if (!c) notFound();

  const saldo = (cc ?? []).reduce((a: number, m: any) => a + Number(m.debe) - Number(m.haber), 0);
  const envasesTotal = (envases ?? []).reduce((a: number, e: any) => a + Number(e.cantidad), 0);

  return (
    <>
      <PageHeader
        title={c.nombre}
        subtitle={`${c.codigo} · ${CONDICIONES[c.condicion] ?? c.condicion}${c.cuit_dni ? ` · ${c.cuit_dni}` : ""}`}
        actions={<Badge tone={c.activo ? "green" : "red"}>{c.activo ? "Activo" : "Inactivo"}</Badge>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Saldo cuenta corriente" value={ars(saldo)} tone={saldo > 0 ? "red" : "green"} hint={saldo > 0 ? "El cliente debe" : "Al día"} />
        <Stat label="Envases en su poder" value={String(envasesTotal)} hint="Comodato / canje pendiente" />
        <Stat label="Lista de precios" value={c.listas_precios?.nombre ?? "—"} hint={c.zona_reparto ? `Zona: ${c.zona_reparto}` : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Cuenta corriente">
            {(cc ?? []).length === 0 ? (
              <p className="text-sm text-muted">Sin movimientos.</p>
            ) : (
              <Table head={["Fecha", "Concepto", "Debe", "Haber"]}>
                {(cc ?? []).map((m: any) => (
                  <tr key={m.id}>
                    <Td className="text-muted">{fechaHora(m.fecha)}</Td>
                    <Td>{m.concepto}{m.referencia ? <span className="text-muted"> · {m.referencia}</span> : null}</Td>
                    <Td right className={Number(m.debe) > 0 ? "font-medium text-danger" : "text-muted"}>{Number(m.debe) > 0 ? ars(m.debe) : "—"}</Td>
                    <Td right className={Number(m.haber) > 0 ? "font-medium text-success" : "text-muted"}>{Number(m.haber) > 0 ? ars(m.haber) : "—"}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>

          <Card title="Últimos pedidos">
            {(pedidos ?? []).length === 0 ? (
              <p className="text-sm text-muted">Todavía no tiene pedidos.</p>
            ) : (
              <Table head={["Número", "Fecha", "Estado", "Total"]}>
                {(pedidos ?? []).map((p: any) => {
                  const est = ESTADOS_PEDIDO[p.estado];
                  return (
                    <tr key={p.id}>
                      <Td><Link href={`/ventas/${p.id}`} className="font-medium text-brand hover:underline">{p.numero}</Link></Td>
                      <Td className="text-muted">{fecha(p.fecha)}</Td>
                      <Td><Badge tone={est?.tone}>{est?.label}</Badge></Td>
                      <Td right className="font-medium">{ars(p.total)}</Td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Registrar cobranza">
            <form action={registrarCobranza} className="space-y-3">
              <input type="hidden" name="cliente_id" value={c.id} />
              <Input label="Monto" name="monto" type="number" step="0.01" min="0.01" required placeholder="0,00" />
              <Select label="Método" name="metodo" defaultValue="efectivo">
                {Object.entries(METODOS_PAGO).filter(([k]) => k !== "cuenta_corriente").map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
              <Input label="Referencia" name="referencia" placeholder="Recibo, transferencia…" />
              <Input label="Notas" name="notas" placeholder="Opcional" />
              <Button type="submit" className="w-full">Registrar cobranza</Button>
              <p className="text-xs text-muted">Acredita en la cuenta corriente y registra el ingreso en caja.</p>
            </form>
          </Card>

          <Card title="Envases en poder del cliente">
            {(envases ?? []).length === 0 ? (
              <p className="text-sm text-muted">No tiene envases pendientes.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(envases ?? []).map((e: any, i: number) => (
                  <li key={i} className="flex items-center justify-between rounded-lg border border-line bg-paper px-3 py-2">
                    <span>{e.productos?.nombre}</span>
                    <span className="font-semibold tabular-nums">{Number(e.cantidad)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Datos">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">Teléfono</dt><dd>{c.telefono ?? "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Email</dt><dd className="truncate">{c.email ?? "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Dirección</dt><dd className="text-right">{c.direccion ?? "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Localidad</dt><dd>{c.localidad ?? "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Tipo</dt><dd className="capitalize">{c.tipo}</dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
