"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Card } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email o contraseña incorrectos. Verificá los datos o creá el usuario en Supabase → Authentication.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand text-white"><Flame size={26} /></span>
          <div>
            <p className="font-display text-2xl font-bold text-white">NorteGAS</p>
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Sistema de gestión</p>
          </div>
        </div>
        <Card>
          <form onSubmit={entrar} className="space-y-4">
            <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vos@nortegas.com" />
            <Input label="Contraseña" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">{loading ? "Entrando…" : "Entrar"}</Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-xs text-slate-400">Acceso exclusivo del equipo de NorteGAS.</p>
      </div>
    </div>
  );
}
