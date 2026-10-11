import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Clientes de Supabase con la clave SECRETA. Solo se usan en el servidor
 * (rutas /api). Ignoran RLS, así que nunca deben importarse desde un componente.
 *
 * Variables de entorno (web/.env.local y Vercel):
 *   SUPABASE_SECRET_KEY   → "sb_secret_…" (o la antigua service_role)
 *   IP_HASH_SALT          → recomendado; si falta se usa la clave secreta
 *
 * OJO con la Data Cache de Next 14: todo fetch sin opciones de caché se guarda
 * (hasta un año) aunque la ruta sea `force-dynamic`. Por eso cada cliente fija
 * su política de caché explícitamente.
 */
export function clavesServidor(): { secret: string; salt: string } | null {
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!secret || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  return { secret, salt: process.env.IP_HASH_SALT || secret };
}

/** Escrituras y conteos de límites: siempre directo a la base, nunca cacheado. */
const fetchSinCache: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });

/** Segundos que una lectura pública puede reutilizarse en la Data Cache de Next. */
export const LECTURA_REVALIDATE_S = 60;

/**
 * Lecturas públicas (/api/datos): se guardan como máximo LECTURA_REVALIDATE_S.
 * Así varias solicitudes (o intentos de saltarse la CDN con ?query) comparten
 * una sola consulta a Supabase por minuto, y la moderación se refleja en ≤60 s.
 * El encabezado extra cambia la clave de caché para no reutilizar entradas
 * guardadas por versiones anteriores sin límite de tiempo.
 */
const fetchLectura: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  headers.set("x-mapa-lectura", "v2");
  return fetch(input, { ...init, headers, next: { revalidate: LECTURA_REVALIDATE_S } });
};

function crear(fetchImpl: typeof fetch): SupabaseClient | null {
  const claves = clavesServidor();
  if (!claves) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, claves.secret, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchImpl },
  });
}

let cliente: SupabaseClient | null = null;
let clienteLectura: SupabaseClient | null = null;

/** Cliente para escrituras y conteos (sin caché). */
export function supabaseServidor(): SupabaseClient | null {
  if (!cliente) cliente = crear(fetchSinCache);
  return cliente;
}

/** Cliente para lecturas públicas (caché acotada a LECTURA_REVALIDATE_S). */
export function supabaseLectura(): SupabaseClient | null {
  if (!clienteLectura) clienteLectura = crear(fetchLectura);
  return clienteLectura;
}
