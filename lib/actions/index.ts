"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function n(v: FormDataEntryValue | null) { return Number(v ?? 0) || 0; }
function s(v: FormDataEntryValue | null) { return String(v ?? "").trim() || null; }

// ---------------- VENTAS ----------------
export async function crearPedido(formData: FormData) {
  const supabase = await createClient();
  const items = JSON.parse(String(formData.get("items") || "[]")) as
    { producto_id: number; cantidad: number; precio_unitario: number; iva_alicuota: number; envases_devueltos: number }[];
  if (!items.length) throw new Error("El pedido necesita al menos un producto");

  const { data: { user } } = await supabase.auth.getUser();
  const { data: pedido, error } = await supabase
    .from("pedidos")
    .insert({
      cliente_id: n(formData.get("cliente_id")),
      canal: String(formData.get("canal") || "mostrador"),
      lista_precio_id: n(formData.get("lista_precio_id")) || null,
      deposito_id: n(formData.get("deposito_id")) || null,
      direccion_entrega: s(formData.get("direccion_entrega")),
      observaciones: s(formData.get("observaciones")),
      usuario_id: user?.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: e2 } = await supabase
    .from("pedido_items")
    .insert(items.map((i) => ({ ...i, pedido_id: pedido.id })));
  if (e2) throw new Error(e2.message);

  revalidatePath("/ventas");
  redirect(`/ventas/${pedido.id}`);
}

export async function confirmarPedido(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirmar_pedido", { p_pedido: id });
  if (error) throw new Error(error.message);
  revalidatePath(`/ventas/${id}`);
  revalidatePath("/ventas");
  revalidatePath("/inventario");
}

export async function entregarPedido(id: number, metodo: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("entregar_pedido", { p_pedido: id, p_metodo: metodo });
  if (error) throw new Error(error.message);
  revalidatePath(`/ventas/${id}`);
  revalidatePath("/ventas");
  revalidatePath("/tesoreria");
}

export async function cancelarPedido(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancelar_pedido", { p_pedido: id });
  if (error) throw new Error(error.message);
  revalidatePath(`/ventas/${id}`);
  revalidatePath("/ventas");
}

// ---------------- CLIENTES ----------------
export async function crearCliente(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      nombre: s(formData.get("nombre")),
      cuit_dni: s(formData.get("cuit_dni")),
      condicion: String(formData.get("condicion") || "consumidor_final"),
      tipo: String(formData.get("tipo") || "particular"),
      telefono: s(formData.get("telefono")),
      email: s(formData.get("email")),
      direccion: s(formData.get("direccion")),
      localidad: s(formData.get("localidad")),
      zona_reparto: s(formData.get("zona_reparto")),
      lista_precio_id: n(formData.get("lista_precio_id")) || null,
      limite_credito: n(formData.get("limite_credito")),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

export async function registrarCobranza(formData: FormData) {
  const supabase = await createClient();
  const cliente = n(formData.get("cliente_id"));
  const { error } = await supabase.rpc("registrar_cobranza", {
    p_cliente: cliente,
    p_monto: n(formData.get("monto")),
    p_metodo: String(formData.get("metodo") || "efectivo"),
    p_referencia: s(formData.get("referencia")),
    p_notas: s(formData.get("notas")),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${cliente}`);
  revalidatePath("/tesoreria");
}

// ---------------- PRODUCTOS ----------------
export async function crearProducto(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("productos")
    .insert({
      codigo: s(formData.get("codigo")),
      nombre: s(formData.get("nombre")),
      tipo: String(formData.get("tipo") || "garrafa"),
      capacidad_kg: n(formData.get("capacidad_kg")) || null,
      marca: s(formData.get("marca")),
      costo: n(formData.get("costo")),
      iva_alicuota: n(formData.get("iva_alicuota")) || 21,
      requiere_envase: formData.get("requiere_envase") === "on",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { data: listas } = await supabase.from("listas_precios").select("id");
  for (const l of listas ?? []) {
    const precio = n(formData.get(`precio_${l.id}`));
    await supabase.from("precios_productos").upsert({ lista_id: l.id, producto_id: data.id, precio });
  }
  revalidatePath("/productos");
  redirect("/productos");
}

export async function actualizarPrecio(productoId: number, listaId: number, precio: number) {
  const supabase = await createClient();
  await supabase.from("precios_productos").upsert({ producto_id: productoId, lista_id: listaId, precio });
  revalidatePath("/productos");
}

// ---------------- INVENTARIO ----------------
export async function ajustarStock(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("aplicar_stock", {
    p_producto: n(formData.get("producto_id")),
    p_deposito: n(formData.get("deposito_id")),
    p_delta_llenas: n(formData.get("delta_llenas")),
    p_delta_vacias: n(formData.get("delta_vacias")),
    p_tipo: "ajuste",
    p_ref: "Ajuste manual",
    p_notas: s(formData.get("notas")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/inventario");
}

// ---------------- COMPRAS ----------------
export async function crearCompra(formData: FormData) {
  const supabase = await createClient();
  const items = JSON.parse(String(formData.get("items") || "[]")) as
    { producto_id: number; cantidad: number; costo_unitario: number; iva_alicuota: number }[];
  if (!items.length) throw new Error("La compra necesita al menos un ítem");

  const { data: { user } } = await supabase.auth.getUser();
  const { data: compra, error } = await supabase
    .from("compras")
    .insert({
      proveedor_id: n(formData.get("proveedor_id")),
      deposito_id: n(formData.get("deposito_id")) || null,
      nro_factura_prov: s(formData.get("nro_factura_prov")),
      estado: "confirmada",
      notas: s(formData.get("notas")),
      usuario_id: user?.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: e2 } = await supabase.from("compra_items").insert(items.map((i) => ({ ...i, compra_id: compra.id })));
  if (e2) throw new Error(e2.message);
  revalidatePath("/compras");
  redirect("/compras");
}

export async function recibirCompra(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("recibir_compra", { p_compra: id });
  if (error) throw new Error(error.message);
  revalidatePath("/compras");
  revalidatePath("/inventario");
}

// ---------------- FACTURACIÓN ----------------
export async function facturarPedido(pedidoId: number, tipo: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("facturar_pedido", { p_pedido: pedidoId, p_tipo: tipo });
  if (error) throw new Error(error.message);
  revalidatePath("/facturacion");
  revalidatePath(`/ventas/${pedidoId}`);
  redirect("/facturacion");
}

export async function crearFacturaManual(formData: FormData) {
  const supabase = await createClient();
  const tipo = String(formData.get("tipo"));
  const items = JSON.parse(String(formData.get("items") || "[]")) as
    { descripcion: string; cantidad: number; precio_unitario: number; iva_alicuota: number }[];
  if (!items.length) throw new Error("La factura necesita al menos un ítem");

  const { data: emp } = await supabase.from("empresa").select("punto_venta").eq("id", 1).single();
  const pv = emp?.punto_venta ?? 1;
  const { data: numero } = await supabase.rpc("siguiente_numero_factura", { p_tipo: tipo, p_pv: pv });

  const calc = (al: number) => items.filter((i) => i.iva_alicuota === al)
    .reduce((a, i) => a + Math.round(i.cantidad * i.precio_unitario * 100) / 100, 0);
  const n21 = calc(21), n105 = calc(10.5);
  const i21 = Math.round(n21 * 21) / 100, i105 = Math.round(n105 * 10.5) / 100;

  const { data: { user } } = await supabase.auth.getUser();
  const { data: fac, error } = await supabase
    .from("facturas")
    .insert({
      tipo, punto_venta: pv, numero,
      cliente_id: n(formData.get("cliente_id")),
      neto_21: n21, iva_21: i21, neto_105: n105, iva_105: i105,
      total: n21 + i21 + n105 + i105,
      cae: s(formData.get("cae")),
      usuario_id: user?.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("factura_items").insert(items.map((i) => ({ ...i, factura_id: fac.id })));
  revalidatePath("/facturacion");
  redirect("/facturacion");
}

export async function cargarCAE(facturaId: number, cae: string, vencimiento: string) {
  const supabase = await createClient();
  await supabase.from("facturas").update({ cae, cae_vencimiento: vencimiento || null }).eq("id", facturaId);
  revalidatePath("/facturacion");
}

// ---------------- TESORERÍA ----------------
export async function registrarMovimientoCaja(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("caja_movimientos").insert({
    tipo: String(formData.get("tipo") || "egreso"),
    concepto: s(formData.get("concepto")),
    monto: n(formData.get("monto")),
    metodo: String(formData.get("metodo") || "efectivo"),
    referencia: s(formData.get("referencia")),
    usuario_id: user?.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/tesoreria");
}

export async function registrarGasto(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const neto = n(formData.get("neto"));
  const iva = n(formData.get("iva"));
  const { error } = await supabase.from("gastos").insert({
    categoria: s(formData.get("categoria")) ?? "general",
    descripcion: s(formData.get("descripcion")),
    proveedor_id: n(formData.get("proveedor_id")) || null,
    neto, iva, total: neto + iva,
    comprobante: s(formData.get("comprobante")),
    usuario_id: user?.id,
  });
  if (error) throw new Error(error.message);

  await supabase.from("caja_movimientos").insert({
    tipo: "egreso",
    concepto: `Gasto: ${s(formData.get("descripcion"))}`,
    monto: neto + iva,
    metodo: "efectivo",
    usuario_id: user?.id,
  });
  revalidatePath("/tesoreria");
  revalidatePath("/impuestos");
}

// ---------------- REPARTO ----------------
export async function crearRuta(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rutas_reparto")
    .insert({
      fecha: String(formData.get("fecha") || new Date().toISOString().slice(0, 10)),
      chofer_id: s(formData.get("chofer_id")),
      vehiculo_id: n(formData.get("vehiculo_id")) || null,
      notas: s(formData.get("notas")),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/reparto");
  redirect(`/reparto/${data.id}`);
}

export async function asignarPedidoARuta(pedidoId: number, rutaId: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("pedidos").update({ ruta_id: rutaId, estado: "en_reparto" }).eq("id", pedidoId).eq("estado", "confirmado");
  if (error) throw new Error(error.message);
  revalidatePath(`/reparto/${rutaId}`);
  revalidatePath("/ventas");
}

export async function cambiarEstadoRuta(rutaId: number, estado: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("rutas_reparto").update({ estado }).eq("id", rutaId);
  if (error) throw new Error(error.message);
  revalidatePath(`/reparto/${rutaId}`);
  revalidatePath("/reparto");
}

// ---------------- EQUIPO / AJUSTES ----------------
export async function actualizarRol(perfilId: string, rol: string, activo: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("perfiles").update({ rol, activo }).eq("id", perfilId);
  if (error) throw new Error(error.message);
  revalidatePath("/empleados");
}

export async function guardarEmpresa(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("empresa").upsert({
    id: 1,
    razon_social: s(formData.get("razon_social")),
    cuit: s(formData.get("cuit")) ?? "",
    condicion: String(formData.get("condicion") || "responsable_inscripto"),
    domicilio: s(formData.get("domicilio")),
    punto_venta: n(formData.get("punto_venta")) || 1,
    iibb: s(formData.get("iibb")),
    alicuota_iibb: n(formData.get("alicuota_iibb")),
    telefono: s(formData.get("telefono")),
    email: s(formData.get("email")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/ajustes");
}

export async function crearVehiculo(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("vehiculos").insert({
    patente: s(formData.get("patente")),
    descripcion: s(formData.get("descripcion")),
    capacidad_garrafas: n(formData.get("capacidad_garrafas")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/ajustes");
}
