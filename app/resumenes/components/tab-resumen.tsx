"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ars, num } from "@/lib/format";
import type { RegistroDiario, ResumenConfigRow } from "@/lib/actions/resumenes";

// ─── helpers ────────────────────────────────────────────────────────────────
const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

// Bug 2 fix: soporta prefijo extra__ para campos dinámicos en datos_extra
function sumField(rows: RegistroDiario[], field: string) {
  return rows.reduce((a, r) => {
    if (field.startsWith("extra__")) {
      const clave = field.slice(7);
      return a + (Number((r.datos_extra ?? {})[clave]) || 0);
    }
    return a + (Number(r[field as keyof RegistroDiario]) || 0);
  }, 0);
}

function calcResumenRow(rows: RegistroDiario[], config: ResumenConfigRow) {
  const suma  = config.campos_suma.reduce((a, f) => a + sumField(rows, f), 0);
  const resta = config.campos_resta.reduce((a, f) => a + sumField(rows, f), 0);
  return suma - resta;
}

// ─── componente ─────────────────────────────────────────────────────────────
export function TabResumen({
  initialConfig,
}: {
  initialConfig: ResumenConfigRow[];
}) {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [registros, setRegistros] = useState<RegistroDiario[]>([]);
  const [config, setConfig] = useState<ResumenConfigRow[]>(initialConfig);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const sb = createClient();
      const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
      const hasta = new Date(anio, mes, 0).toISOString().slice(0, 10);
      const [{ data: regs }, { data: cfg }] = await Promise.all([
        sb
          .from("registros_diarios")
          .select("*")
          .gte("fecha", desde)
          .lte("fecha", hasta)
          .order("fecha"),
        sb
          .from("resumen_config")
          .select("*")
          .eq("activo", true)
          .order("orden"),
      ]);
      setRegistros((regs as RegistroDiario[]) ?? []);
      if (cfg && cfg.length > 0) setConfig(cfg as ResumenConfigRow[]);
      setLoading(false);
    }
    load();
  }, [mes, anio]);

  // totales ventas
  const ventasTotales = {
    "GAS x10C": sumField(registros, "ventas_10c"),
    "GAS x10B": sumField(registros, "ventas_10b"),
    "GAS x15C": sumField(registros, "ventas_15c"),
    "GAS x15B": sumField(registros, "ventas_15b"),
    "GAS x45C": sumField(registros, "ventas_45c"),
    "GAS x45B": sumField(registros, "ventas_45b"),
  };

  // totales compras
  const proveedores = [
    { key: "ypf",    label: "YPF" },
    { key: "acosta", label: "Acosta" },
    { key: "viajes", label: "Viajes" },
    { key: "gustavo",label: "Gustavo" },
  ] as const;

  const totalCompras = proveedores.reduce(
    (a, p) => a + sumField(registros, `compra_${p.key}_pago` as keyof RegistroDiario),
    0
  );

  // Bug 1 fix: grandTotal es la suma de todas las filas del resumen activo
  const grandTotal = config
    .filter((c) => c.activo)
    .reduce((acc, row) => acc + calcResumenRow(registros, row), 0);

  const resumenFinal = config
    .filter((c) => c.activo)
    .map((row) => ({ etiqueta: row.etiqueta, valor: calcResumenRow(registros, row) }));

  return (
    <div className="space-y-6">
      {/* ── Selector de mes/año ── */}
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
        {!loading && (
          <span className="text-sm text-muted">
            {registros.length} {registros.length === 1 ? "día cargado" : "días cargados"}
          </span>
        )}
      </div>

      {registros.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white px-6 py-14 text-center">
          <p className="font-medium text-ink">Sin registros para este mes</p>
          <p className="mt-1 text-sm text-muted">Cargá los datos desde la pestaña Carga Diaria.</p>
        </div>
      ) : (
        <>
          {/* ── Panel resumen ── */}
          <div className="rounded-xl border border-line bg-white shadow-sm">
            <div className="border-b border-line px-5 py-3">
              <h2 className="font-display text-base font-bold text-ink">
                Resumen mensual — {MESES[mes - 1]} {anio}
              </h2>
            </div>
            <div className="divide-y divide-line/60">
              {resumenFinal.map(({ etiqueta, valor }) => (
                <div key={etiqueta} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-ink">{etiqueta}</span>
                  <span className="font-display text-sm font-semibold tabular-nums text-ink">
                    {ars(valor)}
                  </span>
                </div>
              ))}

              {/* Total general destacado — Bug 1 fix */}
              <div className="flex items-center justify-between bg-brand/5 px-5 py-4">
                <span className="font-display text-sm font-bold uppercase tracking-wide text-ink">Total</span>
                <span className="font-display text-2xl font-bold tabular-nums text-brand">{ars(grandTotal)}</span>
              </div>

              {/* VENTAS GAS inline */}
              <div className="px-5 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Ventas GAS</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {Object.entries(ventasTotales).map(([label, qty]) => (
                    <div key={label} className="rounded-lg bg-paper px-2 py-2 text-center">
                      <p className="text-xs font-semibold text-ink">{label}</p>
                      <p className="font-display text-lg font-bold tabular-nums text-brand">{num(qty)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Tabla compras por proveedor ── */}
          <div className="rounded-xl border border-line bg-white shadow-sm">
            <div className="border-b border-line px-5 py-3">
              <h2 className="text-sm font-semibold text-ink">Compras por proveedor</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-gray-50/70 text-left">
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">Proveedor</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Pago</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">x10</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">x15</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">x45</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {proveedores.map(({ key, label }) => (
                    <tr key={key}>
                      <td className="px-4 py-2.5 font-medium text-ink">{label}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {ars(sumField(registros, `compra_${key}_pago` as keyof RegistroDiario))}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                        {num(sumField(registros, `compra_${key}_x10` as keyof RegistroDiario))}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                        {num(sumField(registros, `compra_${key}_x15` as keyof RegistroDiario))}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                        {num(sumField(registros, `compra_${key}_x45` as keyof RegistroDiario))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Total destacado */}
            <div className="flex items-center justify-between border-t border-line bg-brand/5 px-5 py-4">
              <span className="font-display text-sm font-bold uppercase tracking-wide text-ink">Total compras</span>
              <span className="font-display text-2xl font-bold tabular-nums text-brand">{ars(totalCompras)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
