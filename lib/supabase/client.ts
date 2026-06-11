import { createBrowserClient } from "@supabase/ssr";

// Si faltan las env vars (build sin configurar), usa placeholders para no
// romper el prerender. El middleware redirige a /setup hasta configurarlas.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key-placeholder",
    { db: { schema: "erp" } }
  );
}
