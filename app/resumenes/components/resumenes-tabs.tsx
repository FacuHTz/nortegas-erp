"use client";

import { useState } from "react";
import { TabCarga } from "./tab-carga";
import { TabResumen } from "./tab-resumen";
import { TabGrilla } from "./tab-grilla";
import { TabConfig } from "./tab-config";
import type { ResumenConfigRow, CampoConfig } from "@/lib/actions/resumenes";

const TABS = [
  { id: "carga",   label: "Carga diaria" },
  { id: "resumen", label: "Resumen mensual" },
  { id: "grilla",  label: "Grilla (edición)" },
  { id: "config",  label: "Configuración" },
] as const;

type TabId = typeof TABS[number]["id"];

export function ResumenesTabs({
  initialConfig,
  initialCampos,
  initialCamposTodos,
}: {
  initialConfig: ResumenConfigRow[];
  initialCampos: CampoConfig[];        // solo activos → para carga/grilla/resumen
  initialCamposTodos: CampoConfig[];   // todos → para configuración
}) {
  const [active, setActive] = useState<TabId>("carga");

  // Campos extra activos (los no-base activos para carga y grilla)
  const camposExtraActivos = initialCampos.filter((c) => !c.es_base);

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1 shadow-sm">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition min-w-max ${
              active === id
                ? "bg-brand text-white shadow-sm"
                : "text-muted hover:bg-paper hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {active === "carga"   && <TabCarga camposExtra={camposExtraActivos} />}
      {active === "resumen" && <TabResumen initialConfig={initialConfig} />}
      {active === "grilla"  && <TabGrilla camposExtra={camposExtraActivos} />}
      {active === "config"  && (
        <TabConfig
          initialConfig={initialConfig}
          initialCampos={initialCamposTodos}
        />
      )}
    </div>
  );
}
