"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { FilterBar, type FiltrosActivos } from "./FilterBar";
import { ColoniaDetail, type NivelColonia } from "./ColoniaDetail";
import { ReportForm, type ResultadoEnvio, type DatosReporte } from "./ReportForm";
import { LegalDisclaimer } from "./LegalDisclaimer";
import { MapLegend } from "./MapLegend";
import { CoprisjalPanel } from "./CoprisjalPanel";
import { Attribution } from "./Attribution";
import { SearchBar } from "./SearchBar";
import { TopColonias, type ItemTop } from "./TopColonias";
import { Button } from "./ui/button";
import { Plus, Minus } from "lucide-react";
import { normalizarKey, type Reporte, type CategoriaAgua, type FuenteTipo } from "@/lib/tipos";
import {
  calcularCortes,
  claseDePuntaje,
  puntajeColonia,
  rangosPorClase,
  ETIQUETAS_CLASE,
  OPACIDAD_SEVERIDAD,
  RAMPA_SEVERIDAD,
} from "@/lib/severidad";
import { supabase } from "@/lib/supabase";

import poligonosReales from "@/data/colonias_zmg_poligonos.json";

const POLIGONOS = poligonosReales as GeoJSON.FeatureCollection;

const COLUMNAS =
  "id,colonia,municipio,categorias,fuente_tipo,fuente_nombre,fuente_url,descripcion,fecha_reporte,fecha_carga,nivel_confianza,created_at";

// ─── Cargar reportes aprobados desde Supabase ────────────────────────────
async function fetchReportes(): Promise<Reporte[]> {
  // PostgREST limita a 1000 filas por request: paginar.
  const PAGE_SIZE = 1000;
  const remotos: Reporte[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("reportes")
      .select(COLUMNAS)
      .eq("estado_moderacion", "aprobado")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("[mapa] Error cargando reportes:", error.message);
      break;
    }
    if (!data || data.length === 0) break;

    for (const r of data as Record<string, unknown>[]) {
      remotos.push({
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
        nivel_confianza: r.nivel_confianza as Reporte["nivel_confianza"],
        created_at: r.created_at as string | undefined,
        estado_moderacion: "aprobado",
      });
    }
    if (data.length < PAGE_SIZE) break;
  }
  return remotos;
}

function esEscritorio(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
}

const ZMG_CENTER: [number, number] = [-103.35, 20.67];
const ZMG_ZOOM = 11;
const STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

interface GrupoColonia {
  reportes: Reporte[];
  count: number;
  categorias: Set<CategoriaAgua>;
  puntaje: number;
  clase: number;
}

function agruparReportes(reportes: Reporte[]): globalThis.Map<string, GrupoColonia> {
  const grupos = new globalThis.Map<string, GrupoColonia>();
  for (const r of reportes) {
    const key = normalizarKey(r.colonia, r.municipio);
    const g = grupos.get(key);
    if (g) {
      g.reportes.push(r);
      g.count++;
      r.categorias.forEach((c) => g.categorias.add(c));
    } else {
      grupos.set(key, { reportes: [r], count: 1, categorias: new Set(r.categorias), puntaje: 0, clase: -1 });
    }
  }
  return grupos;
}

/** Expresión MapLibre: valor según la clase (−1 = sin reportes). */
function porClase(valores: readonly (string | number)[], defecto: string | number): maplibregl.ExpressionSpecification {
  const expr: unknown[] = ["match", ["get", "clase"]];
  valores.forEach((v, i) => expr.push(i, v));
  expr.push(defecto);
  return expr as maplibregl.ExpressionSpecification;
}

function centroDeGeometria(g: GeoJSON.Geometry): [number, number] | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const visitar = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      const [x, y] = c as number[];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    } else if (Array.isArray(c)) c.forEach(visitar);
  };
  if ("coordinates" in g) visitar(g.coordinates);
  return Number.isFinite(minX) ? [(minX + maxX) / 2, (minY + maxY) / 2] : null;
}

type ColoniaSeleccionada = {
  nombre: string;
  municipio: string;
  reportes: Reporte[];
  categorias: CategoriaAgua[];
  nivel?: NivelColonia;
};

export function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [coloniaSel, setColoniaSel] = useState<ColoniaSeleccionada | null>(null);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [formAbierto, setFormAbierto] = useState(false);
  const [coloniaParaReporte, setColoniaParaReporte] = useState("");
  const [filtros, setFiltros] = useState<FiltrosActivos>({ categorias: [], fuentes: [] });
  // Paneles superiores. En escritorio el Top 5 arranca abierto; en celular ambos cerrados
  // y abrir uno cierra el otro (comparten la misma franja de pantalla).
  const [filtrosAbierto, setFiltrosAbierto] = useState(false);
  const [top5Abierto, setTop5Abierto] = useState(esEscritorio);
  const toggleFiltros = useCallback(() => {
    const abrir = !filtrosAbierto;
    setFiltrosAbierto(abrir);
    if (abrir && !esEscritorio()) setTop5Abierto(false);
  }, [filtrosAbierto]);
  const toggleTop5 = useCallback(() => {
    const abrir = !top5Abierto;
    setTop5Abierto(abrir);
    if (abrir && !esEscritorio()) setFiltrosAbierto(false);
  }, [top5Abierto]);

  useEffect(() => {
    fetchReportes().then(setReportes);
  }, []);

  const reportesFiltrados = useMemo(() => {
    return reportes.filter((r) => {
      if (filtros.categorias.length > 0 && !r.categorias.some((c) => filtros.categorias.includes(c))) return false;
      if (filtros.fuentes.length > 0 && !filtros.fuentes.includes(r.fuente_tipo)) return false;
      return true;
    });
  }, [reportes, filtros]);

  // Agrupar por colonia, calcular puntaje ponderado y clase (cortes naturales).
  const { coloniasAgrupadas, rangos } = useMemo(() => {
    const grupos = agruparReportes(reportesFiltrados);
    const ahora = Date.now();
    const puntajes: number[] = [];
    grupos.forEach((g) => {
      g.puntaje = puntajeColonia(g.reportes, ahora);
      puntajes.push(g.puntaje);
    });
    const cortes = calcularCortes(puntajes);
    grupos.forEach((g) => {
      g.clase = claseDePuntaje(g.puntaje, cortes);
    });
    return { coloniasAgrupadas: grupos, rangos: rangosPorClase(puntajes, cortes) };
  }, [reportesFiltrados]);

  const nivelDe = useCallback((g: GrupoColonia): NivelColonia | undefined => {
    if (g.clase < 0) return undefined;
    return { etiqueta: ETIQUETAS_CLASE[g.clase], color: RAMPA_SEVERIDAD[g.clase], puntaje: g.puntaje };
  }, []);

  // Refs para evitar closures obsoletos en los handlers del mapa
  const agrupadasRef = useRef(coloniasAgrupadas);
  agrupadasRef.current = coloniasAgrupadas;
  const nivelDeRef = useRef(nivelDe);
  nivelDeRef.current = nivelDe;

  // ─── Init mapa ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: STYLE_URL,
      center: ZMG_CENTER,
      zoom: ZMG_ZOOM,
      attributionControl: false,
    });
    map.on("load", () => {
      map.addSource("colonias-reales", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      const conReportes: maplibregl.FilterSpecification = [">=", ["get", "clase"], 0];

      map.addLayer({
        id: "colonias-fill",
        type: "fill",
        source: "colonias-reales",
        filter: conReportes,
        paint: {
          "fill-color": porClase(RAMPA_SEVERIDAD, RAMPA_SEVERIDAD[0]),
          "fill-opacity": porClase(OPACIDAD_SEVERIDAD, 0.2),
        },
      });

      map.addLayer({
        id: "colonias-line",
        type: "line",
        source: "colonias-reales",
        filter: conReportes,
        paint: {
          "line-color": porClase(RAMPA_SEVERIDAD, RAMPA_SEVERIDAD[0]),
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.4, 14, 1.2],
          "line-opacity": 0.7,
        },
      });

      map.addLayer({
        id: "colonias-nombres",
        type: "symbol",
        source: "colonias-reales",
        minzoom: 12,
        filter: conReportes,
        layout: {
          "text-field": ["get", "nombre"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 12, 9, 14, 11, 16, 13],
          "text-font": ["Open Sans Bold"],
          "text-anchor": "center",
          "text-max-width": 10,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(0,0,0,0.9)",
          "text-halo-width": 2.5,
          "text-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0, 12.6, 0.85],
        },
      });

      // Conteo: solo de cerca, para no saturar la vista general con números
      map.addLayer({
        id: "colonias-conteo",
        type: "symbol",
        source: "colonias-reales",
        minzoom: 12,
        filter: conReportes,
        layout: {
          "text-field": ["to-string", ["get", "count"]],
          "text-size": ["interpolate", ["linear"], ["zoom"], 12, 11, 14, 13, 16, 15],
          "text-font": ["Open Sans Bold"],
          "text-offset": [0, -2.2],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(0,0,0,0.85)",
          "text-halo-width": 2.5,
        },
      });

      mapRef.current = map;
      setMapReady(true);
    });

    map.on("click", "colonias-fill", (e) => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const grupo = agrupadasRef.current.get(normalizarKey(p.nombre, p.municipio));
      if (!grupo) return;
      setColoniaSel({
        nombre: p.nombre,
        municipio: p.municipio,
        reportes: grupo.reportes,
        categorias: Array.from(grupo.categorias),
        nivel: nivelDeRef.current(grupo),
      });
      setPanelAbierto(true);
    });

    map.on("mouseenter", "colonias-fill", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "colonias-fill", () => { map.getCanvas().style.cursor = ""; });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ─── Pintar clases y conteos en los polígonos ───────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const source = mapRef.current.getSource("colonias-reales") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData({
      type: "FeatureCollection",
      features: POLIGONOS.features.map((f) => {
        const grupo = coloniasAgrupadas.get(normalizarKey(f.properties?.nombre ?? "", f.properties?.municipio ?? ""));
        return {
          ...f,
          properties: { ...f.properties, count: grupo?.count ?? 0, clase: grupo?.clase ?? -1 },
        };
      }),
    });
  }, [coloniasAgrupadas, mapReady]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleOpenForm = useCallback((colonia?: string) => {
    setColoniaParaReporte(colonia ?? "");
    setFormAbierto(true);
  }, []);

  const handleSubmit = useCallback(async (data: DatosReporte): Promise<ResultadoEnvio> => {
    try {
      const res = await fetch("/api/reportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean; mensaje?: string; publicado?: boolean; reporte?: Reporte;
      };
      if (!res.ok || !json.ok) {
        return { ok: false, mensaje: json.mensaje || "No pudimos enviar tu reporte. Intenta más tarde." };
      }
      if (json.publicado && json.reporte) {
        const nuevo = json.reporte;
        setReportes((prev) => [...prev, nuevo]);
      }
      return { ok: true, mensaje: json.mensaje || "Reporte recibido. Gracias." };
    } catch {
      return { ok: false, mensaje: "Sin conexión. Revisa tu internet e intenta de nuevo." };
    }
  }, []);

  const handleSearchSelect = useCallback((nombre: string, municipio: string) => {
    if (!mapRef.current) return;
    const key = normalizarKey(nombre, municipio);
    const feat = POLIGONOS.features.find(
      (f) => normalizarKey(f.properties?.nombre ?? "", f.properties?.municipio ?? "") === key
    );
    const centro = feat ? centroDeGeometria(feat.geometry) : null;
    if (centro) mapRef.current.flyTo({ center: centro, zoom: 14, duration: 1200 });
    const grupo = coloniasAgrupadas.get(key);
    if (grupo) {
      setColoniaSel({
        nombre, municipio, reportes: grupo.reportes,
        categorias: Array.from(grupo.categorias), nivel: nivelDe(grupo),
      });
      setPanelAbierto(true);
    }
  }, [coloniasAgrupadas, nivelDe]);

  // Top 5 colonias con más reportes (respeta filtros). Solo colonias con polígono,
  // para que al tocarlas el mapa pueda volar a ellas.
  const nombresPoligono = useMemo(() => {
    const m = new globalThis.Map<string, { nombre: string; municipio: string }>();
    for (const f of POLIGONOS.features) {
      const n = f.properties?.nombre;
      const mu = f.properties?.municipio;
      if (n && mu) m.set(normalizarKey(n, mu), { nombre: n, municipio: mu });
    }
    return m;
  }, []);

  const top5 = useMemo<ItemTop[]>(() => {
    const items: (ItemTop & { puntaje: number })[] = [];
    coloniasAgrupadas.forEach((g, key) => {
      const p = nombresPoligono.get(key);
      if (!p || g.clase < 0) return;
      items.push({ ...p, count: g.count, color: RAMPA_SEVERIDAD[g.clase], puntaje: g.puntaje });
    });
    items.sort((a, b) => b.count - a.count || b.puntaje - a.puntaje || a.nombre.localeCompare(b.nombre));
    return items.slice(0, 5).map((c) => ({ nombre: c.nombre, municipio: c.municipio, count: c.count, color: c.color }));
  }, [coloniasAgrupadas, nombresPoligono]);

  const listaColonias = useMemo(() => {
    const seen = new globalThis.Set<string>();
    const res: { nombre: string; municipio: string; count: number }[] = [];
    for (const f of POLIGONOS.features) {
      const n = f.properties?.nombre;
      const m = f.properties?.municipio;
      if (!n || !m) continue;
      const k = normalizarKey(n, m);
      if (seen.has(k)) continue;
      seen.add(k);
      res.push({ nombre: n, municipio: m, count: coloniasAgrupadas.get(k)?.count ?? 0 });
    }
    return res.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [coloniasAgrupadas]);

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <div ref={mapContainer} className="h-full w-full" />

      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col items-center gap-2 md:flex-row md:justify-center md:left-1/2 md:-translate-x-1/2 md:right-auto">
        <div className="w-full md:w-[340px]">
          <SearchBar colonias={listaColonias} onSelect={handleSearchSelect} />
        </div>
      </div>

      <FilterBar filtros={filtros} onChange={setFiltros} expandido={filtrosAbierto} onToggle={toggleFiltros} />
      <TopColonias
        items={top5}
        onSelect={handleSearchSelect}
        oculto={panelAbierto}
        filtrado={filtros.categorias.length + filtros.fuentes.length > 0}
        abierto={top5Abierto}
        onToggle={toggleTop5}
      />
      {/* Columna inferior izquierda: COPRISJAL arriba, leyenda abajo (se empujan, no se enciman) */}
      <div className="absolute bottom-14 left-4 z-10 flex flex-col items-start gap-2 md:bottom-9">
        <CoprisjalPanel />
        <MapLegend rangos={rangos} />
      </div>

      {/* ── Zoom + Reportar (stacked bottom-right) ── */}
      <div className="absolute bottom-14 right-4 z-10 flex flex-col items-end gap-2 md:bottom-8 md:right-4">
        <div className="flex flex-col rounded-lg border bg-card/95 backdrop-blur shadow-lg overflow-hidden">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="p-2 hover:bg-accent transition-colors"
            aria-label="Acercar"
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="border-t border-border" />
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="p-2 hover:bg-accent transition-colors"
            aria-label="Alejar"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
        <Button size="lg" onClick={() => handleOpenForm()} className="shadow-lg shadow-primary/25 gap-2">
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Reportar un problema</span>
          <span className="sm:hidden">Reportar</span>
        </Button>
      </div>

      <ColoniaDetail
        open={panelAbierto}
        onClose={() => setPanelAbierto(false)}
        colonia={coloniaSel}
        onReportar={(n) => { setPanelAbierto(false); handleOpenForm(n); }}
      />
      <ReportForm open={formAbierto} onClose={() => setFormAbierto(false)} onSubmit={handleSubmit} coloniaInicial={coloniaParaReporte} />
      <LegalDisclaimer />
      <Attribution />
    </div>
  );
}
