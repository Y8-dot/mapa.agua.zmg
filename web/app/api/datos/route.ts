import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase-server";
import type { CategoriaAgua, FuenteTipo, Reporte } from "@/lib/tipos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/datos — reportes aprobados para el mapa.
 *
 * El navegador ya no consulta Supabase directamente: esta ruta lee con la clave
 * secreta y la respuesta se guarda en la CDN de Vercel 60 s (y se sirve "vieja"
 * hasta 5 min mientras se renueva). Así, miles de visitas o un bot recargando
 * la página generan como mucho ~1 consulta a Supabase por minuto, en lugar de
 * una por visita.
 */
const COLUMNAS =
  "id,colonia,municipio,categorias,fuente_tipo,fuente_nombre,fuente_url,descripcion,fecha_reporte,fecha_carga,nivel_confianza,created_at";
const PAGINA = 1000;
const MAX_FILAS = 50_000; // tope de seguridad

const CACHE_OK = "public, s-maxage=60, stale-while-revalidate=300";

export async function GET() {
  const db = supabaseServidor();
  if (!db) {
    console.error("[api/datos] Falta SUPABASE_SECRET_KEY o NEXT_PUBLIC_SUPABASE_URL");
    return NextResponse.json(
      { ok: false, mensaje: "Datos no disponibles por el momento.", reportes: [] },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const reportes: Reporte[] = [];
  for (let desde = 0; desde < MAX_FILAS; desde += PAGINA) {
    const { data, error } = await db
      .from("reportes")
      .select(COLUMNAS)
      .eq("estado_moderacion", "aprobado")
      .order("id", { ascending: true })
      .range(desde, desde + PAGINA - 1);

    if (error) {
      console.error("[api/datos] Error leyendo reportes:", error.message);
      return NextResponse.json(
        { ok: false, mensaje: "No pudimos cargar los reportes.", reportes: [] },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (!data || data.length === 0) break;

    for (const r of data as Record<string, unknown>[]) {
      reportes.push({
        id: String(r.id),
        colonia: r.colonia as string,
        municipio: r.municipio as Reporte["municipio"],
        categorias: (r.categorias as CategoriaAgua[]) || [],
        fuente_tipo: r.fuente_tipo as FuenteTipo,
        fuente_nombre: r.fuente_nombre as string,
        fuente_url: (r.fuente_url as string) || undefined,
        descripcion: (r.descripcion as string) || "",
        fecha_reporte: r.fecha_reporte as string,
        fecha_carga: (r.fecha_carga as string) || "",
        nivel_confianza: (r.nivel_confianza as Reporte["nivel_confianza"]) || undefined,
        created_at: (r.created_at as string) || undefined,
        estado_moderacion: "aprobado",
      });
    }
    if (data.length < PAGINA) break;
  }

  return NextResponse.json(
    { ok: true, generado: new Date().toISOString(), reportes },
    { headers: { "Cache-Control": CACHE_OK } }
  );
}
