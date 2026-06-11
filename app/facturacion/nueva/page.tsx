"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { crearFacturaManual } from "@/lib/actions";
import { PageHeader, Card, Button, Input, Select } from "@/components/ui";
import { ars, TIPOS_COMPROBANTE } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";

type Cliente = { id: number; nombre: string; condicion: string };
type Item = { descripcion: string; cantidad: number; precio_unitario: number; iva_alicuota: number };

export default function NuevaFacturaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState<number>(0);
  const [tipo, setTipo] = useState("factura_b");
  const [cae, setCae] = useState("");
  const [items, setItems] = useState<Item[]>([{ descripcion: "", cantidad: 1, precio_unitario: 0, iva_alicuota: 10.5 }]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("clientes").select("id, nombre, condicion").eq("activo", true).order("nombre");
      setClientes(data ?? []);
    })();
  }, [supabase]);

  function elegirCliente(id: number) {
    setClienteId(id);
    const c = clientes.find((x) => x.id === id);
    if (c) setTipo(c.condicion === "responsable_inscripto" ? "factura_a" : "factura_b");
  }

  function setItem(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  const neto = items.reduce((a, i) => a + i.cantidad * i.precio_unitario, 0);
  const iva = items.reduce((a, i) => a + i.cantidad * i.precio_unitario * i.iva_alicuota / 100, 0);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId) return setError("Elegí un cliente.");
    const validos = items.filter((i) => i.descripcion.trim() && i.cantidad > 0);
    if (!validos.length) return setError("Cargá al menos un ítem con descripción.");
    setEnviando(true); setError(null);
    const fd = new FormData();
    fd.set("cliente_id", String(clienteId));
    fd.set("tipo", tipo);
    fd.set("cae", cae);
    fd.set("items", JSON.stringify(validos));
    try {
      await crearFacturaManual(fd);
    } catch (err: any) {
      if (err?.message === "NEXT_REDIRECT" || err?.digest?.includes("NEXT_REDIRECT")) throw err;
      setError(err.message ?? "No se pudo emitir la factura.");
      setEnviando(false);
    }
  }

  return (
    <>
      <PageHeader title="Factura manual" subtitle="Para ventas sin pedido asociado. La numeración es automática." />
      <form onSubmit={enviar} className="space-y-6">
        <Card title="Encabezado">
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Cliente" value={clienteId} onChange={(e) => elegirCliente(Number(e.target.value))}>
              <option value={0}>Elegir cliente…</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
            <Select label="Tipo de comprobante" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {Object.entries(TIPOS_COMPROBANTE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <Input label="CAE (opcional, se puede cargar después)" value={cae} onChange={(e) => setCae(e.target.value)} placeholder="14 dígitos" />
          </div>
        </Card>

        <Card title="Ítems" actions={
          <Button type="button" variant="secondary" onClick={() => setItems((p) => [...p, { descripcion: "", cantidad: 1, precio_unitario: 0, iva_alicuota: 21 }])}>
            <Plus size={15} /> Agregar ítem
          </Button>
        }>
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="grid items-end gap-2 rounded-lg border border-line/70 bg-paper/60 p-3 sm:grid-cols-[1fr_85px_130px_100px_auto]">
                <Input label="Descripción" value={it.descripcion} onChange={(e) => setItem(i, { descripcion: e.target.value })} placeholder="Garrafa 10 kg, flete…" />
                <Input label="Cant." type="number" min={1} step="0.01" value={it.cantidad} onChange={(e) => setItem(i, { cantidad: Number(e.target.value) })} />
                <Input label="Precio (neto)" type="number" min={0} step="0.01" value={it.precio_unitario} onChange={(e) => setItem(i, { precio_unitario: Number(e.target.value) })} />
                <Select label="IVA" value={it.iva_alicuota} onChange={(e) => setItem(i, { iva_alicuota: Number(e.target.value) })}>
                  <option value={10.5}>10,5%</option>
                  <option value={21}>21%</option>
                </Select>
                <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                  <p className="text-sm font-semibold tabular-nums">{ars(it.cantidad * it.precio_unitario)}</p>
                  <button type="button" onClick={() => setItems((p) => p.filter((_, x) => x !== i))}
                    className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-danger" aria-label="Quitar ítem">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between text-muted"><span>Neto</span><span className="tabular-nums">{ars(neto)}</span></div>
            <div className="flex justify-between text-muted"><span>IVA</span><span className="tabular-nums">{ars(iva)}</span></div>
            <div className="flex justify-between border-t border-line pt-2 font-display text-lg font-bold"><span>Total</span><span className="tabular-nums">{ars(neto + iva)}</span></div>
          </div>
        </Card>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={enviando}>{enviando ? "Emitiendo…" : "Emitir factura"}</Button>
          <Button href="/facturacion" variant="secondary">Cancelar</Button>
        </div>
      </form>
    </>
  );
}
