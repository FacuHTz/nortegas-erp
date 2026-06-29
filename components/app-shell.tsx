"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Flame, LayoutDashboard, ShoppingCart, Users, Package, Boxes, Truck,
  ShoppingBag, FileText, Wallet, Percent, UserCog, Settings, LogOut, Menu, X,
  BarChart3,
} from "lucide-react";

const MODULOS = [
  { href: "/", label: "Tablero", icon: LayoutDashboard },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/inventario", label: "Inventario", icon: Boxes },
  { href: "/reparto", label: "Reparto", icon: Truck },
  { href: "/compras", label: "Compras", icon: ShoppingBag },
  { href: "/facturacion", label: "Facturación", icon: FileText },
  { href: "/tesoreria", label: "Tesorería", icon: Wallet },
  { href: "/resumenes", label: "Resúmenes", icon: BarChart3 },
  { href: "/impuestos", label: "Impuestos", icon: Percent },
  { href: "/empleados", label: "Equipo", icon: UserCog },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

export function AppShell({ children, userName }: { children: React.ReactNode; userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function salir() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
      {MODULOS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon size={17} strokeWidth={active ? 2.4 : 2} className={active ? "text-brand-light" : ""} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-56 flex-col bg-ink lg:flex">
        <div className="flex items-center gap-2.5 px-4 py-5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white"><Flame size={20} /></span>
          <div className="leading-tight">
            <p className="font-display text-base font-bold text-white">NorteGAS</p>
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">Gestión</p>
          </div>
        </div>
        {nav}
        <div className="border-t border-white/10 p-3">
          <p className="truncate px-3 pb-2 text-xs text-slate-400">{userName}</p>
          <button onClick={salir} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Sidebar mobile */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-ink">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white"><Flame size={18} /></span>
                <p className="font-display font-bold text-white">NorteGAS</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10"><X size={18} /></button>
            </div>
            {nav}
            <div className="border-t border-white/10 p-3">
              <button onClick={salir} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
                <LogOut size={16} /> Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-ink hover:bg-gray-100"><Menu size={20} /></button>
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-white"><Flame size={15} /></span>
          <span className="font-display font-bold text-ink">NorteGAS</span>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
