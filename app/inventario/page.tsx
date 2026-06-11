import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Table, Td, Badge, Input, Select, Button, Stat } from "@/components/ui";
import { fechaHora, num } from "@/lib/format";
import { ajustarStock } from "@/lib/actions";

export const dynamic = "force-dynamic";

const TIPO_MOV: Record<string, string> = {
  compra: "Compra", venta: "Venta", ajuste: "Ajuste",
  devolucion_envase: "Dev. envase", entrega_comodato: "Comodato", recuento: "Recuento",
};

export default async function InventarioPage() {
  const supabase = await createClient();
  const [{ data: stock }, { data: movs }, { data: productos }, { data: depositos }] = await Promise.all([
    supabase.from("v_stock_actual").select("*").order("tipo").order("nombre"),
    supabase.from("movimientos_stock").select("*, productos(nombre), depositos(nombre)").order("fecha", { ascending: false }).limit(25),
    supabase.from("productos").select("id, nombre").eq("activo", true).in("tipo", ["garrafa", "cilindro", "accesorio"]).order("nombre"),
    supabase.from("depositos").select("id, nombre").order("id"),
  ]);

  const criticos = (stock ?? []).filter((s: any) => s.critico).length;
  const totalLlenas = (stock ?? []).reduce((a: number, s: any) => a + Number(s.llenas), 0);
  const totalVacias = (stock ?? []).reduce((a: number, s: any) => a + Number(s.vacias), 0);

  return (
    <>
      <PageHeader title="Inventario" subtitle="Stock por depósito: unidades llenas y envases vacíos." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Unidades llenas" value={num(totalLlenas)} />
        <Stat label="Envases vacíos" value={num(totalVacias)} hint="En depósito, para canje con proveedor" />
        <Stat label="Productos en mínimo" value={String(criticos)} tone={criticos > 0 ? "red" : "green"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Stock actual">
            <Table head={["Producto", "Depósito", "Llenas", "Vacías", "Mínimo", "Estado"]}>
              {(stock ?? []).map((s: any) => (
                <tr key={`${s.producto_id}-${s.deposito_id}`} className={s.critico ? "bg-red-50/50" : ""}>
                  <Td><span className="font-medium">{s.nombre}</span> <span className="text-xs text-muted">{s.codigo}</span></Td>
                  <Td className="text-muted">{s.deposito}</Td>
                  <Td right className="font-semibold tabular-nums">{num(s.llenas)}</Td>
                  <Td right className="tabular-nums">{num(s.vacias)}</Td>
                  <Td right className="text-muted tabular-nums">{num(s.minimo)}</Td>
                  <Td>{s.critico ? <Badge tone="red">Reponer</Badge> : <Badge tone="green">OK</Badge>}</Td>
                </tr>
              ))}
            </Table>
          </Card>

          <Card title="Últimos movimientos">
            <Table head={["Fecha", "Tipo", "Producto", "Δ Llenas", "Δ Vacías", "Referencia"]}>
              {(movs ?? []).map((m: any) => (
                <tr key={m.id}>
                  <Td className="text-muted">{fechaHora(m.fecha)}</Td>
                  <Td><Badge tone={m.tipo === "venta" ? "amber" : m.tipo === "compra" ? "blue" : "gray"}>{TIPO_MOV[m.tipo] ?? m.tipo}</Badge></Td>
                  <Td>{m.productos?.nombre}</Td>
                  <Td right className={Number(m.delta_llenas) < 0 ? "text-danger tabular-nums" : "text-success tabular-nums"}>{Number(m.delta_llenas) > 0 ? "+" : ""}{num(m.delta_llenas)}</Td>
                  <Td right className="text-muted tabular-nums">{Number(m.delta_vacias) > 0 ? "+" : ""}{num(m.delta_vacias)}</Td>
                  <Td className="text-muted">{m.referencia ?? "—"}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>

        <div>
          <Card title="Ajuste manual de stock">
            <form action={ajustarStock} className="space-y-3">
              <Select label="Producto" name="producto_id" required>
                {(productos ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select>
              <Select label="Depósito" name="deposito_id" required>
                {(depositos ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Δ Llenas" name="delta_llenas" type="number" step="1" defaultValue="0" />
                <Input label="Δ Vacías" name="delta_vacias" type="number" step="1" defaultValue="0" />
              </div>
              <Input label="Notas" name="notas" placeholder="Motivo del ajuste" />
              <Button type="submit" className="w-full">Aplicar ajuste</Button>
              <p className="text-xs text-muted">Usá valores negativos para descontar. Queda registrado en movimientos con tu usuario.</p>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
