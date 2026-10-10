# CLAUDE.md

Este archivo orienta a futuras instancias de Claude Code que trabajen en este repositorio.

## Qué es este proyecto

**Mapa Ciudadano de Calidad del Agua — ZMG** — sitio web público que muestra, sobre un mapa de la Zona Metropolitana de Guadalajara, reportes de calidad del agua potable por colonia. Centraliza datos de fuentes oficiales, académicas/ONG, periodísticas y ciudadanas.

El sitio responde a la crisis del agua en la ZMG (2026) donde cientos de colonias reportan agua con metales pesados, contaminación fecal, color anormal y desabasto. Sirve como herramienta de transparencia ciudadana, **no como diagnóstico de salud**.

## Stack y restricciones no negociables

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind v3 + shadcn/ui en `web/`. Idioma `es-MX`.
- **Mapa**: MapLibre GL JS (`maplibre-gl` directo en `Map.tsx`). **Prohibido** Mapbox GL v2+ y Google Maps.
- **Datos**: polígonos de colonias en GeoJSON estático (`web/data/`) + reportes en Supabase (tabla `reportes`). Sin PMTiles.
- **Escritura solo por el servidor**: los reportes ciudadanos entran únicamente por `POST /api/reportes` (clave secreta de Supabase, límite por IP). El navegador solo lee reportes `aprobado` (RLS).
- **Sin localStorage/sessionStorage** en componentes (cookies sí permitidas).
- **Sin claves API en el repo** (tampoco la publishable como valor por defecto en scripts).
- **Atribución del mapa base** (© OpenStreetMap · © CARTO) visible en el footer.
- **Disclaimer legal** visible en modal al primer load (cookie 1 año).

## Comandos

```bash
cd web
npm install
npm run dev      # http://localhost:3000
npm run build    # producción
npm run lint
```

## Variables de entorno (`web/.env.local` y Vercel)

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave publishable (solo lectura por RLS) |
| `SUPABASE_SECRET_KEY` | clave secreta, **solo servidor** (`/api/reportes`) |
| `IP_HASH_SALT` | opcional; sal para el hash de IP (por defecto la clave secreta) |

SQL de Supabase: `scripts/supabase_migration.sql` (tabla) y `scripts/supabase_migration_002_limite_ip.sql` (RLS + `reportes_envios`).

## Reportes ciudadanos y límite por IP

No hay moderadores: los reportes de colonias del catálogo se publican al momento como `ciudadano_sin_verificar`; los de colonias fuera del catálogo se guardan como `pendiente` (no se muestran). `/api/reportes` limita a 1 reporte por colonia por red cada 30 días y 3 por red al día (IPv6 agrupada por /64). La IP no se guarda: solo `sha256(sal + ip)` en `reportes_envios`.

## Escala de color (`lib/severidad.ts`)

Puntaje por colonia = Σ peso_fuente × 0.5^(días/180). Las colonias con puntaje > 0 se dividen en 5 clases con cortes naturales (ckmeans) sobre log(puntaje), calculados en vivo sobre los datos filtrados, con una rampa amarillo → naranja → rojo (la opacidad también sube con la clase). No usar conteos absolutos: con miles de reportes todo se satura.

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

`data/reportes_semilla.json` contiene 46 reportes iniciales de prensa, IMDEC, ITESO y CEDHJ (ya migrados a Supabase con `scripts/migrar_a_supabase.py`). Los polígonos (`web/data/colonias_zmg_poligonos.json`, 2,053 colonias) vienen del shapefile de colonias INE 2024 del IIEG, simplificados.

## Coordenadas ZMG

- Centro: `[-103.35, 20.67]`, zoom ~11
- Municipios: Guadalajara, Zapopan, Tlaquepaque, Tonalá (+ El Salto, Tlajomulco)

## Componentes clave

| Componente | Responsabilidad |
|---|---|
| `Map.tsx` | Mapa MapLibre, polígonos coloreados por clase de severidad, click→panel |
| `app/api/reportes/route.ts` | Alta de reportes ciudadanos con límite por IP |
| `FilterBar.tsx` | Panel colapsable con filtros por categoría y fuente |
| `ColoniaDetail.tsx` | Panel lateral con historial de reportes de una colonia |
| `ReportForm.tsx` | Modal para enviar reporte ciudadano anónimo |
| `LegalDisclaimer.tsx` | Modal de bienvenida con 4 slides, cookie 1 año |
| `MapLegend.tsx` | Leyenda dinámica de la escala de severidad |
| `TopColonias.tsx` | Top 5 de colonias con más reportes (respeta filtros); en celular es excluyente con Filtros |
| `Attribution.tsx` | Footer con links y disclaimer corto |

## Próximos pasos

1. **Moderación ligera** — si aparece alguien que pueda revisar, usar `estado_moderacion` (los datos ya lo soportan)
2. **Normalizar por población** — falta población en ~250 colonias del shapefile
3. **Scraper de noticias** — proceso semanal para detectar nuevas colonias en prensa
