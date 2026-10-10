import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase con la clave SECRETA. Solo se usa en el servidor
 * (rutas /api). Ignora RLS, así que nunca debe importarse desde un componente.
 *
 * Variables de entorno (web/.env.local y Vercel):
 *   SUPABASE_SECRET_KEY   → "sb_secret_…" (o la antigua service_role)
 *   IP_HASH_SALT          → opcional; si falta se usa la clave secreta
 */
export function clavesServidor(): { secret: string; salt: string } | null {
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!secret || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  return { secret, salt: process.env.IP_HASH_SALT || secret };
}

let cliente: SupabaseClient | null = null;

export function supabaseServidor(): SupabaseClient | null {
  const claves = clavesServidor();
  if (!claves) return null;
  if (!cliente) {
    cliente = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, claves.secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cliente;
}
