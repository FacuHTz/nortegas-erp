import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Stat, Table, Td, Badge, Input, Select, Button } from "@/components/ui";
import { ars, fecha, fechaHora, METODOS_PAGO } from "@/lib/format";
import { registrarMovimientoCaja, registrarGasto } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function TesoreriaPage() {
  const supabase = await createClient();
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  const [{ data: movs }, { data: gastos }, { data: proveedores }] = await Promise.all([
    supabase.from("caja_movimientos").select("*").order("fecha", { ascending: false }).limit(200),
    supabase.from("gastos").select("*, proveedores(nombre)").order("fecha", { ascending: false }).limit(15),
    supabase.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  const saldo = (movs ?? []).reduce((a: number, m: any) => a + (m.tipo === "ingreso" ? 1 : -1) * Number(m.monto), 0);
  const deHoy = (movs ?? []).filter((m: any) => new Date(m.fecha) >= hoy);
  const ingresosHoy = deHoy.filter((m: any) => m.tipo === "ingreso").reduce((a: number, m: any) => a + Number(m.monto), 0);
  const egresosHoy = deHoy.filter((m: any) => m.tipo === "egreso").reduce((a: number, m: any) => a + Number(m.monto), 0);

  return (
    <>
      <PageHeader title="Tesorería" subtitle="Caja, ingresos, egresos y gastos del negocio." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Saldo de caja" value={ars(saldo)} tone={saldo >= 0 ? "brand" : "red"} hint="Últimos 200 movimientos" />
        <Stat label="Ingresos de hoy" value={ars(ingresosHoy)} tone="green" />
        <Stat label="Egresos de hoy" value={ars(egresosHoy)} tone="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Movimientos de caja">
            <Table head={["Fecha", "Concepto", "Método", "Ingreso", "Egreso"]}>
              {(movs ?? []).slice(0, 40).map((m: any) => (
                <tr key={m.id}>
                  <Td className="text-muted">{fechaHora(m.fecha)}</Td>
                  <Td>{m.concepto}{m.referencia ? <span className="text-muted"> · {m.referencia}</span> : null}</Td>
                  <Td><Badge tone="gray">{METODOS_PAGO[m.metodo] ?? m.metodo}</Badge></Td>
                  <Td right className={m.tipo === "ingreso" ? "font-medium text-success tabular-nums" : "text-muted"}>{m.tipo === "ingreso" ? ars(m.monto) : "—"}</Td>
                  <Td right className={m.tipo === "egreso" ? "font-medium text-danger tabular-nums" : "text-muted"}>{m.tipo === "egreso" ? ars(m.monto) : "—"}</Td>
                </tr>
              ))}
            </Table>
          </Card>

          <Card title="Últimos gastos">
            {(gastos ?? []).length === 0 ? (
              <p className="text-sm text-muted">Sin gastos cargados.</p>
            ) : (
              <Table head={["Fecha", "Categoría", "Descripción", "Proveedor", "Neto", "IVA", "Total"]}>
                {(gastos ?? []).map((g: any) => (
                  <tr key={g.id}>
                    <Td className="text-muted">{fecha(g.fecha)}</Td>
                    <Td className="capitalize">{g.categoria}</Td>
                    <Td>{g.descripcion}</Td>
                    <Td className="text-muted">{g.proveedores?.nombre ?? "—"}</Td>
                    <Td right className="tabular-nums">{ars(g.neto)}</Td>
                    <Td right className="tabular-nums">{ars(g.iva)}</Td>
                    <Td right className="font-medium tabular-nums">{ars(g.total)}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Movimiento de caja">
            <form action={registrarMovimientoCaja} className="space-y-3">
              <Select label="Tipo" name="tipo" defaultValue="ingreso">
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </Select>
              <Input label="Concepto" name="concepto" required placeholder="Retiro, aporte, ajuste…" />
              <Input label="Monto" name="monto" type="number" step="0.01" min="0.01" required />
              <Select label="Método" name="metodo" defaultValue="efectivo">
                {Object.entries(METODOS_PAGO).filter(([k]) => k !== "cuenta_corriente").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
              <Input label="Referencia" name="referencia" placeholder="Opcional" />
              <Button type="submit" className="w-full">Registrar movimiento</Button>
            </form>
          </Card>

          <Card title="Registrar gasto">
            <form action={registrarGasto} className="space-y-3">
              <Input label="Descripción" name="descripcion" required placeholder="Combustible, repuestos…" />
              <Select label="Categoría" name="categoria" defaultValue="general">
                {["general", "combustible", "vehiculos", "sueldos", "impuestos", "servicios", "mantenimiento"].map((c) => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </Select>
              <Select label="Proveedor" name="proveedor_id">
                <option value="">Sin proveedor</option>
                {(proveedores ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Neto" name="neto" type="number" step="0.01" min="0" required />
                <Input label="IVA" name="iva" type="number" step="0.01" min="0" defaultValue="0" />
              </div>
              <Input label="Comprobante" name="comprobante" placeholder="Nº de factura/ticket" />
              <Button type="submit" className="w-full" variant="secondary">Registrar gasto</Button>
              <p className="text-xs text-muted">El gasto descuenta de caja y suma crédito fiscal al libro IVA compras.</p>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
