"use client";

import { useRef, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { guardarRegistroDiario, type CampoConfig } from "@/lib/actions/resumenes";
import { Card, Input, Button } from "@/components/ui";

// ─── helpers ────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">{children}</div>
    </div>
  );
}

function NumInput({
  label,
  name,
  int,
  isExtra,
}: {
  label: string;
  name: string;
  int?: boolean;
  isExtra?: boolean;
}) {
  return (
    <Input
      label={label}
      name={isExtra ? `extra__${name}` : name}
      type="number"
      min="0"
      step={int ? "1" : "0.01"}
      defaultValue="0"
    />
  );
}

// ─── componente ─────────────────────────────────────────────────────────────
export function TabCarga({ camposExtra }: { camposExtra: CampoConfig[] }) {
  const [fecha, setFecha] = useState(today());
  const [status, setStatus] = useState<"idle" | "checking" | "exists" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function checkFecha(val: string) {
    setFecha(val);
    if (!val) { setStatus("idle"); return; }
    setStatus("checking");
    const sb = createClient();
    const { data } = await sb
      .from("registros_diarios")
      .select("id")
      .eq("fecha", val)
      .maybeSingle();
    setStatus(data ? "exists" : "idle");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "exists") return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await guardarRegistroDiario(fd);
        setStatus("ok");
        setMsg("Registro guardado correctamente.");
        formRef.current?.reset();
        setFecha(today());
      } catch (err: unknown) {
        setStatus("error");
        setMsg(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  // Agrupar campos extra por grupo
  const gruposExtra = camposExtra.reduce<Record<string, CampoConfig[]>>((acc, c) => {
    const g = c.grupo || "Otros";
    if (!acc[g]) acc[g] = [];
    acc[g].push(c);
    return acc;
  }, {});

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Selector de fecha */}
      <Card title="Fecha del registro">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-52">
            <Input
              label="Fecha"
              name="fecha"
              type="date"
              value={fecha}
              onChange={(e) => checkFecha(e.target.value)}
              required
            />
          </div>
          {status === "checking" && (
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <CalendarDays size={15} className="animate-pulse" /> Verificando…
            </p>
          )}
          {status === "exists" && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              <AlertTriangle size={15} className="shrink-0" />
              Ya existe un registro para esta fecha. Editalo desde la pestaña Grilla.
            </div>
          )}
        </div>
      </Card>

      {/* ── Finanzas ── */}
      <Card title="Finanzas del día">
        <Section title="Importes">
          <NumInput label="Dinero recaudado ($)" name="dinero_recaudado" />
          <NumInput label="Empleados pagados ($)" name="empleados_pagados" />
          <NumInput label="Gastos vehículos ($)" name="gastos_vehiculos" />
          <NumInput label="Gastos extras ($)" name="gastos_extras" />
        </Section>
      </Card>

      {/* ── Ventas GAS ── */}
      <Card title="Ventas GAS (cantidades)">
        <Section title="Tipo de garrafa">
          <NumInput label="GAS x10C" name="ventas_10c" int />
          <NumInput label="GAS x10B" name="ventas_10b" int />
          <NumInput label="GAS x15C" name="ventas_15c" int />
          <NumInput label="GAS x15B" name="ventas_15b" int />
          <NumInput label="GAS x45C" name="ventas_45c" int />
          <NumInput label="GAS x45B" name="ventas_45b" int />
        </Section>
      </Card>

      {/* ── Compras por proveedor ── */}
      <Card title="Compras por proveedor">
        <div className="space-y-6">
          {[
            { key: "ypf",    label: "YPF" },
            { key: "acosta", label: "Acosta" },
            { key: "viajes", label: "Viajes" },
            { key: "gustavo",label: "Gustavo" },
          ].map(({ key, label }) => (
            <div key={key}>
              <p className="mb-2 text-sm font-semibold text-ink">{label}</p>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                <NumInput label="Pago ($)" name={`compra_${key}_pago`} />
                <NumInput label="x10" name={`compra_${key}_x10`} int />
                <NumInput label="x15" name={`compra_${key}_x15`} int />
                <NumInput label="x45" name={`compra_${key}_x45`} int />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Campos extra (dinámicos) ── */}
      {Object.entries(gruposExtra).map(([grupo, fields]) => (
        <Card key={grupo} title={grupo}>
          <Section title={grupo}>
            {fields.map((campo) => (
              <NumInput
                key={campo.clave}
                label={campo.etiqueta}
                name={campo.clave}
                int={campo.tipo === "integer"}
                isExtra
              />
            ))}
          </Section>
        </Card>
      ))}

      {/* Notas */}
      <Card title="Notas del día">
        <textarea
          name="notas"
          rows={3}
          placeholder="Observaciones opcionales…"
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </Card>

      {/* Feedback */}
      {status === "ok" && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          <CheckCircle2 size={16} /> {msg}
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertTriangle size={16} /> {msg}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isPending || status === "exists"}
          className="min-w-40"
        >
          {isPending ? "Guardando…" : "Guardar registro del día"}
        </Button>
      </div>
    </form>
  );
}
