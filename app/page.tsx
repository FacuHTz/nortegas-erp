import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Stat, Card, Badge, Table, Td, Button, Empty } from "@/components/ui";
import { VentasChart } from "@/components/ventas-chart";
import { ars, fechaHora, ESTADOS_PEDIDO, num } from "@/lib/format";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createClient();
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const hace14 = new Date(Date.now() - 13 * 86400000); hace14.setHours(0, 0, 0, 0);

  const [ventasHoy, ventasMes, pendientes, saldos, stock, ultimos, serie] = await Promise.all([
    supabase.from("pedidos").select("total").gte("fecha", hoy.toISOString()).in("estado", ["confirmado", "en_reparto", "entregado"]),
    supabase.from("pedidos").select("total").gte("fecha", inicioMes.toISOString()).in("estado", ["confirmado", "en_reparto", "entregado"]),
    supabase.from("pedidos").select("id", { count: "exact", head: true }).in("estado", ["confirmado", "en_reparto"]),
    supabase.from("v_saldos_clientes").select("saldo").gt("saldo", 0),
    supabase.from("v_stock_actual").select("*").order("llenas"),
    supabase.from("pedidos").select("id, numero, fecha, estado, total, clientes(nombre)").order("fecha", { ascending: false }).limit(6),
    supabase.from("v_ventas_diarias").select("*").gte("dia", hace14.toISOString().slice(0, 10)),
  ]);

  const sum = (rows: { total?: number; saldo?: number }[] | null, k: "total" | "saldo") =>
    (rows ?? []).reduce((a, r) => a + Number(r[k] ?? 0), 0);

  const criticos = (stock.data ?? []).filter((s: any) => s.critico && ["garrafa", "cilindro"].includes(s.tipo));
  const llenasTotal = (stock.data ?? []).filter((s: any) => ["garrafa", "cilindro"].includes(s.tipo))
    .reduce((a: number, s: any) => a + Number(s.llenas), 0);

  const dias: { dia: string; total: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const row = (serie.data ?? []).find((r: any) => r.dia === key);
    dias.push({ dia: d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }), total: Number(row?.total ?? 0) });
  }

  return (
    <>
      <PageHeader
        title="Tablero"
        subtitle="El pulso del negocio, hoy."
        actions={<Button href="/ventas/nuevo"><Plus size={16} /> Nuevo pedido</Button>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ventas de hoy" value={ars(sum(ventasHoy.data, "total"))} tone="brand" />
        <Stat label="Ventas del mes" value={ars(sum(ventasMes.data, "total"))} />
        <Stat label="Pedidos por entregar" value={String(pendientes.count ?? 0)} hint="confirmados + en reparto" />
        <Stat label="A cobrar (cta. cte.)" value={ars(sum(saldos.data as any, "saldo"))} tone={sum(saldos.data as any, "saldo") > 0 ? "red" : "ink"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Ventas · últimos 14 días" className="lg:col-span-2">
          <VentasChart data={dias} />
        </Card>

        <Card title="Stock de envasado" actions={<Link href="/inventario" className="text-xs font-medium text-brand hover:underline">Ver inventario</Link>}>
          <p className="font-display text-3xl font-bold tabular-nums text-ink">{num(llenasTotal)}</p>
          <p className="text-xs text-muted">garrafas y cilindros llenos en depósito</p>
          <div className="mt-4 space-y-2">
            {criticos.length === 0 && <p className="text-sm text-ok">Sin productos bajo el mínimo.</p>}
            {criticos.slice(0, 4).map((s: any) => (
              <div key={`${s.producto_id}-${s.deposito_id}`} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm">
                <span className="text-ink">{s.nombre}</span>
                <span className="font-semibold tabular-nums text-danger">{num(s.llenas)} u.</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Últimos pedidos" actions={<Link href="/ventas" className="text-xs font-medium text-brand hover:underline">Ver todos</Link>}>
          {(ultimos.data ?? []).length === 0 ? (
            <Empty title="Todavía no hay pedidos" hint="Cargá el primero y empezá a mover el tablero." action={<Button href="/ventas/nuevo">Crear pedido</Button>} />
          ) : (
            <Table head={["Pedido", "Cliente", "Fecha", "Estado", "Total"]}>
              {(ultimos.data ?? []).map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50/60">
                  <Td><Link href={`/ventas/${p.id}`} className="font-medium text-brand hover:underline">{p.numero}</Link></Td>
                  <Td>{p.clientes?.nombre ?? "—"}</Td>
                  <Td>{fechaHora(p.fecha)}</Td>
                  <Td><Badge tone={ESTADOS_PEDIDO[p.estado]?.tone}>{ESTADOS_PEDIDO[p.estado]?.label}</Badge></Td>
                  <Td right className="font-medium">{ars(p.total)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
