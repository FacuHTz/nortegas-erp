import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, Table, Td, Button, Empty } from "@/components/ui";
import { ars, fechaHora, ESTADOS_PEDIDO } from "@/lib/format";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VentasPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("pedidos")
    .select("id, numero, fecha, canal, estado, total, clientes(nombre)")
    .order("fecha", { ascending: false })
    .limit(100);
  if (estado) query = query.eq("estado", estado);
  const { data: pedidos } = await query;

  const filtros = [["", "Todos"], ...Object.entries(ESTADOS_PEDIDO).map(([k, v]) => [k, v.label])];

  return (
    <>
      <PageHeader title="Ventas" subtitle="Pedidos de mostrador, reparto y voz."
        actions={<Button href="/ventas/nuevo"><Plus size={16} /> Nuevo pedido</Button>} />

      <div className="mb-4 flex flex-wrap gap-2">
        {filtros.map(([k, label]) => (
          <Link key={k} href={k ? `/ventas?estado=${k}` : "/ventas"}
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
              (estado ?? "") === k ? "bg-ink text-white ring-ink" : "bg-white text-muted ring-line hover:text-ink"
            }`}>
            {label}
          </Link>
        ))}
      </div>

      {(pedidos ?? []).length === 0 ? (
        <Empty title="No hay pedidos con este filtro" action={<Button href="/ventas/nuevo">Crear pedido</Button>} />
      ) : (
        <Table head={["Pedido", "Cliente", "Fecha", "Canal", "Estado", "Total"]}>
          {(pedidos ?? []).map((p: any) => (
            <tr key={p.id} className="hover:bg-gray-50/60">
              <Td><Link href={`/ventas/${p.id}`} className="font-medium text-brand hover:underline">{p.numero}</Link></Td>
              <Td>{p.clientes?.nombre ?? "—"}</Td>
              <Td>{fechaHora(p.fecha)}</Td>
              <Td className="capitalize">{p.canal}</Td>
              <Td><Badge tone={ESTADOS_PEDIDO[p.estado]?.tone}>{ESTADOS_PEDIDO[p.estado]?.label}</Badge></Td>
              <Td right className="font-medium">{ars(p.total)}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
