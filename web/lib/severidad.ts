import type { FuenteTipo, Reporte } from "./tipos";

/**
 * Escala de severidad por colonia.
 *
 * Antes: color por conteo absoluto (1 / 2 / 3+). Con miles de reportes, casi
 * todas las colonias quedaban en "3+" y el mapa se veía completamente rojo.
 *
 * Ahora:
 *  1. Cada reporte aporta un PESO = peso de la fuente × decaimiento por antigüedad
 *     (vida media de 6 meses: un reporte de hace 6 meses vale la mitad).
 *  2. El PUNTAJE de la colonia es la suma de pesos de sus reportes.
 *  3. Las colonias con puntaje > 0 se reparten en 5 CLASES con cortes naturales
 *     sobre log(puntaje), calculados sobre los datos visibles (respeta los
 *     filtros). Así la escala se ajusta sola cuando los datos crecen.
 */

export const NUM_CLASES = 5;
export const VIDA_MEDIA_DIAS = 180;

export const PESO_FUENTE: Record<FuenteTipo, number> = {
  oficial: 1,
  academico_ong: 1,
  prensa: 0.8,
  ciudadano_verificado: 0.7,
  ciudadano_sin_verificar: 0.5,
};

/**
 * Rampa secuencial amarillo → naranja → rojo (la convención de "semáforo de
 * severidad" que ya usaba el mapa). La opacidad también sube con la clase,
 * para que el rojo oscuro destaque sobre el mapa base oscuro.
 */
export const RAMPA_SEVERIDAD = ["#fde047", "#fbbf24", "#f97316", "#ef4444", "#b91c1c"] as const;
export const OPACIDAD_SEVERIDAD = [0.42, 0.46, 0.5, 0.56, 0.64] as const;

export const ETIQUETAS_CLASE = ["Muy bajo", "Bajo", "Medio", "Alto", "Muy alto"] as const;

const MS_DIA = 86_400_000;

/** Interpreta "YYYY-MM-DD", "YYYY-MM" o "YYYY". Si falla, usa created_at. */
export function fechaDeReporte(r: Pick<Reporte, "fecha_reporte" | "created_at">): number | null {
  const s = (r.fecha_reporte ?? "").trim();
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  if ((m = s.match(/^(\d{4})-(\d{2})$/))) return Date.UTC(+m[1], +m[2] - 1, 15);
  if ((m = s.match(/^(\d{4})$/))) return Date.UTC(+m[1], 6, 1);
  if (r.created_at) {
    const t = Date.parse(r.created_at);
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

export function pesoReporte(r: Reporte, ahora: number = Date.now()): number {
  const fuente = PESO_FUENTE[r.fuente_tipo] ?? 0.5;
  const t = fechaDeReporte(r);
  if (t === null) return fuente * 0.5; // sin fecha: cuenta como de hace ~6 meses
  const dias = Math.max(0, (ahora - t) / MS_DIA);
  return fuente * Math.pow(0.5, dias / VIDA_MEDIA_DIAS);
}

export function puntajeColonia(reportes: Reporte[], ahora: number = Date.now()): number {
  let s = 0;
  for (const r of reportes) s += pesoReporte(r, ahora);
  return s;
}

/**
 * Cortes naturales (Jenks / ckmeans 1-D) sobre log(puntaje).
 *
 * Por qué no cuantiles: con empates masivos (p. ej. miles de colonias con el
 * mismo puntaje) los cuantiles colapsan a 1–2 colores, y separan diferencias
 * sin sentido (0.49 vs 0.50). Los cortes naturales agrupan valores parecidos y
 * cortan donde hay saltos; en escala logarítmica, 1→2 reportes pesa igual que
 * 10→20, así que la escala sigue funcionando aunque los datos crezcan 10× o 100×.
 *
 * Los log-puntajes se agrupan en pasos de PASO_LOG, así el cálculo es
 * O(K·m²) con m = valores distintos (≈ unos cientos) y tarda ~2 ms.
 * Devuelve hasta NUM_CLASES-1 umbrales ascendentes (en escala lineal).
 */
const PASO_LOG = 0.1;
const PISO_PUNTAJE = 0.1; // reportes muy viejos no forman una clase propia

export function calcularCortes(puntajes: number[], clases: number = NUM_CLASES): number[] {
  const bins = new globalThis.Map<number, number>();
  for (const p of puntajes) {
    if (!(p > 0)) continue;
    const b = Math.round(Math.log(Math.max(p, PISO_PUNTAJE)) / PASO_LOG) * PASO_LOG;
    bins.set(b, (bins.get(b) ?? 0) + 1);
  }
  const xs = Array.from(bins.keys()).sort((a, b) => a - b);
  const ws = xs.map((x) => bins.get(x)!);
  const n = xs.length;
  const K = Math.min(clases, n);
  if (K <= 1) return [];

  // Sumas acumuladas ponderadas para el costo (suma de cuadrados intra-clase)
  const SW = [0], S = [0], SS = [0];
  for (let i = 0; i < n; i++) {
    SW.push(SW[i] + ws[i]);
    S.push(S[i] + ws[i] * xs[i]);
    SS.push(SS[i] + ws[i] * xs[i] * xs[i]);
  }
  const costo = (i: number, j: number) => {
    const w = SW[j + 1] - SW[i];
    const s = S[j + 1] - S[i];
    return SS[j + 1] - SS[i] - (s * s) / w;
  };

  const D = Array.from({ length: K }, () => new Array<number>(n).fill(Infinity));
  const B = Array.from({ length: K }, () => new Array<number>(n).fill(0));
  for (let j = 0; j < n; j++) D[0][j] = costo(0, j);
  for (let k = 1; k < K; k++) {
    for (let j = k; j < n; j++) {
      for (let i = k; i <= j; i++) {
        const c = D[k - 1][i - 1] + costo(i, j);
        if (c < D[k][j]) {
          D[k][j] = c;
          B[k][j] = i;
        }
      }
    }
  }

  const inicios: number[] = [];
  let j = n - 1;
  for (let k = K - 1; k > 0; k--) {
    const i = B[k][j];
    inicios.unshift(i);
    j = i - 1;
  }
  // Umbral = punto medio (en log) entre el último valor de una clase y el primero de la siguiente
  return inicios.map((i) => Math.exp((xs[i - 1] + xs[i]) / 2));
}

export function claseDePuntaje(p: number, cortes: number[]): number {
  if (!(p > 0)) return -1;
  let c = 0;
  for (const t of cortes) if (p > t) c++;
  // Con menos cortes que clases (pocos datos), alinear al extremo alto de la rampa
  return Math.min(NUM_CLASES - 1, c + (NUM_CLASES - 1 - cortes.length));
}

export interface RangoClase {
  clase: number;
  min: number;
  max: number;
  colonias: number;
}

/** Rangos reales (mín–máx de puntaje y nº de colonias) de cada clase, para la leyenda. */
export function rangosPorClase(puntajes: number[], cortes: number[]): RangoClase[] {
  const rangos: RangoClase[] = Array.from({ length: NUM_CLASES }, (_, clase) => ({
    clase,
    min: Infinity,
    max: -Infinity,
    colonias: 0,
  }));
  for (const p of puntajes) {
    const c = claseDePuntaje(p, cortes);
    if (c < 0) continue;
    const r = rangos[c];
    r.colonias++;
    if (p < r.min) r.min = p;
    if (p > r.max) r.max = p;
  }
  return rangos;
}
