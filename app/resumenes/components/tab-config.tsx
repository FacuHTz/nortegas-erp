"use client";

import { useState, useTransition } from "react";
import {
  Plus, Trash2, GripVertical, CheckCircle2, AlertTriangle, Settings2, LayoutList,
} from "lucide-react";
import {
  guardarResumenConfig,
  guardarCamposConfig,
  type ResumenConfigRow,
  type CampoConfig,
} from "@/lib/actions/resumenes";
import { Button } from "@/components/ui";

// ─── Campos base (hardcoded en la tabla) ─────────────────────────────────────
export const CAMPOS_BASE: { key: string; label: string }[] = [
  { key: "dinero_recaudado",    label: "Dinero recaudado" },
  { key: "empleados_pagados",   label: "Empleados pagados" },
  { key: "gastos_vehiculos",    label: "Gastos vehículos" },
  { key: "gastos_extras",       label: "Gastos extras" },
  { key: "compra_ypf_pago",     label: "Pago YPF" },
  { key: "compra_acosta_pago",  label: "Pago Acosta" },
  { key: "compra_viajes_pago",  label: "Pago Viajes" },
  { key: "compra_gustavo_pago", label: "Pago Gustavo" },
  { key: "ventas_10c", label: "Ventas x10C" },
  { key: "ventas_10b", label: "Ventas x10B" },
  { key: "ventas_15c", label: "Ventas x15C" },
  { key: "ventas_15b", label: "Ventas x15B" },
  { key: "ventas_45c", label: "Ventas x45C" },
  { key: "ventas_45b", label: "Ventas x45B" },
  { key: "compra_ypf_x10",     label: "YPF x10" },
  { key: "compra_ypf_x15",     label: "YPF x15" },
  { key: "compra_ypf_x45",     label: "YPF x45" },
  { key: "compra_acosta_x10",  label: "Acosta x10" },
  { key: "compra_acosta_x15",  label: "Acosta x15" },
  { key: "compra_acosta_x45",  label: "Acosta x45" },
  { key: "compra_viajes_x10",  label: "Viajes x10" },
  { key: "compra_viajes_x15",  label: "Viajes x15" },
  { key: "compra_viajes_x45",  label: "Viajes x45" },
  { key: "compra_gustavo_x10", label: "Gustavo x10" },
  { key: "compra_gustavo_x15", label: "Gustavo x15" },
  { key: "compra_gustavo_x45", label: "Gustavo x45" },
];

// ─── tipos locales ────────────────────────────────────────────────────────────
type LocalResumenRow = Omit<ResumenConfigRow, "id"> & { localId: number };
type LocalCampo      = Omit<CampoConfig, "id"> & { localId: number };

// ─── SubTab UI ────────────────────────────────────────────────────────────────
function SubTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-brand text-white shadow-sm"
          : "bg-white text-muted hover:bg-paper hover:text-ink"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Panel: Filas del resumen ─────────────────────────────────────────────────
function PanelResumen({
  initialConfig,
  camposExtra,
}: {
  initialConfig: ResumenConfigRow[];
  camposExtra: CampoConfig[];
}) {
  const todosLosCampos = [
    ...CAMPOS_BASE,
    ...camposExtra.map((c) => ({ key: `extra__${c.clave}`, label: `${c.etiqueta} (extra)` })),
  ];

  const [rows, setRows] = useState<LocalResumenRow[]>(
    initialConfig.map((r, i) => ({ ...r, localId: i }))
  );
  const [nextId, setNextId] = useState(initialConfig.length);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  function addRow() {
    setRows((prev) => [
      ...prev,
      { localId: nextId, orden: prev.length + 1, etiqueta: "", campos_suma: [], campos_resta: [], activo: true },
    ]);
    setNextId((n) => n + 1);
    setStatus("idle");
  }

  function updateRow(localId: number, updated: LocalResumenRow) {
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
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted">
          Definí qué campos componen cada fila del panel resumen.{" "}
          <span className="font-medium text-ok">+</span> suman y{" "}
          <span className="font-medium text-danger">−</span> restan al total.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" onClick={addRow}>
            <Plus size={14} /> Agregar fila
          </Button>
          <Button onClick={save} disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar"}
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
          <p className="mt-1 text-sm text-muted">Hacé clic en Agregar fila para crear la primera.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <ResumenFila
              key={row.localId}
              row={row}
              campos={todosLosCampos}
              onChange={(u) => updateRow(row.localId, u)}
              onDelete={() => deleteRow(row.localId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ResumenFila({
  row,
  campos,
  onChange,
  onDelete,
}: {
  row: LocalResumenRow;
  campos: { key: string; label: string }[];
  onChange: (r: LocalResumenRow) => void;
  onDelete: () => void;
}) {
  function toggleCampo(key: string, signo: "suma" | "resta") {
    const otro = signo === "suma" ? "campos_resta" : "campos_suma";
    const actual = signo === "suma" ? "campos_suma" : "campos_resta";
    const enActual = row[actual].includes(key);
    const enOtro   = row[otro].includes(key);
    if (enActual) {
      onChange({ ...row, [actual]: row[actual].filter((c) => c !== key) });
    } else {
      onChange({
        ...row,
        [actual]: [...row[actual], key],
        [otro]: enOtro ? row[otro].filter((c) => c !== key) : row[otro],
      });
    }
  }

  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <GripVertical size={16} className="shrink-0 text-muted/40" />
        <input
          type="text"
          value={row.etiqueta}
          onChange={(e) => onChange({ ...row, etiqueta: e.target.value })}
          placeholder="Nombre de la fila (ej: Dinero recaudado)"
          className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink placeholder:text-muted/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
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
          className="shrink-0 rounded-lg p-1.5 text-danger hover:bg-red-50"
          title="Eliminar fila"
        >
          <Trash2 size={15} />
        </button>
      </div>
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
            {campos.map(({ key, label }) => {
              const enSuma  = row.campos_suma.includes(key);
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

// ─── Panel: Campos del formulario ─────────────────────────────────────────────
const TIPOS_CAMPO = [
  { value: "numeric",  label: "Número ($ importe)" },
  { value: "integer",  label: "Entero (cantidad)" },
  { value: "text",     label: "Texto" },
] as const;

function PanelCampos({ initialCampos }: { initialCampos: CampoConfig[] }) {
  const [campos, setCampos] = useState<LocalCampo[]>(
    initialCampos.map((c, i) => ({ ...c, localId: i }))
  );
  const [nextId, setNextId] = useState(initialCampos.length);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  function addCampo() {
    setCampos((prev) => [
      ...prev,
      {
        localId: nextId,
        clave: "",
        etiqueta: "",
        tipo: "numeric",
        grupo: "otros",
        orden: prev.length + 1,
        activo: true,
      },
    ]);
    setNextId((n) => n + 1);
    setStatus("idle");
  }

  function updateCampo(localId: number, updated: LocalCampo) {
    setCampos((prev) => prev.map((c) => (c.localId === localId ? updated : c)));
    setStatus("idle");
  }

  function deleteCampo(localId: number) {
    setCampos((prev) => prev.filter((c) => c.localId !== localId));
    setStatus("idle");
  }

  function save() {
    // Validar claves únicas y no vacías
    const claves = campos.map((c) => c.clave.trim()).filter(Boolean);
    if (claves.length !== new Set(claves).size) {
      setStatus("error");
      setMsg("Hay claves duplicadas. Cada campo debe tener una clave única.");
      return;
    }
    const sinClave = campos.some((c) => !c.clave.trim() || !c.etiqueta.trim());
    if (sinClave) {
      setStatus("error");
      setMsg("Completá la clave y etiqueta de todos los campos antes de guardar.");
      return;
    }

    const payload = campos.map((c, i) => ({
      clave: toSnakeCase(c.clave),
      etiqueta: c.etiqueta.trim(),
      tipo: c.tipo,
      grupo: c.grupo.trim() || "otros",
      orden: i + 1,
      activo: c.activo,
    }));

    startTransition(async () => {
      try {
        await guardarCamposConfig(payload);
        setStatus("ok");
        setMsg("Campos guardados correctamente.");
      } catch (err: unknown) {
        setStatus("error");
        setMsg(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted">
            Creá campos personalizados para agregar nuevos conceptos (ej: tamaño de garrafa, tipo de gasto).
            Aparecerán en el formulario de carga diaria y en la grilla de edición.
          </p>
          <p className="text-xs text-muted/70">
            Los campos base (ventas, compras, gastos, etc.) no se pueden eliminar desde aquí.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" onClick={addCampo}>
            <Plus size={14} /> Nuevo campo
          </Button>
          <Button onClick={save} disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar"}
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

      {/* Campos base (solo lectura) */}
      <div className="rounded-xl border border-line bg-paper/60 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Campos base (no editables)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CAMPOS_BASE.map((c) => (
            <span
              key={c.key}
              className="rounded-md border border-line/80 bg-white px-2.5 py-1 text-xs text-ink"
            >
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {/* Campos personalizados */}
      {campos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white px-6 py-10 text-center">
          <p className="font-medium text-ink">Sin campos personalizados</p>
          <p className="mt-1 text-sm text-muted">
            Hacé clic en &quot;Nuevo campo&quot; para agregar un concepto extra al formulario.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-gray-50/80 text-left">
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">Clave interna</th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">Etiqueta visible</th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">Tipo</th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">Grupo</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted">Activo</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {campos.map((campo) => (
                <CampoFila
                  key={campo.localId}
                  campo={campo}
                  onChange={(u) => updateCampo(campo.localId, u)}
                  onDelete={() => deleteCampo(campo.localId)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CampoFila({
  campo,
  onChange,
  onDelete,
}: {
  campo: LocalCampo;
  onChange: (c: LocalCampo) => void;
  onDelete: () => void;
}) {
  const cellCls =
    "rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 w-full";

  return (
    <tr className="hover:bg-paper/50">
      <td className="px-2 py-1.5">
        <input
          type="text"
          value={campo.clave}
          onChange={(e) => onChange({ ...campo, clave: toSnakeCase(e.target.value) })}
          placeholder="ej: ventas_20c"
          className={cellCls}
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          type="text"
          value={campo.etiqueta}
          onChange={(e) => onChange({ ...campo, etiqueta: e.target.value })}
          placeholder="ej: GAS x20C"
          className={cellCls}
        />
      </td>
      <td className="px-2 py-1.5">
        <select
          value={campo.tipo}
          onChange={(e) => onChange({ ...campo, tipo: e.target.value as CampoConfig["tipo"] })}
          className={cellCls}
        >
          {TIPOS_CAMPO.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5">
        <input
          type="text"
          value={campo.grupo}
          onChange={(e) => onChange({ ...campo, grupo: e.target.value })}
          placeholder="ej: Ventas GAS"
          className={cellCls}
        />
      </td>
      <td className="px-2 py-1.5 text-center">
        <input
          type="checkbox"
          checked={campo.activo}
          onChange={(e) => onChange({ ...campo, activo: e.target.checked })}
          className="h-4 w-4 rounded accent-brand"
        />
      </td>
      <td className="px-2 py-1.5">
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg p-1.5 text-danger hover:bg-red-50"
          title="Eliminar campo"
        >
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  );
}

// ─── helper clave ─────────────────────────────────────────────────────────────
function toSnakeCase(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/__+/g, "_")
    .replace(/^_|_$/g, "");
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function TabConfig({
  initialConfig,
  initialCampos,
}: {
  initialConfig: ResumenConfigRow[];
  initialCampos: CampoConfig[];
}) {
  const [panel, setPanel] = useState<"resumen" | "campos">("resumen");

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex items-center gap-2 rounded-xl border border-line bg-paper/50 p-1.5">
        <SubTab
          active={panel === "resumen"}
          onClick={() => setPanel("resumen")}
          icon={<LayoutList size={15} />}
          label="Filas del resumen"
        />
        <SubTab
          active={panel === "campos"}
          onClick={() => setPanel("campos")}
          icon={<Settings2 size={15} />}
          label="Campos del formulario"
        />
      </div>

      {panel === "resumen" && (
        <PanelResumen initialConfig={initialConfig} camposExtra={initialCampos} />
      )}
      {panel === "campos" && (
        <PanelCampos initialCampos={initialCampos} />
      )}
    </div>
  );
}
