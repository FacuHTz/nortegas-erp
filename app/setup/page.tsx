import { Flame } from "lucide-react";

const pasos = [
  ["Creá un proyecto en Supabase", "supabase.com → New project. Anotá la URL y la anon key (Settings → API)."],
  ["Ejecutá el esquema", "Abrí el SQL Editor de Supabase y pegá el contenido de supabase/schema.sql. Después ejecutá supabase/seed.sql."],
  ["Configurá las variables de entorno", "En v0 o Vercel: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY. Localmente, copialas a .env.local."],
  ["Creá tu usuario", "Supabase → Authentication → Add user (email + contraseña). El primer usuario queda como admin automáticamente."],
  ["Volvé a desplegar y entrá", "Con las variables cargadas, la app te lleva al login."],
];

export default function SetupPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand text-white"><Flame size={26} /></span>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Falta conectar Supabase</h1>
          <p className="text-sm text-muted">La app está desplegada pero todavía no tiene base de datos configurada.</p>
        </div>
      </div>
      <ol className="space-y-4">
        {pasos.map(([t, d], i) => (
          <li key={t} className="flex gap-4 rounded-xl border border-line bg-white p-4 shadow-sm">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink font-display text-sm font-bold text-white">{i + 1}</span>
            <div>
              <p className="font-medium text-ink">{t}</p>
              <p className="mt-0.5 text-sm text-muted">{d}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
