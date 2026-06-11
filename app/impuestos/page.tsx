import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, Stat, Table, Td, Badge, Button } from "@/components/ui";
import { ars, fecha, TIPOS_COMPROBANTE, nroComprobante, CONDICIONES } from "@/lib/format";

export const dynamic = "force-dynamic";

function rangoMes(periodo: string) {
  const [y, m] = periodo.split("-").map(Number);
  const desde = `${y}-${String(m).padStart(2, "0")}-01`;
  const sig = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { desde, hasta: sig };
}

export default async function ImpuestosPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const sp = await searchParams;
  const periodo = sp.periodo ?? new Date().toISOString().slice(0, 7);
  const { desde, hasta } = rangoMes(periodo);

  const supabase = await createClient();
  const [{ data: ventas }, { data: compras }, { data: emp }] = await Promise.all([
    supabase.from("v_libro_iva_ventas").select("*").gte("fecha", desde).lt("fecha", hasta),
    supabase.from("v_libro_iva_compras").select("*").gte("fecha", desde).lt("fecha", hasta),
    supabase.from("empresa").select("alicuota_iibb, razon_social, cuit").eq("id", 1).single(),
  ]);

  const vAct = (ventas ?? []).filter((v: any) => v.estado !== "anulada");
  const esNC = (t: string) => t.startsWith("nota_credito");
  const sig = (t: string) => (esNC(t) ? -1 : 1);

  const debito = vAct.reduce((a: number, v: any) => a + sig(v.tipo) * (Number(v.iva_21) + Number(v.iva_105)), 0);
  const netoVentas = vAct.reduce((a: number, v: any) => a + sig(v.tipo) * (Number(v.neto_21) + Number(v.neto_105) + Number(v.exento)), 0);
  const credito = (compras ?? []).reduce((a: number, c: any) => a + Number(c.iva), 0);
  const posicion = debito - credito;
  const alicuotaIIBB = Number(emp?.alicuota_iibb ?? 0);
  const iibb = netoVentas * alicuotaIIBB / 100;

  const mesAnterior = () => {
    const [y, m] = periodo.split("-").map(Number);
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  };
  const mesSiguiente = () => {
    const [y, m] = periodo.split("-").map(Number);
    return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  };

  return (
    <>
      <PageHeader
        title="Impuestos"
        subtitle={`Período ${periodo} · ${emp?.razon_social ?? ""} ${emp?.cuit ? `· CUIT ${emp.cuit}` : ""}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" href={`/impuestos?periodo=${mesAnterior()}`}>← {mesAnterior()}</Button>
            <Button variant="secondary" href={`/impuestos?periodo=${mesSiguiente()}`}>{mesSiguiente()} →</Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="IVA débito fiscal" value={ars(debito)} hint="Por ventas del período" />
        <Stat label="IVA crédito fiscal" value={ars(credito)} hint="Compras + gastos" />
        <Stat label="Posición IVA" value={ars(posicion)} tone={posicion > 0 ? "red" : "green"} hint={posicion > 0 ? "A pagar" : "A favor"} />
        <Stat label={`IIBB estimado (${alicuotaIIBB}%)`} value={ars(iibb)} hint={`Sobre neto facturado ${ars(netoVentas)}`} />
      </div>

      <div className="space-y-6">
        <Card title="Libro IVA Ventas">
          {vAct.length === 0 ? (
            <p className="text-sm text-muted">Sin comprobantes en el período.</p>
          ) : (
            <Table head={["Fecha", "Comprobante", "Cliente", "Cond.", "Neto 21", "IVA 21", "Neto 10,5", "IVA 10,5", "Total"]}>
              {vAct.map((v: any, i: number) => (
                <tr key={i}>
                  <Td className="text-muted">{fecha(v.fecha)}</Td>
                  <Td className="whitespace-nowrap font-medium">{TIPOS_COMPROBANTE[v.tipo] ?? v.tipo} {nroComprobante(v.punto_venta, v.numero)}</Td>
                  <Td>{v.cliente}<span className="block text-xs text-muted">{v.cuit_dni ?? ""}</span></Td>
                  <Td><Badge tone="gray">{CONDICIONES[v.condicion] ?? v.condicion}</Badge></Td>
                  <Td right className="tabular-nums">{ars(sig(v.tipo) * v.neto_21)}</Td>
                  <Td right className="tabular-nums">{ars(sig(v.tipo) * v.iva_21)}</Td>
                  <Td right className="tabular-nums">{ars(sig(v.tipo) * v.neto_105)}</Td>
                  <Td right className="tabular-nums">{ars(sig(v.tipo) * v.iva_105)}</Td>
                  <Td right className="font-semibold tabular-nums">{ars(sig(v.tipo) * v.total)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card title="Libro IVA Compras (compras recibidas + gastos)">
          {(compras ?? []).length === 0 ? (
            <p className="text-sm text-muted">Sin comprobantes en el período.</p>
          ) : (
            <Table head={["Fecha", "Origen", "Proveedor", "Detalle", "Neto", "IVA", "Total"]}>
              {(compras ?? []).map((c: any, i: number) => (
                <tr key={i}>
                  <Td className="text-muted">{fecha(c.fecha)}</Td>
                  <Td><Badge tone={c.origen === "compra" ? "blue" : "gray"}>{c.origen === "compra" ? "Compra" : "Gasto"}</Badge></Td>
                  <Td>{c.proveedor ?? "—"}</Td>
                  <Td className="text-muted">{c.descripcion}</Td>
                  <Td right className="tabular-nums">{ars(c.neto)}</Td>
                  <Td right className="tabular-nums">{ars(c.iva)}</Td>
                  <Td right className="font-medium tabular-nums">{ars(c.total)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>

      <p className="mt-4 text-xs text-muted">Valores estimativos para control interno: la posición de IVA e IIBB definitivas las determina tu contador con los comprobantes oficiales. Las notas de crédito restan del débito fiscal.</p>
    </>
  );
}
