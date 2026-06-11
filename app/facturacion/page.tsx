import { createClient } from "@/lib/supabase/server";
import { PageHeader, Table, Td, Badge, Button, Empty, Input } from "@/components/ui";
import { ars, fecha, TIPOS_COMPROBANTE, nroComprobante } from "@/lib/format";
import { cargarCAE } from "@/lib/actions";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FacturacionPage() {
  const supabase = await createClient();
  const { data: facturas } = await supabase
    .from("facturas")
    .select("*, clientes(nombre, cuit_dni)")
    .order("id", { ascending: false })
    .limit(80);

  return (
    <>
      <PageHeader title="Facturación" subtitle="Comprobantes emitidos. Cargá el CAE obtenido en ARCA/AFIP."
        actions={<Button href="/facturacion/nueva"><Plus size={16} /> Factura manual</Button>} />

      {(facturas ?? []).length === 0 ? (
        <Empty title="Sin comprobantes" hint="Facturá un pedido entregado desde su detalle, o emití una factura manual."
          action={<Button href="/facturacion/nueva">Factura manual</Button>} />
      ) : (
        <Table head={["Comprobante", "Fecha", "Cliente", "Neto 21", "Neto 10,5", "IVA", "Total", "CAE"]}>
          {(facturas ?? []).map((f: any) => (
            <tr key={f.id} className="hover:bg-gray-50/60">
              <Td>
                <span className="font-medium">{TIPOS_COMPROBANTE[f.tipo] ?? f.tipo}</span>{" "}
                <span className="text-muted">{nroComprobante(f.punto_venta, f.numero)}</span>
                {f.estado === "anulada" && <Badge tone="red">Anulada</Badge>}
              </Td>
              <Td className="text-muted">{fecha(f.fecha)}</Td>
              <Td>{f.clientes?.nombre}<span className="block text-xs text-muted">{f.clientes?.cuit_dni ?? ""}</span></Td>
              <Td right className="tabular-nums">{ars(f.neto_21)}</Td>
              <Td right className="tabular-nums">{ars(f.neto_105)}</Td>
              <Td right className="tabular-nums">{ars(Number(f.iva_21) + Number(f.iva_105))}</Td>
              <Td right className="font-semibold tabular-nums">{ars(f.total)}</Td>
              <Td>
                {f.cae ? (
                  <span className="text-xs">
                    <Badge tone="green">CAE</Badge>
                    <span className="ml-1 text-muted">{f.cae}</span>
                  </span>
                ) : (
                  <form
                    action={async (fd: FormData) => {
                      "use server";
                      await cargarCAE(f.id, String(fd.get("cae") || ""), String(fd.get("vto") || ""));
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <Input name="cae" placeholder="CAE" className="!w-36 !py-1.5 text-xs" required />
                    <Input name="vto" type="date" className="!w-32 !py-1.5 text-xs" />
                    <Button type="submit" variant="secondary" className="!px-2.5 !py-1.5 text-xs">Guardar</Button>
                  </form>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <p className="mt-3 text-xs text-muted">La numeración es automática por tipo y punto de venta. El CAE se obtiene emitiendo en Comprobantes en línea (ARCA) y se registra acá para el libro IVA.</p>
    </>
  );
}
