import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "crypto";
import { supabaseServidor, clavesServidor } from "@/lib/supabase-server";
import {
  TODAS_CATEGORIAS,
  normalizarKey,
  normalizarMunicipio,
  type CategoriaAgua,
  type Reporte,
} from "@/lib/tipos";
import catalogo from "@/data/colonias_zmg_nombres.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/reportes — único punto de entrada de reportes ciudadanos.
 *
 * Límites por red (IP). La IP nunca se guarda en claro, solo un hash con sal:
 *  - 1 reporte por colonia cada VENTANA_COLONIA_DIAS desde la misma red.
 *  - Máximo MAX_POR_DIA reportes en 24 h desde la misma red (en total).
 *
 * Por qué no "1 reporte por IP para siempre": las redes móviles en México
 * (CGNAT) comparten una IP pública entre cientos de personas; un bloqueo total
 * dejaría fuera a gente real. Las IPv6 se agrupan por su prefijo /64, porque un
 * mismo hogar puede rotar el resto de la dirección.
 */
const VENTANA_COLONIA_DIAS = 30;
const MAX_POR_DIA = 3;
const MAX_DESCRIPCION = 1000;

/**
 * Freno global: si en los últimos VENTANA_GLOBAL_MIN minutos llegaron más de
 * UMBRAL_GLOBAL envíos (de todas las redes juntas), los nuevos se guardan como
 * "pendiente" y no se publican. Protege contra ataques distribuidos (muchas IPs)
 * que el límite por red no detiene. Para publicarlos después:
 *   update reportes set estado_moderacion = 'aprobado' where id in (...);
 */
const VENTANA_GLOBAL_MIN = 10;
const UMBRAL_GLOBAL = 150;

type ItemCatalogo = { nombre: string; municipio: string };
const CATALOGO = new Map<string, ItemCatalogo>(
  (catalogo as ItemCatalogo[]).map((c) => [normalizarKey(c.nombre, c.municipio), c])
);

function responder(status: number, mensaje: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: status < 300, mensaje, ...extra }, { status });
}

function obtenerIp(req: NextRequest): string | null {
  // En Vercel, x-forwarded-for lo pone la plataforma (sobrescribe el del cliente).
  const xff = req.headers.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim() || req.ip || "";
  if (ip) return ip;
  return process.env.NODE_ENV === "production" ? null : "127.0.0.1";
}

/** IPv4 tal cual; IPv6 recortada a su prefijo /64. */
function agruparIp(ip: string): string {
  const limpia = ip.replace(/^::ffff:/, "");
  if (!limpia.includes(":")) return limpia;
  const [cabeza, cola = ""] = limpia.split("::");
  const a = cabeza ? cabeza.split(":") : [];
  const b = cola ? cola.split(":") : [];
  const ceros = Array(Math.max(0, 8 - a.length - b.length)).fill("0");
  const grupos = [...a, ...ceros, ...b].map((g) => (g || "0").toLowerCase());
  return grupos.slice(0, 4).join(":") + "::/64";
}

function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${agruparIp(ip)}`).digest("hex");
}

/**
 * Cloudflare Turnstile (opcional). Solo se exige si existe TURNSTILE_SECRET_KEY.
 * Devuelve null si el token es válido, o el motivo del rechazo.
 */
async function verificarTurnstile(token: string, ip: string, secret: string): Promise<string | null> {
  if (!token) return "Completa la verificación anti-bots antes de enviar.";
  try {
    const form = new URLSearchParams({ secret, response: token, remoteip: ip });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(5000),
    });
    const json = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (json.success) return null;
    console.warn("[api/reportes] Turnstile rechazó el token:", json["error-codes"]);
    return "No pudimos verificar que eres una persona. Recarga la página e intenta de nuevo.";
  } catch (e) {
    console.error("[api/reportes] Error verificando Turnstile:", e);
    return "No pudimos verificar tu envío en este momento. Intenta en unos minutos.";
  }
}

function hoyEnGuadalajara(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
}

function limpiarTexto(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, max);
}

export async function POST(req: NextRequest) {
  const db = supabaseServidor();
  const claves = clavesServidor();
  if (!db || !claves) {
    console.error("[api/reportes] Falta SUPABASE_SECRET_KEY o NEXT_PUBLIC_SUPABASE_URL");
    return responder(503, "Los reportes están deshabilitados temporalmente. Intenta más tarde.");
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return responder(400, "Solicitud inválida.");
  }

  // ── Validación ───────────────────────────────────────────────────────
  const coloniaTexto = limpiarTexto(body.colonia, 120);
  const municipio = normalizarMunicipio(limpiarTexto(body.municipio, 40));
  const categorias = Array.isArray(body.categorias)
    ? Array.from(new Set(body.categorias.filter((c): c is CategoriaAgua =>
        TODAS_CATEGORIAS.includes(c as CategoriaAgua))))
    : [];
  const descripcion = limpiarTexto(body.descripcion, MAX_DESCRIPCION);

  if (coloniaTexto.length < 2) return responder(400, "Escribe el nombre de la colonia.");
  if (!municipio) return responder(400, "Selecciona un municipio de la ZMG.");
  if (categorias.length === 0) return responder(400, "Selecciona al menos un tipo de problema.");

  const coloniaKey = normalizarKey(coloniaTexto, municipio);
  const enCatalogo = CATALOGO.get(coloniaKey);
  // Colonias fuera del catálogo se guardan pero no se publican (no tienen polígono).
  const colonia = enCatalogo?.nombre ?? coloniaTexto;
  let estado: "aprobado" | "pendiente" = enCatalogo ? "aprobado" : "pendiente";

  const ip = obtenerIp(req);
  if (!ip) return responder(400, "No se pudo identificar tu conexión.");

  // ── Verificación anti-bots (solo si está configurada) ───────────────
  const secretoTurnstile = process.env.TURNSTILE_SECRET_KEY;
  if (secretoTurnstile) {
    const motivo = await verificarTurnstile(limpiarTexto(body.turnstile, 4096), ip, secretoTurnstile);
    if (motivo) return responder(403, motivo);
  }

  // ── Límite por red ───────────────────────────────────────────────────
  const ipHash = hashIp(ip, claves.salt);

  const ahora = Date.now();
  const hace24h = new Date(ahora - 86_400_000).toISOString();
  const haceVentana = new Date(ahora - VENTANA_COLONIA_DIAS * 86_400_000).toISOString();
  const haceGlobal = new Date(ahora - VENTANA_GLOBAL_MIN * 60_000).toISOString();

  // Primero se RESERVA el envío y luego se cuenta (incluyéndolo). Así, si un
  // script manda muchas solicitudes en paralelo, todas ven las reservas de las
  // demás y se rechazan, en vez de colarse antes de que se registre ninguna.
  const { data: reserva, error: errReserva } = await db
    .from("reportes_envios")
    .insert({ ip_hash: ipHash, colonia_key: coloniaKey })
    .select("id")
    .single();
  if (errReserva || !reserva) {
    console.error("[api/reportes] Error registrando envío:", errReserva);
    return responder(503, "No pudimos registrar tu reporte en este momento. Intenta más tarde.");
  }
  const liberar = () => db.from("reportes_envios").delete().eq("id", reserva.id);

  const [dia, mismaColonia, global] = await Promise.all([
    db.from("reportes_envios").select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash).gte("created_at", hace24h),
    db.from("reportes_envios").select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash).eq("colonia_key", coloniaKey).gte("created_at", haceVentana),
    db.from("reportes_envios").select("id", { count: "exact", head: true })
      .gte("created_at", haceGlobal),
  ]);
  if (dia.error || mismaColonia.error) {
    console.error("[api/reportes] Error consultando límites:", dia.error ?? mismaColonia.error);
    await liberar();
    return responder(503, "No pudimos registrar tu reporte en este momento. Intenta más tarde.");
  }
  if ((mismaColonia.count ?? 0) > 1) {
    await liberar();
    return responder(429, `Ya se registró un reporte de ${colonia} desde tu red en los últimos ${VENTANA_COLONIA_DIAS} días.`);
  }
  if ((dia.count ?? 0) > MAX_POR_DIA) {
    await liberar();
    return responder(429, `Desde tu red ya se enviaron ${MAX_POR_DIA} reportes hoy. Intenta mañana.`);
  }

  // Freno global: ante una avalancha, se guarda pero no se publica.
  const frenado = estado === "aprobado" && !global.error && (global.count ?? 0) > UMBRAL_GLOBAL;
  if (frenado) {
    estado = "pendiente";
    console.warn(`[api/reportes] Freno global activo: ${global.count} envíos en ${VENTANA_GLOBAL_MIN} min`);
  }

  // ── Inserción ────────────────────────────────────────────────────────
  const hoy = hoyEnGuadalajara();
  const { data: fila, error: errInsert } = await db
    .from("reportes")
    .insert({
      colonia,
      municipio,
      categorias,
      fuente_tipo: "ciudadano_sin_verificar",
      fuente_nombre: "Reporte ciudadano",
      descripcion,
      fecha_reporte: hoy,
      fecha_carga: hoy,
      estado_moderacion: estado,
    })
    .select("id,colonia,municipio,categorias,fuente_tipo,fuente_nombre,fuente_url,descripcion,fecha_reporte,fecha_carga,estado_moderacion,created_at")
    .single();

  if (errInsert || !fila) {
    console.error("[api/reportes] Error insertando reporte:", errInsert);
    await liberar();
    return responder(500, "No pudimos guardar tu reporte. Intenta más tarde.");
  }

  await db.from("reportes_envios").update({ reporte_id: fila.id }).eq("id", reserva.id);

  const reporte: Reporte = { ...fila, id: String(fila.id) } as Reporte;
  const publicado = estado === "aprobado";
  const mensaje = publicado
    ? "Tu reporte ya aparece en el mapa. Gracias."
    : frenado
      ? "Recibimos tu reporte. En este momento llegan demasiados reportes a la vez, así que por seguridad quedó guardado pero no aparecerá en el mapa hasta que se revise."
      : "Recibimos tu reporte. Como tu colonia no está en el catálogo oficial, se guardará pero no aparecerá en el mapa por ahora.";
  return responder(201, mensaje, { publicado, reporte });
}
