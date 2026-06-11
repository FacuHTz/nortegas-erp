import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", weight: ["500", "600", "700", "800"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "NorteGAS · Gestión",
  description: "ERP interno de NorteGAS — distribución de gas envasado",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let userName: string | null = null;
  const hasEnv = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (hasEnv) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase.from("perfiles").select("nombre, rol").eq("id", user.id).single();
        userName = perfil ? `${perfil.nombre} · ${perfil.rol}` : (user.email ?? "Usuario");
      }
    } catch {}
  }

  return (
    <html lang="es" className={`${archivo.variable} ${inter.variable}`}>
      <body>
        {userName ? <AppShell userName={userName}>{children}</AppShell> : children}
      </body>
    </html>
  );
}
