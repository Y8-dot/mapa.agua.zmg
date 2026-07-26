# CLAUDE.md

Este archivo orienta a futuras instancias de Claude Code que trabajen en este repositorio.

## Qué es este proyecto

**Mapa Ciudadano de Calidad del Agua — ZMG** — sitio web público que muestra, sobre un mapa de la Zona Metropolitana de Guadalajara, reportes de calidad del agua potable por colonia. Centraliza datos de fuentes oficiales, académicas/ONG, periodísticas y ciudadanas.

El sitio responde a la crisis del agua en la ZMG (2026) donde cientos de colonias reportan agua con metales pesados, contaminación fecal, color anormal y desabasto. Sirve como herramienta de transparencia ciudadana, **no como diagnóstico de salud**.

## Stack y restricciones no negociables

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind v3 + shadcn/ui en `web/`. Idioma `es-MX`.
- **Mapa**: MapLibre GL JS vía `react-map-gl/maplibre`. **Prohibido** Mapbox GL v2+ y Google Maps.
- **Datos**: GeoJSON estático + JSON. Sin DB en MVP. Sin PMTiles (a diferencia de Playas Libres).
- **Sin localStorage/sessionStorage** en componentes (cookies sí permitidas).
- **Sin claves API en el repo**.
- **Disclaimer legal** visible en modal al primer load (cookie 1 año).

## Comandos

```bash
cd web
npm install
npm run dev      # http://localhost:3000
npm run build    # producción
npm run lint
```

## Modelo de datos

```
Reporte {
  id: string
  colonia: string
  municipio: "Guadalajara" | "Zapopan" | "Tlaquepaque" | "Tonalá" | "El Salto" | "Tlajomulco"
  categorias: CategoriaAgua[]  // fecal_bacteriologico, metales_pesados, sarro, color_anormal,
                                // olor, sedimentos, desabasto, otro
  fuente_tipo: "oficial" | "academico_ong" | "prensa" | "ciudadano_verificado" | "ciudadano_sin_verificar"
  fuente_nombre: string
  fuente_url?: string
  descripcion: string
  fecha_reporte: string
  fecha_carga: string
  foto_url?: string
  estado_moderacion?: "pendiente" | "aprobado" | "rechazado"
}
```

## Dataset semilla

`data/reportes_semilla.json` contiene ~27 reportes iniciales de colonias documentadas en prensa, IMDEC, ITESO y CEDHJ. Las coordenadas en `data/colonias_semilla.geojson` son centroides aproximados — **no son geometrías oficiales**. Pendiente: integrar shapefiles del IIEG/datos.jalisco.gob.mx.

## Coordenadas ZMG

- Centro: `[-103.35, 20.67]`, zoom ~11
- Municipios: Guadalajara, Zapopan, Tlaquepaque, Tonalá (+ El Salto, Tlajomulco)

## Componentes clave

| Componente | Responsabilidad |
|---|---|
| `Map.tsx` | Mapa MapLibre, capa de círculos GeoJSON, interacción click→panel |
| `FilterBar.tsx` | Panel colapsable con filtros por categoría y fuente |
| `ColoniaDetail.tsx` | Panel lateral con historial de reportes de una colonia |
| `ReportForm.tsx` | Modal para enviar reporte ciudadano anónimo |
| `LegalDisclaimer.tsx` | Modal de bienvenida con 4 slides, cookie 1 año |
| `MapLegend.tsx` | Leyenda de colores por severidad |
| `Attribution.tsx` | Footer con links y disclaimer corto |

## Próximos pasos

1. **Integrar geometrías oficiales** — descargar shapefiles de IIEG/datos.jalisco.gob.mx, convertir a GeoJSON, cruzar con dataset semilla
2. **Backend de moderación** — migrar de JSON estático a Supabase/Postgres con cola de moderación
3. **Mapa de calor** — ponderar por densidad poblacional para evitar sesgo por tamaño de colonia
4. **Decaimiento por antigüedad** — reportes >6 meses pesan menos en el color
5. **Scraper de noticias** — proceso semanal para detectar nuevas colonias en prensa
