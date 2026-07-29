"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { FilterBar, type FiltrosActivos } from "./FilterBar";
import { ColoniaDetail } from "./ColoniaDetail";
import { ReportForm } from "./ReportForm";
import { LegalDisclaimer } from "./LegalDisclaimer";
import { MapLegend } from "./MapLegend";
import { CoprisjalPanel } from "./CoprisjalPanel";
import { Attribution } from "./Attribution";
import { SearchBar } from "./SearchBar";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";
import type { Reporte, CategoriaAgua, FuenteTipo } from "@/lib/tipos";
import { supabase } from "@/lib/supabase";

import poligonosReales from "@/data/colonias_zmg_poligonos.json";

// ─── Cargar reportes desde Supabase (con fallback a localStorage) ────────
const STORAGE_KEY = "mapa-agua-zmg-reportes";
const THROTTLE_KEY = "mapa-agua-zmg-throttle";
const THROTTLE_MINUTES = 15;

function checkThrottle(colonia: string): { allowed: boolean; waitMinutes: number } {
  if (typeof window === "undefined") return { allowed: true, waitMinutes: 0 };
  try {
    const data = JSON.parse(localStorage.getItem(THROTTLE_KEY) || "{}");
    const key = colonia.toLowerCase().trim();
    const lastReport = data[key];
    if (lastReport) {
      const elapsed = (Date.now() - lastReport) / 60000;
      if (elapsed < THROTTLE_MINUTES) {
        return { allowed: false, waitMinutes: Math.ceil(THROTTLE_MINUTES - elapsed) };
      }
    }
    return { allowed: true, waitMinutes: 0 };
  } catch { return { allowed: true, waitMinutes: 0 }; }
}

function setThrottle(colonia: string) {
  if (typeof window === "undefined") return;
  try {
    const data = JSON.parse(localStorage.getItem(THROTTLE_KEY) || "{}");
    data[colonia.toLowerCase().trim()] = Date.now();
    localStorage.setItem(THROTTLE_KEY, JSON.stringify(data));
  } catch { /* ok */ }
}

async function fetchReportes(): Promise<Reporte[]> {
  // Intentar Supabase
  try {
    const { data, error } = await supabase
      .from("reportes")
      .select("*")
      .eq("estado_moderacion", "aprobado")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const remotos: Reporte[] = data.map((r: Record<string, unknown>) => ({
        id: String(r.id),
        colonia: r.colonia as string,
        municipio: r.municipio as Reporte["municipio"],
        categorias: (r.categorias as CategoriaAgua[]) || [],
        fuente_tipo: r.fuente_tipo as FuenteTipo,
        fuente_nombre: r.fuente_nombre as string,
        fuente_url: r.fuente_url as string | undefined,
        descripcion: r.descripcion as string,
        fecha_reporte: r.fecha_reporte as string,
        fecha_carga: (r.fecha_carga as string) || "",
        nivel_confianza: r.nivel_confianza as Reporte["nivel_confianza"],
        estado_moderacion: "aprobado",
      }));

      // Tambien cargar locales
      const locales = cargarLocales();
      return [...remotos, ...locales];
    }
  } catch { /* fallback */ }

  return cargarLocales();
}

function cargarLocales(): Reporte[] {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }
  return [];
}

const ZMG_CENTER: [number, number] = [-103.35, 20.67];
const ZMG_ZOOM = 11;
const STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

interface GrupoColonia {
  reportes: Reporte[];
  count: number;
  categorias: Set<CategoriaAgua>;
}

function agruparReportes(reportes: Reporte[]): globalThis.Map<string, GrupoColonia> {
  const grupos = new globalThis.Map<string, GrupoColonia>();
  for (const r of reportes) {
    const key = `${r.colonia}|${r.municipio}`;
    const g = grupos.get(key);
    if (g) {
      g.reportes.push(r);
      g.count++;
      r.categorias.forEach((c) => g.categorias.add(c));
    } else {
      grupos.set(key, { reportes: [r], count: 1, categorias: new Set(r.categorias) });
    }
  }
  return grupos;
}

export function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [coloniaSel, setColoniaSel] = useState<{
    nombre: string; municipio: string; reportes: Reporte[]; categorias: CategoriaAgua[];
  } | null>(null);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [formAbierto, setFormAbierto] = useState(false);
  const [coloniaParaReporte, setColoniaParaReporte] = useState("");
  const [filtros, setFiltros] = useState<FiltrosActivos>({ categorias: [], fuentes: [] });

  // Cargar reportes desde Supabase al montar
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

  const coloniasAgrupadas = useMemo(() => agruparReportes(reportesFiltrados), [reportesFiltrados]);

  // Ref para evitar stale closure en el click handler
  const agrupadasRef = useRef(coloniasAgrupadas);
  agrupadasRef.current = coloniasAgrupadas;

  // ─── Init mapa con polígonos Voronoi ───────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: STYLE_URL,
      center: ZMG_CENTER,
      zoom: ZMG_ZOOM,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl(), "bottom-right");

    map.on("load", () => {
      map.addSource("colonias-reales", {
        type: "geojson",
        data: poligonosReales as GeoJSON.FeatureCollection,
      });

      // Relleno de polígonos (choropleth) — solo colonias con reportes
      map.addLayer({
        id: "colonias-fill",
        type: "fill",
        source: "colonias-reales",
        filter: [">", ["get", "count"], 0],
        paint: {
          "fill-color": [
            "case",
            ["==", ["get", "count"], 1], "#eab308",
            ["==", ["get", "count"], 2], "#f97316",
            [">=", ["get", "count"], 3], "#dc2626",
            "#eab308",
          ],
          "fill-opacity": 0.3,
        },
      });

      // Borde de polígonos — solo colonias con reportes
      map.addLayer({
        id: "colonias-line",
        type: "line",
        source: "colonias-reales",
        filter: [">", ["get", "count"], 0],
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "count"], 1], "rgba(234,179,8,0.45)",
            ["==", ["get", "count"], 2], "rgba(249,115,22,0.45)",
            "rgba(220,38,38,0.50)",
          ],
          "line-width": 1.2,
          "line-opacity": 0.8,
        },
      });

      // Etiquetas de nombre — solo colonias con reportes
      map.addLayer({
        id: "colonias-nombres",
        type: "symbol",
        source: "colonias-reales",
        minzoom: 12,
        filter: [">", ["get", "count"], 0],
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
          "text-opacity": ["interpolate", ["linear"], ["zoom"], 11.5, 0, 12.5, 0.8],
        },
      });

      // Conteo — solo colonias con reportes
      map.addLayer({
        id: "colonias-conteo",
        type: "symbol",
        source: "colonias-reales",
        filter: [">", ["get", "count"], 0],
        layout: {
          "text-field": ["to-string", ["get", "count"]],
          "text-size": ["interpolate", ["linear"], ["zoom"], 11, 11, 14, 15],
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

      // ── Capa de PUNTOS (respaldo para colonias sin poligono) ─────
      // Ya no se necesita: todas las 2053 colonias tienen poligono ahora

      mapRef.current = map;
      setMapReady(true);
    });

    map.on("click", "colonias-fill", (e) => {
      const feats = map.queryRenderedFeatures(e.point, { layers: ["colonias-fill"] });
      if (feats.length === 0) return;
      const p = feats[0].properties;
      if (!p) return;
      const key = `${p.nombre}|${p.municipio}`;
      const grupo = agrupadasRef.current.get(key);
      if (!grupo) return;
      setColoniaSel({ nombre: p.nombre, municipio: p.municipio, reportes: grupo.reportes, categorias: Array.from(grupo.categorias) });
      setPanelAbierto(true);
    });

    map.on("mouseenter", "colonias-fill", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "colonias-fill", () => { map.getCanvas().style.cursor = ""; });

    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Actualizar conteos en polígonos ───────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const sourcePol = mapRef.current.getSource("colonias-reales") as maplibregl.GeoJSONSource;
    if (sourcePol) {
      sourcePol.setData({
        type: "FeatureCollection",
        features: (poligonosReales as GeoJSON.FeatureCollection).features.map((f) => {
          const key = `${f.properties?.nombre}|${f.properties?.municipio}`;
          const grupo = coloniasAgrupadas.get(key);
          return { ...f, properties: { ...f.properties, count: grupo?.count ?? 0 } };
        }),
      });
    }
  }, [coloniasAgrupadas, mapReady]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const [throttleMsg, setThrottleMsg] = useState("");

  const handleOpenForm = useCallback((colonia?: string) => {
    if (colonia) {
      const t = checkThrottle(colonia);
      if (!t.allowed) {
        setThrottleMsg(`Ya reportaste ${colonia}. Espera ${t.waitMinutes} min para volver a reportar esta colonia.`);
        setTimeout(() => setThrottleMsg(""), 4000);
        return;
      }
    }
    setColoniaParaReporte(colonia ?? "");
    setFormAbierto(true);
  }, []);

  const handleSubmit = useCallback(async (data: { colonia: string; municipio: string; categorias: CategoriaAgua[]; descripcion: string }) => {
    // Rate limiting: 1 reporte por colonia cada 15 min
    const throttle = checkThrottle(data.colonia);
    if (!throttle.allowed) {
      return; // bloqueado silenciosamente (el form muestra mensaje)
    }

    const payload = {
      colonia: data.colonia,
      municipio: data.municipio,
      categorias: data.categorias,
      fuente_tipo: "ciudadano_sin_verificar",
      fuente_nombre: "Reporte ciudadano",
      descripcion: data.descripcion,
      fecha_reporte: new Date().toISOString().split("T")[0],
      fecha_carga: new Date().toISOString().split("T")[0],
      estado_moderacion: "aprobado",
    };

    // Guardar en Supabase
    try {
      await supabase.from("reportes").insert(payload);
      setThrottle(data.colonia);
    } catch { /* si falla Supabase, guardar local */ }

    // Tambien guardar en localStorage como respaldo
    const nuevo: Reporte = {
      id: `local-${Date.now()}`,
      ...payload,
      municipio: payload.municipio as Reporte["municipio"],
    } as Reporte;

    setReportes((prev) => {
      const updated = [...prev, nuevo];
      const ciudadanos = updated.filter((r) => r.fuente_tipo === "ciudadano_sin_verificar");
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ciudadanos)); } catch { /* ok */ }
      return updated;
    });

    setFormAbierto(false);
  }, []);

  const handleSearchSelect = useCallback((nombre: string, municipio: string) => {
    if (!mapRef.current) return;
    const key = `${nombre}|${municipio}`;
    const grupo = coloniasAgrupadas.get(key);
    const feats = (poligonosReales as GeoJSON.FeatureCollection).features.filter(
      (f) => f.properties?.nombre === nombre && f.properties?.municipio === municipio
    );
    if (feats.length > 0) {
      const coords = (feats[0].geometry as GeoJSON.Polygon).coordinates[0][0] as [number, number];
      mapRef.current.flyTo({ center: coords, zoom: 14, duration: 1200 });
    }
    if (grupo) {
      setColoniaSel({ nombre, municipio, reportes: grupo.reportes, categorias: Array.from(grupo.categorias) });
      setPanelAbierto(true);
    }
  }, [coloniasAgrupadas]);

  const listaColonias = useMemo(() => {
    const seen = new globalThis.Set<string>();
    const res: { nombre: string; municipio: string; count: number }[] = [];
    for (const f of (poligonosReales as GeoJSON.FeatureCollection).features) {
      const n = f.properties?.nombre;
      const m = f.properties?.municipio;
      if (!n || !m) continue;
      const k = `${n}|${m}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const g = coloniasAgrupadas.get(k);
      res.push({ nombre: n, municipio: m, count: g?.count ?? 0 });
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

      <FilterBar filtros={filtros} onChange={setFiltros} />
      <MapLegend />
      <CoprisjalPanel />

      <div className="absolute bottom-6 right-6 z-10 md:bottom-8 md:right-8 flex flex-col items-end gap-2">
        {throttleMsg && (
          <div className="bg-destructive/90 text-destructive-foreground text-xs px-3 py-1.5 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2">
            {throttleMsg}
          </div>
        )}
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
