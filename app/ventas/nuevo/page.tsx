"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { crearPedido } from "@/lib/actions";
import { PageHeader, Card, Button, Input, Select } from "@/components/ui";
import { ars } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";

type Cliente = { id: number; nombre: string; lista_precio_id: number | null; direccion: string | null };
type Producto = { id: number; nombre: string; tipo: string; iva_alicuota: number; requiere_envase: boolean };
type Precio = { lista_id: number; producto_id: number; precio: number };
type Item = { producto_id: number; cantidad: number; precio_unitario: number; iva_alicuota: number; envases_devueltos: number };

export default function NuevoPedidoPage() {
  const supabase = useMemo(() => createClient(), []);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [precios, setPrecios] = useState<Precio[]>([]);
  const [listas, setListas] = useState<{ id: number; nombre: string }[]>([]);
  const [depositos, setDepositos] = useState<{ id: number; nombre: string }[]>([]);

  const [clienteId, setClienteId] = useState<number>(0);
  const [listaId, setListaId] = useState<number>(0);
  const [canal, setCanal] = useState("mostrador");
  const [depositoId, setDepositoId] = useState<number>(0);
  const [direccion, setDireccion] = useState("");
  const [obs, setObs] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [c, p, pp, l, d] = await Promise.all([
        supabase.from("clientes").select("id, nombre, lista_precio_id, direccion").eq("activo", true).order("nombre"),
        supabase.from("productos").select("id, nombre, tipo, iva_alicuota, requiere_envase").eq("activo", true).order("nombre"),
        supabase.from("precios_productos").select("*"),
        supabase.from("listas_precios").select("id, nombre").eq("activa", true),
        supabase.from("depositos").select("id, nombre"),
      ]);
      setClientes(c.data ?? []); setProductos(p.data ?? []); setPrecios(pp.data ?? []);
      setListas(l.data ?? []); setDepositos(d.data ?? []);
      if (l.data?.length) setListaId(l.data[0].id);
      if (d.data?.length) setDepositoId(d.data[0].id);
    })();
  }, [supabase]);

  function elegirCliente(id: number) {
    setClienteId(id);
    const c = clientes.find((x) => x.id === id);
    if (c?.lista_precio_id) setListaId(c.lista_precio_id);
    if (c?.direccion) setDireccion(c.direccion);
  }

  const precioDe = (productoId: number, lista = listaId) =>
    precios.find((p) => p.producto_id === productoId && p.lista_id === lista)?.precio ?? 0;

  function agregarItem() {
    const prod = productos[0];
    if (!prod) return;
    setItems((prev) => [...prev, {
      producto_id: prod.id, cantidad: 1,
      precio_unitario: precioDe(prod.id),
      iva_alicuota: prod.iva_alicuota,
      envases_devueltos: prod.requiere_envase ? 1 : 0,
    }]);
  }

  function setItem(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function cambiarProducto(i: number, productoId: number) {
    const prod = productos.find((p) => p.id === productoId)!;
    setItem(i, {
      producto_id: productoId,
      precio_unitario: precioDe(productoId),
      iva_alicuota: prod.iva_alicuota,
      envases_devueltos: prod.requiere_envase ? items[i].cantidad : 0,
    });
  }

  const subtotal = items.reduce((a, i) => a + i.cantidad * i.precio_unitario, 0);
  const iva = items.reduce((a, i) => a + i.cantidad * i.precio_unitario * i.iva_alicuota / 100, 0);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId) return setError("Elegí un cliente.");
    if (!items.length) return setError("Agregá al menos un producto.");
    setEnviando(true); setError(null);
    const fd = new FormData();
    fd.set("cliente_id", String(clienteId));
    fd.set("lista_precio_id", String(listaId));
    fd.set("canal", canal);
    fd.set("deposito_id", String(depositoId));
    fd.set("direccion_entrega", direccion);
    fd.set("observaciones", obs);
    fd.set("items", JSON.stringify(items));
    try {
      await crearPedido(fd);
    } catch (err: any) {
      if (err?.message === "NEXT_REDIRECT" || err?.digest?.includes("NEXT_REDIRECT")) throw err;
      setError(err.message ?? "No se pudo crear el pedido.");
      setEnviando(false);
    }
  }

  return (
    <>
      <PageHeader title="Nuevo pedido" subtitle="Cargá la venta y confirmala para descontar stock." />
      <form onSubmit={enviar} className="space-y-6">
        <Card title="Datos del pedido">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Cliente" value={clienteId} onChange={(e) => elegirCliente(Number(e.target.value))}>
              <option value={0}>Elegir cliente…</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
            <Select label="Lista de precios" value={listaId} onChange={(e) => {
              const nl = Number(e.target.value); setListaId(nl);
              setItems((prev) => prev.map((it) => ({ ...it, precio_unitario: precioDe(it.producto_id, nl) })));
            }}>
              {listas.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </Select>
            <Select label="Canal" value={canal} onChange={(e) => setCanal(e.target.value)}>
              {["mostrador", "reparto", "telefono", "whatsapp", "voz"].map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select label="Depósito" value={depositoId} onChange={(e) => setDepositoId(Number(e.target.value))}>
              {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </Select>
            {canal !== "mostrador" && (
              <div className="sm:col-span-2">
                <Input label="Dirección de entrega" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle y número" />
              </div>
            )}
            <div className="sm:col-span-2">
              <Input label="Observaciones" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Notas para el reparto, horario, etc." />
            </div>
          </div>
        </Card>

        <Card title="Productos" actions={<Button type="button" variant="secondary" onClick={agregarItem}><Plus size={15} /> Agregar línea</Button>}>
          {items.length === 0 && <p className="py-4 text-center text-sm text-muted">Agregá la primera línea del pedido.</p>}
          <div className="space-y-3">
            {items.map((it, i) => {
              const prod = productos.find((p) => p.id === it.producto_id);
              return (
                <div key={i} className="grid items-end gap-2 rounded-lg border border-line/70 bg-paper/60 p-3 sm:grid-cols-[1fr_90px_120px_110px_auto]">
                  <Select label="Producto" value={it.producto_id} onChange={(e) => cambiarProducto(i, Number(e.target.value))}>
                    {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </Select>
                  <Input label="Cant." type="number" min={1} step="1" value={it.cantidad}
                    onChange={(e) => {
                      const c = Number(e.target.value);
                      setItem(i, { cantidad: c, envases_devueltos: prod?.requiere_envase ? Math.min(it.envases_devueltos, c) : 0 });
                    }} />
                  <Input label="Precio" type="number" min={0} step="0.01" value={it.precio_unitario}
                    onChange={(e) => setItem(i, { precio_unitario: Number(e.target.value) })} />
                  {prod?.requiere_envase ? (
                    <Input label="Envases dev." type="number" min={0} max={it.cantidad} value={it.envases_devueltos}
                      onChange={(e) => setItem(i, { envases_devueltos: Number(e.target.value) })} />
                  ) : <div className="hidden sm:block" />}
                  <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                    <p className="text-sm font-semibold tabular-nums">{ars(it.cantidad * it.precio_unitario)}</p>
                    <button type="button" onClick={() => setItems((p) => p.filter((_, x) => x !== i))}
                      className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-danger" aria-label="Quitar línea">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {items.length > 0 && (
            <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between text-muted"><span>Subtotal</span><span className="tabular-nums">{ars(subtotal)}</span></div>
              <div className="flex justify-between text-muted"><span>IVA</span><span className="tabular-nums">{ars(iva)}</span></div>
              <div className="flex justify-between border-t border-line pt-2 font-display text-lg font-bold"><span>Total</span><span className="tabular-nums">{ars(subtotal + iva)}</span></div>
            </div>
          )}
        </Card>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={enviando}>{enviando ? "Guardando…" : "Guardar pedido"}</Button>
          <Button href="/ventas" variant="secondary">Cancelar</Button>
        </div>
      </form>
    </>
  );
}
