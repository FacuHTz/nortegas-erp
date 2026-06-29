"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, GripVertical, CheckCircle2, AlertTriangle } from "lucide-react";
import { guardarResumenConfig, type ResumenConfigRow } from "@/lib/actions/resumenes";
import { Button } from "@/components/ui";

// ─── todos los campos numéricos disponibles ──────────────────────────────────
const CAMPOS_DISPONIBLES: { key: string; label: string }[] = [
  { key: "dinero_recaudado",    label: "Dinero recaudado" },
  { key: "empleados_pagados",   label: "Empleados pagados" },
  { key: "gastos_vehiculos",    label: "Gastos vehículos" },
  { key: "gastos_extras",       label: "Gastos extras" },
  { key: "compra_ypf_pago",     label: "Pago YPF" },
  { key: "compra_acosta_pago",  label: "Pago Acosta" },
  { key: "compra_viajes_pago",  label: "Pago Viajes" },
  { key: "compra_gustavo_pago", label: "Pago Gustavo" },
  { key: "ventas_10c", label: "Ventas x10C (qty)" },
  { key: "ventas_10b", label: "Ventas x10B (qty)" },
  { key: "ventas_15c", label: "Ventas x15C (qty)" },
  { key: "ventas_15b", label: "Ventas x15B (qty)" },
  { key: "ventas_45c", label: "Ventas x45C (qty)" },
  { key: "ventas_45b", label: "Ventas x45B (qty)" },
  { key: "compra_ypf_x10",     label: "YPF x10 (qty)" },
  { key: "compra_ypf_x15",     label: "YPF x15 (qty)" },
  { key: "compra_ypf_x45",     label: "YPF x45 (qty)" },
  { key: "compra_acosta_x10",  label: "Acosta x10 (qty)" },
  { key: "compra_acosta_x15",  label: "Acosta x15 (qty)" },
  { key: "compra_acosta_x45",  label: "Acosta x45 (qty)" },
  { key: "compra_viajes_x10",  label: "Viajes x10 (qty)" },
  { key: "compra_viajes_x15",  label: "Viajes x15 (qty)" },
  { key: "compra_viajes_x45",  label: "Viajes x45 (qty)" },
  { key: "compra_gustavo_x10", label: "Gustavo x10 (qty)" },
  { key: "compra_gustavo_x15", label: "Gustavo x15 (qty)" },
  { key: "compra_gustavo_x45", label: "Gustavo x45 (qty)" },
];

type LocalRow = Omit<ResumenConfigRow, "id"> & { localId: number };

// ─── componente de fila ──────────────────────────────────────────────────────
function ConfigFila({
  row,
  onChange,
  onDelete,
}: {
  row: LocalRow;
  onChange: (r: LocalRow) => void;
  onDelete: () => void;
}) {
  function toggleCampo(key: string, signo: "suma" | "resta") {
    const otroCampo = signo === "suma" ? "campos_resta" : "campos_suma";
    const campoActual = signo === "suma" ? "campos_suma" : "campos_resta";

    const enActual = row[campoActual].includes(key);
    const enOtro = row[otroCampo].includes(key);

    if (enActual) {
      // desactivar
      onChange({ ...row, [campoActual]: row[campoActual].filter((c) => c !== key) });
    } else {
      // activar en este signo, quitar del otro si estaba
      onChange({
        ...row,
        [campoActual]: [...row[campoActual], key],
        [otroCampo]: enOtro ? row[otroCampo].filter((c) => c !== key) : row[otroCampo],
      });
    }
  }

  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
      {/* Cabecera de la fila */}
      <div className="mb-3 flex items-center gap-3">
        <GripVertical size={16} className="shrink-0 text-muted/50" />
        <input
          type="text"
          value={row.etiqueta}
          onChange={(e) => onChange({ ...row, etiqueta: e.target.value })}
          placeholder="Nombre de la fila (ej: Dinero recaudado)"
          className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink placeholder:text-muted/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={row.activo}
            onChange={(e) => onChange({ ...row, activo: e.target.checked })}
            className="rounded"
          />
          Activo
        </label>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg p-1.5 text-danger hover:bg-red-50"
          title="Eliminar fila"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Tabla de campos */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-line">
              <th className="pb-1.5 text-left text-xs font-semibold text-muted">Campo</th>
              <th className="pb-1.5 text-center text-xs font-semibold text-ok">+ Suma</th>
              <th className="pb-1.5 text-center text-xs font-semibold text-danger">− Resta</th>
            </tr>
          </thead>
          <tbody>
            {CAMPOS_DISPONIBLES.map(({ key, label }) => {
              const enSuma = row.campos_suma.includes(key);
              const enResta = row.campos_resta.includes(key);
              return (
                <tr key={key} className="hover:bg-paper/50">
                  <td className="py-1 pr-4 text-ink">{label}</td>
                  <td className="py-1 text-center">
                    <input
                      type="checkbox"
                      checked={enSuma}
                      onChange={() => toggleCampo(key, "suma")}
                      className="h-3.5 w-3.5 accent-ok"
                    />
                  </td>
                  <td className="py-1 text-center">
                    <input
                      type="checkbox"
                      checked={enResta}
                      onChange={() => toggleCampo(key, "resta")}
                      className="h-3.5 w-3.5 accent-danger"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── componente principal ────────────────────────────────────────────────────
export function TabConfig({ initialConfig }: { initialConfig: ResumenConfigRow[] }) {
  const [rows, setRows] = useState<LocalRow[]>(
    initialConfig.map((r, i) => ({ ...r, localId: i }))
  );
  const [nextId, setNextId] = useState(initialConfig.length);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        localId: nextId,
        orden: prev.length + 1,
        etiqueta: "",
        campos_suma: [],
        campos_resta: [],
        activo: true,
      },
    ]);
    setNextId((n) => n + 1);
    setStatus("idle");
  }

  function updateRow(localId: number, updated: LocalRow) {
    setRows((prev) => prev.map((r) => (r.localId === localId ? updated : r)));
    setStatus("idle");
  }

  function deleteRow(localId: number) {
    setRows((prev) => prev.filter((r) => r.localId !== localId));
    setStatus("idle");
  }

  function save() {
    const payload = rows.map((r, i) => ({
      orden: i + 1,
      etiqueta: r.etiqueta,
      campos_suma: r.campos_suma,
      campos_resta: r.campos_resta,
      activo: r.activo,
    }));
    startTransition(async () => {
      try {
        await guardarResumenConfig(payload);
        setStatus("ok");
        setMsg("Configuración guardada correctamente.");
      } catch (err: unknown) {
        setStatus("error");
        setMsg(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">
            Definí qué campos de los registros diarios componen cada fila del panel resumen.
            Los campos marcados con <span className="font-medium text-ok">+</span> suman y los marcados con{" "}
            <span className="font-medium text-danger">−</span> restan al total de esa fila.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={addRow}>
            <Plus size={15} /> Agregar fila
          </Button>
          <Button onClick={save} disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar config"}
          </Button>
        </div>
      </div>

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

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white px-6 py-14 text-center">
          <p className="font-medium text-ink">Sin filas configuradas</p>
          <p className="mt-1 text-sm text-muted">Hacé clic en Agregar fila para crear la primera fila del resumen.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <ConfigFila
              key={row.localId}
              row={row}
              onChange={(updated) => updateRow(row.localId, updated)}
              onDelete={() => deleteRow(row.localId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
