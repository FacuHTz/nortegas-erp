"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ── helpers ──────────────────────────────────────────────────────────────────
function num(v: unknown) { return Number(v ?? 0) || 0; }
function str(v: unknown) { return String(v ?? "").trim() || null; }

// ── tipos ────────────────────────────────────────────────────────────────────
export type RegistroDiario = {
  id?: number;
  fecha: string;
  dinero_recaudado: number;
  empleados_pagados: number;
  gastos_vehiculos: number;
  gastos_extras: number;
  ventas_10c: number;
  ventas_10b: number;
  ventas_15c: number;
  ventas_15b: number;
  ventas_45c: number;
  ventas_45b: number;
  compra_ypf_pago: number;
  compra_ypf_x10: number;
  compra_ypf_x15: number;
  compra_ypf_x45: number;
  compra_acosta_pago: number;
  compra_acosta_x10: number;
  compra_acosta_x15: number;
  compra_acosta_x45: number;
  compra_viajes_pago: number;
  compra_viajes_x10: number;
  compra_viajes_x15: number;
  compra_viajes_x45: number;
  compra_gustavo_pago: number;
  compra_gustavo_x10: number;
  compra_gustavo_x15: number;
  compra_gustavo_x45: number;
  datos_extra: Record<string, number | string>;
  notas?: string | null;
};

export type ResumenConfigRow = {
  id: number;
  orden: number;
  etiqueta: string;
  campos_suma: string[];
  campos_resta: string[];
  activo: boolean;
};

/** Definición de un campo personalizado */
export type CampoConfig = {
  id?: number;
  clave: string;
  etiqueta: string;
  tipo: "numeric" | "integer" | "text";
  grupo: string;
  orden: number;
  activo: boolean;
};

// ── CARGA DE UN DÍA ──────────────────────────────────────────────────────────
export async function guardarRegistroDiario(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const fecha = String(formData.get("fecha") ?? "").trim();
  if (!fecha) throw new Error("La fecha es obligatoria");

  // verificar duplicado
  const { data: existing } = await supabase
    .from("registros_diarios")
    .select("id")
    .eq("fecha", fecha)
    .maybeSingle();
  if (existing) throw new Error(`Ya existe un registro para ${fecha}. Editalo desde la grilla.`);

  const payload = buildPayload(formData, user.id);
  const { error } = await supabase.from("registros_diarios").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath("/resumenes");
  return { ok: true };
}

// ── EDICIÓN DESDE GRILLA (batch upsert) ──────────────────────────────────────
export async function actualizarRegistrosDiarios(registros: RegistroDiario[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const rows = registros.map((r) => ({ ...r, usuario_id: user.id }));
  const { error } = await supabase
    .from("registros_diarios")
    .upsert(rows, { onConflict: "fecha", ignoreDuplicates: false });
  if (error) throw new Error(error.message);

  revalidatePath("/resumenes");
  return { ok: true };
}

// ── GUARDAR CONFIGURACIÓN DEL RESUMEN ────────────────────────────────────────
export async function guardarResumenConfig(rows: Omit<ResumenConfigRow, "id">[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error: delErr } = await supabase
    .from("resumen_config")
    .delete()
    .neq("id", 0);
  if (delErr) throw new Error(delErr.message);

  if (rows.length > 0) {
    const { error } = await supabase.from("resumen_config").insert(rows);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/resumenes");
  return { ok: true };
}

// ── GUARDAR CAMPOS PERSONALIZADOS ────────────────────────────────────────────
export async function guardarCamposConfig(campos: Omit<CampoConfig, "id">[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Reemplazar toda la config de campos
  const { error: delErr } = await supabase
    .from("campos_config")
    .delete()
    .neq("id", 0);
  if (delErr) throw new Error(delErr.message);

  if (campos.length > 0) {
    const { error } = await supabase.from("campos_config").insert(campos);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/resumenes");
  return { ok: true };
}

// ── helpers privados ─────────────────────────────────────────────────────────
function buildPayload(formData: FormData, userId: string) {
  // Extraer datos_extra: cualquier key que empiece con "extra__"
  const datos_extra: Record<string, number | string> = {};
  formData.forEach((val, key) => {
    if (key.startsWith("extra__")) {
      const campo = key.slice(7);
      datos_extra[campo] = val.toString();
    }
  });

  return {
    fecha: String(formData.get("fecha") ?? "").trim(),
    dinero_recaudado:   num(formData.get("dinero_recaudado")),
    empleados_pagados:  num(formData.get("empleados_pagados")),
    gastos_vehiculos:   num(formData.get("gastos_vehiculos")),
    gastos_extras:      num(formData.get("gastos_extras")),
    ventas_10c: num(formData.get("ventas_10c")),
    ventas_10b: num(formData.get("ventas_10b")),
    ventas_15c: num(formData.get("ventas_15c")),
    ventas_15b: num(formData.get("ventas_15b")),
    ventas_45c: num(formData.get("ventas_45c")),
    ventas_45b: num(formData.get("ventas_45b")),
    compra_ypf_pago:    num(formData.get("compra_ypf_pago")),
    compra_ypf_x10:     num(formData.get("compra_ypf_x10")),
    compra_ypf_x15:     num(formData.get("compra_ypf_x15")),
    compra_ypf_x45:     num(formData.get("compra_ypf_x45")),
    compra_acosta_pago: num(formData.get("compra_acosta_pago")),
    compra_acosta_x10:  num(formData.get("compra_acosta_x10")),
    compra_acosta_x15:  num(formData.get("compra_acosta_x15")),
    compra_acosta_x45:  num(formData.get("compra_acosta_x45")),
    compra_viajes_pago: num(formData.get("compra_viajes_pago")),
    compra_viajes_x10:  num(formData.get("compra_viajes_x10")),
    compra_viajes_x15:  num(formData.get("compra_viajes_x15")),
    compra_viajes_x45:  num(formData.get("compra_viajes_x45")),
    compra_gustavo_pago: num(formData.get("compra_gustavo_pago")),
    compra_gustavo_x10:  num(formData.get("compra_gustavo_x10")),
    compra_gustavo_x15:  num(formData.get("compra_gustavo_x15")),
    compra_gustavo_x45:  num(formData.get("compra_gustavo_x45")),
    datos_extra,
    notas: str(formData.get("notas")),
    usuario_id: userId,
  };
}
