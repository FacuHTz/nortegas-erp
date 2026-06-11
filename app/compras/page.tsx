import { createClient } from "@/lib/supabase/server";
import { PageHeader, Table, Td, Badge, Button, Empty } from "@/components/ui";
import { ars, fecha } from "@/lib/format";
import { recibirCompra } from "@/lib/actions";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

const ESTADOS_COMPRA: Record<string, { label: string; tone: string }> = {
  borrador: { label: "Borrador", tone: "gray" },
  confirmada: { label: "Confirmada", tone: "blue" },
  recibida: { label: "Recibida", tone: "green" },
  cancelada: { label: "Cancelada", tone: "red" },
};

export default async function ComprasPage() {
  const supabase = await createClient();
  const { data: compras } = await supabase
    .from("compras")
    .select("*, proveedores(nombre), depositos(nombre)")
    .order("id", { ascending: false })
    .limit(60);

  return (
    <>
      <PageHeader title="Compras" subtitle="Órdenes a ExtraGAS, YPF GAS y otros proveedores."
        actions={<Button href="/compras/nueva"><Plus size={16} /> Nueva compra</Button>} />

      {(compras ?? []).length === 0 ? (
        <Empty title="Sin compras registradas" hint="Cargá la primera orden de compra para alimentar stock y libro IVA."
          action={<Button href="/compras/nueva">Nueva compra</Button>} />
      ) : (
        <Table head={["Número", "Fecha", "Proveedor", "Fact. prov.", "Total", "Estado", ""]}>
          {(compras ?? []).map((c: any) => {
            const est = ESTADOS_COMPRA[c.estado];
            return (
              <tr key={c.id} className="hover:bg-gray-50/60">
                <Td className="font-medium">{c.numero}</Td>
                <Td className="text-muted">{fecha(c.fecha)}</Td>
                <Td>{c.proveedores?.nombre}</Td>
                <Td className="text-muted">{c.nro_factura_prov ?? "—"}</Td>
                <Td right className="font-medium">{ars(c.total)}</Td>
                <Td><Badge tone={est?.tone}>{est?.label}</Badge></Td>
                <Td right>
                  {c.estado === "confirmada" && (
                    <form action={async () => { "use server"; await recibirCompra(c.id); }}>
                      <Button type="submit" variant="secondary" className="!px-3 !py-1.5 text-xs">Recibir</Button>
                    </form>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
      <p className="mt-3 text-xs text-muted">Al recibir, suma las unidades llenas al depósito y actualiza el costo de cada producto con el último precio de compra.</p>
    </>
  );
}
