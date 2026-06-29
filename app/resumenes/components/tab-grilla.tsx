"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { actualizarRegistrosDiarios, type RegistroDiario, type CampoConfig } from "@/lib/actions/resumenes";
import { Button } from "@/components/ui";
import { CheckCircle2, AlertTriangle } from "lucide-react";

// ─── config de columnas ─────────────────────────────────────────────────────
const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

type ColDef = { key: keyof RegistroDiario; label: string; int?: boolean; isExtra?: boolean; clave?: string };

const COLS: ColDef[] = [
  { key: "dinero_recaudado",   label: "Recaudado ($)" },
  { key: "empleados_pagados",  label: "Empleados ($)" },
  { key: "gastos_vehiculos",   label: "Vehículos ($)" },
  { key: "gastos_extras",      label: "Extras ($)" },
  { key: "ventas_10c",  label: "10C",  int: true },
  { key: "ventas_10b",  label: "10B",  int: true },
  { key: "ventas_15c",  label: "15C",  int: true },
  { key: "ventas_15b",  label: "15B",  int: true },
  { key: "ventas_45c",  label: "45C",  int: true },
  { key: "ventas_45b",  label: "45B",  int: true },
  { key: "compra_ypf_pago",    label: "YPF $" },
  { key: "compra_ypf_x10",     label: "YPF x10",  int: true },
  { key: "compra_ypf_x15",     label: "YPF x15",  int: true },
  { key: "compra_ypf_x45",     label: "YPF x45",  int: true },
  { key: "compra_acosta_pago", label: "Acosta $" },
  { key: "compra_acosta_x10",  label: "Acosta x10", int: true },
  { key: "compra_acosta_x15",  label: "Acosta x15", int: true },
  { key: "compra_acosta_x45",  label: "Acosta x45", int: true },
  { key: "compra_viajes_pago", label: "Viajes $" },
  { key: "compra_viajes_x10",  label: "Viajes x10", int: true },
  { key: "compra_viajes_x15",  label: "Viajes x15", int: true },
  { key: "compra_viajes_x45",  label: "Viajes x45", int: true },
  { key: "compra_gustavo_pago","label": "Gustavo $" },
  { key: "compra_gustavo_x10", label: "Gust x10", int: true },
  { key: "compra_gustavo_x15", label: "Gust x15", int: true },
  { key: "compra_gustavo_x45", label: "Gust x45", int: true },
];

// ─── componente ─────────────────────────────────────────────────────────────
export function TabGrilla({ camposExtra = [] }: { camposExtra?: CampoConfig[] }) {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [rows, setRows] = useState<RegistroDiario[]>([]);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setDirty(false);
      const sb = createClient();
      const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
      const hasta = `${anio}-${String(mes).padStart(2, "0")}-31`;
      const { data } = await sb
        .from("registros_diarios")
        .select("*")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("fecha");
      setRows((data as RegistroDiario[]) ?? []);
      setLoading(false);
    }
    load();
  }, [mes, anio]);

  // Columnas extra dinámicas
  const extraCols: ColDef[] = camposExtra.map((c) => ({
    key: `__extra__${c.clave}` as keyof RegistroDiario,
    label: c.etiqueta,
    int: c.tipo === "integer",
    isExtra: true,
    clave: c.clave,
  }));
  const allCols = [...COLS, ...extraCols];

  function updateCell(rowIdx: number, key: keyof RegistroDiario, val: string, isExtra?: boolean, clave?: string) {
    setRows((prev) => {
      const next = [...prev];
      if (isExtra && clave) {
        const datos_extra = { ...(next[rowIdx].datos_extra ?? {}), [clave]: val === "" ? 0 : Number(val) };
        next[rowIdx] = { ...next[rowIdx], datos_extra };
      } else {
        next[rowIdx] = { ...next[rowIdx], [key]: val === "" ? 0 : Number(val) };
      }
      return next;
    });
    setDirty(true);
    setStatus("idle");
  }

  function save() {
    startTransition(async () => {
      try {
        await actualizarRegistrosDiarios(rows);
        setStatus("ok");
        setMsg("Cambios guardados correctamente.");
        setDirty(false);
      } catch (err: unknown) {
        setStatus("error");
        setMsg(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* ── Controles ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            {MESES.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            {[anio - 1, anio, anio + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {loading && <span className="text-sm text-muted">Cargando…</span>}
        </div>
        <Button
          onClick={save}
          disabled={!dirty || isPending}
          variant={dirty ? "primary" : "secondary"}
        >
          {isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>

      {/* ── Feedback ── */}
      {status === "ok" && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-800">
          <CheckCircle2 size={15} /> {msg}
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
          <AlertTriangle size={15} /> {msg}
        </div>
      )}

      {rows.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white px-6 py-14 text-center">
          <p className="font-medium text-ink">Sin registros para este mes</p>
          <p className="mt-1 text-sm text-muted">Cargá los datos desde la pestaña Carga Diaria.</p>
        </div>
      ) : (
        /* ── Grilla editable ── */
        <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line bg-gray-50/80">
                <th className="sticky left-0 z-10 whitespace-nowrap bg-gray-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Fecha
                </th>
                {allCols.map((c) => (
                  <th
                    key={String(c.key)}
                    className={`whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide ${
                      (c as ColDef & { isExtra?: boolean }).isExtra ? "text-brand/70" : "text-muted"
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {rows.map((row, ri) => (
                <tr key={row.fecha} className="hover:bg-paper/60">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 font-medium text-ink">
                    {row.fecha}
                  </td>
                  {allCols.map((col) => {
                    const extCol = col as ColDef & { isExtra?: boolean; clave?: string };
                    const val = extCol.isExtra && extCol.clave
                      ? String((row.datos_extra ?? {})[extCol.clave] ?? 0)
                      : String(row[col.key] ?? 0);
                    return (
                      <td key={String(col.key)} className="px-1 py-1">
                        <input
                          type="number"
                          min="0"
                          step={col.int ? "1" : "0.01"}
                          value={val}
                          onChange={(e) =>
                            updateCell(ri, col.key, e.target.value, extCol.isExtra, extCol.clave)
                          }
                          className="w-24 rounded border border-transparent bg-transparent px-2 py-1 text-right text-xs tabular-nums text-ink hover:border-line focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand/30"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dirty && (
        <p className="text-xs text-amber-700">
          Hay cambios sin guardar. Presioná &quot;Guardar cambios&quot; para confirmar.
        </p>
      )}
    </div>
  );
}
