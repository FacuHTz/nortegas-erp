"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { crearCompra } from "@/lib/actions";
import { PageHeader, Card, Button, Input, Select } from "@/components/ui";
import { ars } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";

type Producto = { id: number; nombre: string; iva_alicuota: number; costo: number };
type Item = { producto_id: number; cantidad: number; costo_unitario: number; iva_alicuota: number };

export default function NuevaCompraPage() {
  const supabase = useMemo(() => createClient(), []);
  const [proveedores, setProveedores] = useState<{ id: number; nombre: string }[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [depositos, setDepositos] = useState<{ id: number; nombre: string }[]>([]);

  const [proveedorId, setProveedorId] = useState<number>(0);
  const [depositoId, setDepositoId] = useState<number>(0);
  const [nroFactura, setNroFactura] = useState("");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [pr, p, d] = await Promise.all([
        supabase.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
        supabase.from("productos").select("id, nombre, iva_alicuota, costo").eq("activo", true).order("nombre"),
        supabase.from("depositos").select("id, nombre"),
      ]);
      setProveedores(pr.data ?? []); setProductos(p.data ?? []); setDepositos(d.data ?? []);
      if (pr.data?.length) setProveedorId(pr.data[0].id);
      if (d.data?.length) setDepositoId(d.data[0].id);
    })();
  }, [supabase]);

  function agregarItem() {
    const prod = productos[0];
    if (!prod) return;
    setItems((prev) => [...prev, { producto_id: prod.id, cantidad: 1, costo_unitario: Number(prod.costo) || 0, iva_alicuota: Number(prod.iva_alicuota) }]);
  }

  function setItem(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function cambiarProducto(i: number, productoId: number) {
    const prod = productos.find((p) => p.id === productoId)!;
    setItem(i, { producto_id: productoId, costo_unitario: Number(prod.costo) || 0, iva_alicuota: Number(prod.iva_alicuota) });
  }

  const subtotal = items.reduce((a, i) => a + i.cantidad * i.costo_unitario, 0);
  const iva = items.reduce((a, i) => a + i.cantidad * i.costo_unitario * i.iva_alicuota / 100, 0);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!proveedorId) return setError("Elegí un proveedor.");
    if (!items.length) return setError("Agregá al menos un producto.");
    setEnviando(true); setError(null);
    const fd = new FormData();
    fd.set("proveedor_id", String(proveedorId));
    fd.set("deposito_id", String(depositoId));
    fd.set("nro_factura_prov", nroFactura);
    fd.set("notas", notas);
    fd.set("items", JSON.stringify(items));
    try {
      await crearCompra(fd);
    } catch (err: any) {
      if (err?.message === "NEXT_REDIRECT" || err?.digest?.includes("NEXT_REDIRECT")) throw err;
      setError(err.message ?? "No se pudo crear la compra.");
      setEnviando(false);
    }
  }

  return (
    <>
      <PageHeader title="Nueva compra" subtitle="Orden a proveedor. Al recibirla suma stock y actualiza costos." />
      <form onSubmit={enviar} className="space-y-6">
        <Card title="Datos de la compra">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Proveedor" value={proveedorId} onChange={(e) => setProveedorId(Number(e.target.value))}>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </Select>
            <Select label="Depósito destino" value={depositoId} onChange={(e) => setDepositoId(Number(e.target.value))}>
              {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </Select>
            <Input label="Factura del proveedor" value={nroFactura} onChange={(e) => setNroFactura(e.target.value)} placeholder="0001-00012345" />
            <Input label="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional" />
          </div>
        </Card>

        <Card title="Productos" actions={<Button type="button" variant="secondary" onClick={agregarItem}><Plus size={15} /> Agregar línea</Button>}>
          {items.length === 0 && <p className="py-4 text-center text-sm text-muted">Agregá la primera línea de la compra.</p>}
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="grid items-end gap-2 rounded-lg border border-line/70 bg-paper/60 p-3 sm:grid-cols-[1fr_90px_130px_100px_auto]">
                <Select label="Producto" value={it.producto_id} onChange={(e) => cambiarProducto(i, Number(e.target.value))}>
                  {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </Select>
                <Input label="Cant." type="number" min={1} step="1" value={it.cantidad}
                  onChange={(e) => setItem(i, { cantidad: Number(e.target.value) })} />
                <Input label="Costo unit." type="number" min={0} step="0.01" value={it.costo_unitario}
                  onChange={(e) => setItem(i, { costo_unitario: Number(e.target.value) })} />
                <Select label="IVA" value={it.iva_alicuota} onChange={(e) => setItem(i, { iva_alicuota: Number(e.target.value) })}>
                  <option value={10.5}>10,5%</option>
                  <option value={21}>21%</option>
                </Select>
                <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                  <p className="text-sm font-semibold tabular-nums">{ars(it.cantidad * it.costo_unitario)}</p>
                  <button type="button" onClick={() => setItems((p) => p.filter((_, x) => x !== i))}
                    className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-danger" aria-label="Quitar línea">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {items.length > 0 && (
            <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between text-muted"><span>Subtotal</span><span className="tabular-nums">{ars(subtotal)}</span></div>
              <div className="flex justify-between text-muted"><span>IVA crédito</span><span className="tabular-nums">{ars(iva)}</span></div>
              <div className="flex justify-between border-t border-line pt-2 font-display text-lg font-bold"><span>Total</span><span className="tabular-nums">{ars(subtotal + iva)}</span></div>
            </div>
          )}
        </Card>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={enviando}>{enviando ? "Guardando…" : "Confirmar compra"}</Button>
          <Button href="/compras" variant="secondary">Cancelar</Button>
        </div>
      </form>
    </>
  );
}
