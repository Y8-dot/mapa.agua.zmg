# Mapa Ciudadano de Calidad del Agua — ZMG

<p align="center"><em>¿Qué tan limpia es el agua de tu colonia?</em></p>

Plataforma ciudadana que centraliza y visibiliza reportes de calidad del agua potable por colonia en la **Zona Metropolitana de Guadalajara** (Guadalajara, Zapopan, Tlaquepaque, Tonalá, El Salto, Tlajomulco).

Surge a raíz de la **crisis del agua en la ZMG (2026)**: cientos de colonias con reportes de metales pesados, contaminación fecal, color anormal, mal olor y desabasto. El SIAPA reconoce ~200 colonias afectadas pero no publica un mapa. Este proyecto llena ese vacío.

**[Ver demo →](https://mapa-agua-zmg.vercel.app)** · **[Reportar problema](https://mapa-agua-zmg.vercel.app)**

---

## Que hace

- **Mapa interactivo** con poligonos reales de 2,053 colonias (shapefile INE 2024 del IIEG)
- **45+ reportes verificados** de fuentes oficiales, academicas, periodisticas y ciudadanas
- **Filtros** por tipo de problema (metales, bacterias, color, olor, desabasto...) y por fuente
- **Reportes ciudadanos** con autocompletado del catalogo oficial de colonias
- **Datos COPRISJAL** (211 pruebas oficiales) y **SIAPA** (927 puntos de monitoreo)

---

## Stack

| Capa | Tecnologia |
|---|---|
| Frontend | Next.js 14 · TypeScript · Tailwind · shadcn/ui |
| Mapa | MapLibre GL JS · react-map-gl |
| Datos | Supabase (PostgreSQL + RLS) · GeoJSON estatico |
| Pipeline | Python (fiona, shapely, PyMuPDF, Playwright) |
| Deploy | Vercel / Cloudflare Pages |

---

## Estructura

```
mapa-agua-zmg/
├── web/                     ← Next.js App Router
│   ├── app/                 ← paginas (/, /acerca, /metodologia)
│   ├── components/          ← Map, FilterBar, SearchBar, ReportForm...
│   ├── lib/                 ← supabase client, tipos, utils
│   └── data/                ← GeoJSON de poligonos y puntos
├── data/                    ← shapefiles crudos, reportes semilla
├── scripts/                 ← pipeline Python (scraping, shapefiles, PDFs)
├── docs/                    ← documentacion
└── infra/                   ← configuracion de deploy
```

---

## Deploy local

```bash
cd web
npm install
npm run dev        # http://localhost:3000
```

Build de produccion:
```bash
npm run build
```

---

## Fuentes de datos

| Fuente | Tipo | Detalle |
|---|---|---|
| **IIEG** | Geometrias | Shapefile Colonias INE 2024 (2,053 poligonos ZMG) |
| **ITESO / IMDEC** | Muestreos | 42 muestras en 27 colonias · metales, E. coli, cloro |
| **COPRISJAL** | Pruebas oficiales | 211 analisis fisico-quimicos (obtenidos por Jonathan Lomeli) |
| **SIAPA** | Monitoreo | 927 puntos · PDFs de transparencia 2023-2026 |
| **CEDHJ** | Quejas | Recomendacion 10/2026 · 650 colonias |
| **Prensa** | Reportes | Milenio, El Informador, Proceso, LABCSA, UDGTV |

---

## Licencia

MIT — ver [LICENSE](LICENSE). Proyecto sin fines de lucro. Los datos son de fuentes publicas. Si usas este codigo o los datos, atribuye.

---

## Aviso

Este mapa **no reemplaza analisis de laboratorio** ni constituye un diagnostico de salud. Centraliza reportes de fuentes verificables. Para recomendaciones de salud: Secretaria de Salud Jalisco / COPRISJAL.
