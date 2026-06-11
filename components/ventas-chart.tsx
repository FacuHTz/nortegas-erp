"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function VentasChart({ data }: { data: { dia: string; total: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E8590C" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#E8590C" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#6B7A85" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#6B7A85" }} tickLine={false} axisLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} width={44} />
          <Tooltip
            formatter={(v: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(v)}
            labelStyle={{ color: "#1B2A33", fontWeight: 600 }}
            contentStyle={{ borderRadius: 12, border: "1px solid #E5E1D8", fontSize: 13 }}
          />
          <Area type="monotone" dataKey="total" stroke="#E8590C" strokeWidth={2.5} fill="url(#flame)" name="Ventas" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
