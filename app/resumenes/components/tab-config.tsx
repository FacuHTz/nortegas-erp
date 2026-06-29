"use client";

import { useState, useTransition } from "react";
import {
  Plus, GripVertical, CheckCircle2, AlertTriangle, Settings2, LayoutList, Lock,
} from "lucide-react";
import {
  guardarResumenConfig,
  guardarCamposConfig,
  type ResumenConfigRow,
  type CampoConfig,
} from "@/lib/actions/resumenes";
import { Button } from "@/components/ui";

// ─── tipos locales ────────────────────────────────────────────────────────────
type LocalResumenRow = Omit<ResumenConfigRow, "id"> & { localId: number };
type LocalCampo      = CampoConfig & { localId: number };

// ─── SubTab UI ────────────────────────────────────────────────────────────────
function SubTab({
  active, onClick, icon, label,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
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
  todosLosCampos,
}: {
  initialConfig: ResumenConfigRow[];
  todosLosCampos: { key: string; label: string }[];
}) {
  const [rows, setRows] = useState<LocalResumenRow[]>(
    initialConfig.map((r, i) => ({ ...r, localId: i }))
  );
  const [nextId, setNextId]   = useState(initialConfig.length);
  const [status, setStatus]   = useState<"idle" | "ok" | "error">("idle");
  const [msg, setMsg]         = useState("");
  const [isPending, startTransition] = useTransition();

  function addRow() {
    setRows((p) => [...p, { localId: nextId, orden: p.length + 1, etiqueta: "", campos_suma: [], campos_resta: [], activo: true }]);
    setNextId((n) => n + 1);
    setStatus("idle");
  }

  function updateRow(id: number, updated: LocalResumenRow) {
    setRows((p) => p.map((r) => (r.localId === id ? updated : r)));
    setStatus("idle");
  }

  function deleteRow(id: number) {
    setRows((p) => p.filter((r) => r.localId !== id));
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
        setStatus("ok"); setMsg("Configuración guardada correctamente.");
      } catch (err: unknown) {
        setStatus("error"); setMsg(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted">
          Definí qué campos componen cada fila del panel resumen.{" "}
          <span className="font-semibold text-ok">+</span> suman y{" "}
          <span className="font-semibold text-danger">−</span> restan al total.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" onClick={addRow}><Plus size={14} /> Agregar fila</Button>
          <Button onClick={save} disabled={isPending}>{isPending ? "Guardando…" : "Guardar"}</Button>
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
  row, campos, onChange, onDelete,
}: {
  row: LocalResumenRow;
  campos: { key: string; label: string }[];
  onChange: (r: LocalResumenRow) => void;
  onDelete: () => void;
}) {
  function toggleCampo(key: string, signo: "suma" | "resta") {
    const otro   = signo === "suma" ? "campos_resta" : "campos_suma";
    const actual = signo === "suma" ? "campos_suma"  : "campos_resta";
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
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
                    <input type="checkbox" checked={enSuma}  onChange={() => toggleCampo(key, "suma")}  className="h-3.5 w-3.5 accent-ok" />
                  </td>
                  <td className="py-1 text-center">
                    <input type="checkbox" checked={enResta} onChange={() => toggleCampo(key, "resta")} className="h-3.5 w-3.5 accent-danger" />
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
  { value: "numeric", label: "Número ($ importe)" },
  { value: "integer", label: "Entero (cantidad)" },
  { value: "text",    label: "Texto" },
] as const;

function PanelCampos({ initialCampos }: { initialCampos: CampoConfig[] }) {
  const [campos, setCampos] = useState<LocalCampo[]>(
    initialCampos.map((c, i) => ({ ...c, localId: i }))
  );
  const [nextId, setNextId] = useState(initialCampos.length);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [msg, setMsg]       = useState("");
  const [isPending, startTransition] = useTransition();

  // Grupos existentes para el datalist
  const grupos = [...new Set(campos.map((c) => c.grupo).filter(Boolean))];

  function addCampo() {
    setCampos((p) => [
      ...p,
      { localId: nextId, clave: "", etiqueta: "", tipo: "numeric", grupo: "otros", orden: p.length + 1, activo: true, es_base: false },
    ]);
    setNextId((n) => n + 1);
    setStatus("idle");
  }

  function updateCampo(id: number, updated: LocalCampo) {
    setCampos((p) => p.map((c) => (c.localId === id ? updated : c)));
    setStatus("idle");
  }

  function save() {
    // Validar solo los custom (los base siempre tienen clave)
    const custom = campos.filter((c) => !c.es_base);
    const sinDatos = custom.some((c) => !c.clave.trim() || !c.etiqueta.trim());
    if (sinDatos) {
      setStatus("error");
      setMsg("Completá la clave y etiqueta de todos los campos personalizados antes de guardar.");
      return;
    }
    const claves = custom.map((c) => c.clave.trim());
    if (claves.length !== new Set(claves).size) {
      setStatus("error");
      setMsg("Hay claves duplicadas en los campos personalizados.");
      return;
    }

    const payload = campos.map((c, i) => ({
      clave:    toSnakeCase(c.clave),
      etiqueta: c.etiqueta.trim(),
      tipo:     c.tipo,
      grupo:    c.grupo.trim() || "otros",
      orden:    i + 1,
      activo:   c.activo,
      es_base:  c.es_base ?? false,
    }));

    startTransition(async () => {
      try {
        await guardarCamposConfig(payload);
        setStatus("ok"); setMsg("Campos guardados correctamente.");
      } catch (err: unknown) {
        setStatus("error"); setMsg(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted">
            Editá los campos base (etiqueta, grupo y estado) o creá campos personalizados.
            Los campos no se eliminan; se desactivan para preservar el historial.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" onClick={addCampo}><Plus size={14} /> Nuevo campo</Button>
          <Button onClick={save} disabled={isPending}>{isPending ? "Guardando…" : "Guardar"}</Button>
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

      {/* Tabla unificada de todos los campos */}
      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-gray-50/80 text-left">
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">Clave interna</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">Etiqueta visible</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">Tipo</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">Grupo</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted">Activo</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {campos.map((campo) => (
              <CampoFila
                key={campo.localId}
                campo={campo}
                grupos={grupos}
                onChange={(u) => updateCampo(campo.localId, u)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CampoFila({
  campo, grupos, onChange,
}: {
  campo: LocalCampo;
  grupos: string[];
  onChange: (c: LocalCampo) => void;
}) {
  const inputCls =
    "rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 w-full disabled:bg-gray-50 disabled:text-muted disabled:cursor-not-allowed";

  const listId = `grupos-${campo.localId}`;

  return (
    <tr className={`transition-colors ${campo.activo ? "hover:bg-paper/50" : "bg-gray-50/60 opacity-60"}`}>
      {/* Clave */}
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          {campo.es_base && (
            <span title="Campo base del sistema">
              <Lock size={12} className="shrink-0 text-muted/60" />
            </span>
          )}
          <input
            type="text"
            value={campo.clave}
            disabled={campo.es_base}
            onChange={(e) => onChange({ ...campo, clave: toSnakeCase(e.target.value) })}
            placeholder="ej: ventas_20c"
            className={inputCls}
          />
        </div>
      </td>
      {/* Etiqueta */}
      <td className="px-2 py-1.5">
        <input
          type="text"
          value={campo.etiqueta}
          onChange={(e) => onChange({ ...campo, etiqueta: e.target.value })}
          placeholder="ej: GAS x20C"
          className={inputCls}
        />
      </td>
      {/* Tipo */}
      <td className="px-2 py-1.5">
        <select
          value={campo.tipo}
          disabled={campo.es_base}
          onChange={(e) => onChange({ ...campo, tipo: e.target.value as CampoConfig["tipo"] })}
          className={inputCls}
        >
          {TIPOS_CAMPO.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </td>
      {/* Grupo */}
      <td className="px-2 py-1.5">
        <datalist id={listId}>
          {grupos.map((g) => <option key={g} value={g} />)}
        </datalist>
        <input
          type="text"
          list={listId}
          value={campo.grupo}
          onChange={(e) => onChange({ ...campo, grupo: e.target.value })}
          placeholder="ej: Ventas GAS"
          className={inputCls}
        />
      </td>
      {/* Activo */}
      <td className="px-2 py-1.5 text-center">
        <input
          type="checkbox"
          checked={campo.activo}
          onChange={(e) => onChange({ ...campo, activo: e.target.checked })}
          className="h-4 w-4 rounded accent-brand"
        />
      </td>
      {/* Indicador BASE o vacío para custom */}
      <td className="px-3 py-1.5">
        {campo.es_base ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-muted">
            <Lock size={10} /> BASE
          </span>
        ) : (
          <span className="text-xs text-muted/50">custom</span>
        )}
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

  // Campos activos para el panel de resumen (todos, base + custom activos)
  const todosLosCampos = initialCampos
    .filter((c) => c.activo)
    .map((c) => ({
      key: c.es_base ? c.clave : `extra__${c.clave}`,
      label: c.etiqueta,
    }));

  return (
    <div className="space-y-5">
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
        <PanelResumen initialConfig={initialConfig} todosLosCampos={todosLosCampos} />
      )}
      {panel === "campos" && (
        <PanelCampos initialCampos={initialCampos} />
      )}
    </div>
  );
}
